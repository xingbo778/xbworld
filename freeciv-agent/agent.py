"""
LLM Agent for Freeciv-web.

Runs an autonomous loop: each turn, analyzes state and executes actions via
LLM function-calling.  Accepts natural language commands from the user at any
time.  The LLM provider is pluggable (see ``llm_providers`` module).
"""

import asyncio
import json
import logging
import os
import time

import aiohttp

from config import LLM_MODEL, LLM_API_KEY, LLM_BASE_URL, TURN_TIMEOUT_SECONDS
from game_client import GameClient
from agent_tools import (
    TOOL_REGISTRY,
    execute_tool,
    get_game_overview,
    get_my_cities,
    get_my_units,
    get_research_status,
)
from llm_providers import create_provider

logger = logging.getLogger("freeciv-agent")

DEFAULT_SYSTEM_PROMPT = """\
You are an expert Freeciv player AI agent. You control a civilization and \
make strategic decisions each turn.

Your capabilities:
- Query game state (cities, units, research, messages)
- Send server commands (e.g. /set tax 30, /start, /save)
- Change city production, set research targets, adjust tax rates
- Move units, found cities, fortify, explore, disband, sentry
- End turns when done

Strategy guidelines:
- Early game: found cities ASAP, explore with warriors, research key techs
- Build a mix of military and economic units
- Keep science rate high unless gold is critically low
- Expand aggressively but defend your cities

When no instructions are given, play autonomously and report what you did.
Always be concise. Respond in the same language as the user."""


class FreecivAgent:
    def __init__(self, client: GameClient, name: str = "Agent",
                 system_prompt: str = None, llm_model: str = None):
        self.client = client
        self.name = name
        self.llm_model = llm_model or LLM_MODEL
        prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        self.conversation: list[dict] = [{"role": "system", "content": prompt}]
        self._command_queue: asyncio.Queue[str] = asyncio.Queue()
        self.action_log: list[dict] = []
        self.last_report: str = ""
        self._http_session: aiohttp.ClientSession | None = None
        self._provider = create_provider(self.llm_model, LLM_API_KEY, LLM_BASE_URL)

    async def _get_http_session(self) -> aiohttp.ClientSession:
        if self._http_session is None or self._http_session.closed:
            timeout = aiohttp.ClientTimeout(
                total=TURN_TIMEOUT_SECONDS,
                sock_read=TURN_TIMEOUT_SECONDS,
            )
            self._http_session = aiohttp.ClientSession(timeout=timeout)
        return self._http_session

    async def close(self):
        if self._http_session and not self._http_session.closed:
            await self._http_session.close()

    def _log_action(self, action: str, detail: str = ""):
        entry = {
            "time": time.time(),
            "turn": self.client.state.turn,
            "action": action,
            "detail": detail,
        }
        self.action_log.append(entry)
        if len(self.action_log) > 500:
            self.action_log = self.action_log[-500:]

    def _log_llm_detail(self, event_type: str, data: dict):
        """Append a detailed JSON log entry to the agent's log file."""
        log_dir = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"{self.name.lower()}_llm.jsonl")
        entry = {
            "ts": time.strftime("%H:%M:%S"),
            "turn": self.client.state.turn,
            "phase": self.client.state.phase,
            "event": event_type,
            **data,
        }
        with open(log_file, "a") as f:
            f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")

    async def submit_command(self, command: str) -> str:
        """Submit a natural language command from external callers (API/stdin).
        Returns immediately; the command is processed on the next opportunity."""
        self._command_queue.put_nowait(command)
        self._log_action("command_received", command)
        return f"Command queued for {self.name}: {command}"

    async def run_game_loop(self):
        """Main game loop — waits for turns and processes them.
        Does NOT read stdin; use submit_command() for external input."""
        last_counter = self.client._turn_counter

        if self.client.state.phase == "playing" and self.client.state.turn >= 1:
            try:
                await self._run_turn_with_timeout()
            except Exception as e:
                logger.error("[%s] Error on initial turn: %s", self.name, e)

        while self.client.state.connected:
            if self.client._turn_counter > last_counter:
                last_counter = self.client._turn_counter
                logger.info("[%s] Processing turn %d (counter=%d)",
                            self.name, self.client.state.turn, last_counter)
            else:
                got_turn = await self.client.wait_for_new_turn(timeout=30)
                if not got_turn:
                    if not self.client.state.connected:
                        break
                    user_cmd = self._drain_command()
                    if user_cmd:
                        try:
                            await self._handle_user_command(user_cmd)
                        except Exception as e:
                            logger.error("[%s] Error handling command: %s", self.name, e)
                    continue
                last_counter = self.client._turn_counter
                logger.info("[%s] Processing turn %d (counter=%d)",
                            self.name, self.client.state.turn, last_counter)

            user_cmd = self._drain_command()
            try:
                if user_cmd:
                    await self._handle_user_command(user_cmd)
                else:
                    await self._run_turn_with_timeout()
            except Exception as e:
                logger.error("[%s] Error on turn %d: %s", self.name, self.client.state.turn, e)

    async def _run_turn_with_timeout(self):
        """Run autonomous turn with a hard timeout."""
        turn = self.client.state.turn
        try:
            await asyncio.wait_for(self._autonomous_turn(), timeout=TURN_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            logger.warning("[%s] Turn %d TIMED OUT after %ds, force ending",
                           self.name, turn, TURN_TIMEOUT_SECONDS)
            self._log_action("timeout", f"turn {turn}")
            try:
                await self.client.end_turn()
            except Exception:
                pass

    def _drain_command(self):
        """Get the latest command, discarding older ones if multiple queued."""
        cmd = None
        try:
            while True:
                cmd = self._command_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        return cmd

    async def _handle_user_command(self, command: str):
        """Process a natural language command from the user."""
        self._log_action("user_command", command)
        state_summary = get_game_overview(self.client)
        self.conversation.append({
            "role": "user",
            "content": f"[Game State]\n{state_summary}\n\n[User Command]\n{command}",
        })
        await self._llm_loop()

    async def _autonomous_turn(self):
        """Let the agent play a turn autonomously."""
        turn_before = self.client.state.turn
        self._log_action("autonomous_turn", f"turn {turn_before}")
        overview = get_game_overview(self.client)
        cities = get_my_cities(self.client)
        units = get_my_units(self.client)
        research = get_research_status(self.client)
        self._log_llm_detail("turn_start", {
            "turn": turn_before,
            "overview": overview,
            "cities": cities,
            "units": units,
            "research": research,
        })

        self.conversation.append({
            "role": "user",
            "content": (
                f"Turn {turn_before}. Issue ALL actions in ONE batch, then call end_turn. "
                f"Do NOT call query tools — state is below. Be fast.\n\n"
                f"{overview}\n{cities}\n{units}\n{research}"
            ),
        })
        await self._llm_loop()

        if self.client.state.turn == turn_before and self.client.state.phase == "playing":
            logger.info("[%s] Auto-ending turn %d (LLM didn't end it)", self.name, turn_before)
            self._log_action("auto_end_turn", f"turn {turn_before}")
            await self.client.end_turn()

    async def _llm_call(self) -> dict | None:
        """Call the LLM via the configured provider. Returns raw provider response."""
        session = await self._get_http_session()
        tool_defs = TOOL_REGISTRY.openai_definitions()

        t0 = time.monotonic()
        logger.info("[%s] LLM call start (msgs=%d)", self.name, len(self.conversation))
        self._log_llm_detail("request", {
            "provider": self._provider.name,
            "model": self.llm_model,
            "num_messages": len(self.conversation),
        })

        data = await self._provider.call(session, self.conversation, tool_defs)

        elapsed = time.monotonic() - t0
        logger.info("[%s] LLM call done in %.1fs", self.name, elapsed)
        self._log_llm_detail("response", {
            "elapsed_s": round(elapsed, 1),
            "raw_keys": list(data.keys()) if data else [],
        })
        return data

    async def _llm_loop(self):
        """Call LLM with tools, execute tool calls, repeat until done."""
        max_iterations = 5
        for _ in range(max_iterations):
            try:
                data = await self._llm_call()
            except Exception as e:
                logger.error("[%s] LLM call failed: %s", self.name, e)
                self._log_action("llm_error", str(e))
                break

            parsed = self._provider.parse_response(data)
            if parsed is None:
                logger.warning("[%s] LLM returned unparseable response, rolling back", self.name)
                self._log_action("llm_empty", "unparseable response")
                while self.conversation and self.conversation[-1].get("role") in ("tool", "assistant"):
                    self.conversation.pop()
                break

            text_content = parsed.get("text", "")
            func_calls = parsed.get("tool_calls", [])
            raw_assistant = parsed.get("raw_assistant")

            self.conversation.append(raw_assistant or {
                "role": "assistant", "content": text_content,
            })

            if func_calls:
                tool_results = []
                for fc in func_calls:
                    fn_name = fc["name"]
                    fn_args = fc.get("args", {})
                    result = await execute_tool(self.client, fn_name, fn_args)
                    logger.info("[%s] TOOL %s(%s) -> %s", self.name, fn_name, fn_args, result[:200])
                    self._log_action("tool_call", f"{fn_name}({fn_args}) -> {result[:200]}")
                    self._log_llm_detail("tool_exec", {
                        "function": fn_name, "args": fn_args,
                        "result": result[:500],
                    })
                    tool_results.append({"name": fn_name, "result": result})

                tool_msg = self._provider.format_tool_results(tool_results, func_calls)
                self.conversation.append(tool_msg)
                continue

            if text_content:
                self.last_report = text_content
                self._log_action("report", text_content[:300])
                print(f"\n[{self.name} Turn {self.client.state.turn}] {text_content}")

            break

        self._trim_conversation()

    def _trim_conversation(self):
        """Keep conversation manageable by trimming old messages."""
        if len(self.conversation) > 20:
            self.conversation = [self.conversation[0]] + self.conversation[-12:]

    def get_status(self) -> dict:
        """Return a JSON-serializable status summary for API consumers."""
        s = self.client.state
        p = s.my_player() or {}
        return {
            "name": self.name,
            "username": self.client.username,
            "connected": s.connected,
            "phase": s.phase,
            "turn": s.turn,
            "player_id": s.my_player_id,
            "gold": p.get("gold"),
            "cities": len(s.my_cities()),
            "units": len(s.my_units()),
            "last_report": self.last_report,
        }
