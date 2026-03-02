#!/usr/bin/env python3
"""
Test: 8 LLM agents playing 50 turns.
Checkpoints every 5 turns with detailed status.
"""

import asyncio
import json
import logging
import os
import sys
import time

from config import NGINX_HOST, NGINX_PORT
from game_client import GameClient
from agent import FreecivAgent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test-8agents")

AGENT_CONFIGS = [
    {"name": "alpha",   "strategy": "aggressive military expansion"},
    {"name": "beta",    "strategy": "defensive turtle with science focus"},
    {"name": "gamma",   "strategy": "economic growth and city building"},
    {"name": "delta",   "strategy": "balanced play with diplomacy"},
    {"name": "epsilon", "strategy": "rapid expansion and exploration"},
    {"name": "zeta",    "strategy": "military tech rush"},
    {"name": "eta",     "strategy": "wonder building and culture"},
    {"name": "theta",   "strategy": "naval power and coastal cities"},
]

STRATEGY_PROMPT = """You are an expert Freeciv player AI agent named "{name}". \
You control a civilization and make strategic decisions each turn.

Your strategic personality: {strategy}

Capabilities: query state, send commands, change production, set research, \
move units, found cities, fortify, explore, disband, sentry, end turns.

Play autonomously following your personality. Be concise. Act fast."""

TARGET_TURNS = 50
CHECKPOINT_INTERVAL = 5


async def run_test():
    clients: list[GameClient] = []
    agents: list[FreecivAgent] = []

    logger.info("=== Starting 8-agent test for %d turns ===", TARGET_TURNS)

    first = GameClient(username=AGENT_CONFIGS[0]["name"])
    await first.start_new_game("multiplayer")
    port = first.server_port
    clients.append(first)
    logger.info("Game server on port %d", port)
    logger.info("Observe: http://%s:%d/webclient/?action=observe&civserverport=%d",
                NGINX_HOST, NGINX_PORT, port)

    await asyncio.sleep(2)

    for cfg in AGENT_CONFIGS[1:]:
        c = GameClient(username=cfg["name"])
        await c.join_game(port)
        clients.append(c)
        await asyncio.sleep(0.8)

    for i, cfg in enumerate(AGENT_CONFIGS):
        prompt = STRATEGY_PROMPT.format(**cfg)
        agent = FreecivAgent(clients[i], name=cfg["name"], system_prompt=prompt)
        agents.append(agent)

    await first.send_chat("/set timeout 0")
    await asyncio.sleep(0.5)

    for c in clients:
        await c.send_chat("/start")
        await asyncio.sleep(0.3)

    for i in range(20):
        await asyncio.sleep(1)
        if any(c.state.turn >= 1 for c in clients):
            logger.info("Game started! Turn 1 detected after %ds", i + 1)
            break
    else:
        logger.error("Game did not start within 20s!")
        for c in clients:
            await c.close()
        return

    tasks = []
    for agent in agents:
        tasks.append(asyncio.create_task(agent.run_game_loop()))

    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    checkpoint_file = os.path.join(log_dir, "checkpoint_report.jsonl")
    with open(checkpoint_file, "w") as f:
        f.write("")

    t0 = time.time()
    last_checkpoint_turn = 0

    while True:
        await asyncio.sleep(3)

        turns = {a.name: a.client.state.turn for a in agents}
        min_turn = min(turns.values())
        max_turn = max(turns.values())

        if min_turn >= TARGET_TURNS:
            logger.info("=== ALL agents reached turn %d. Test complete! ===", TARGET_TURNS)
            break

        elapsed = time.time() - t0
        if elapsed > 3600:
            logger.error("=== TIMEOUT: 1 hour elapsed, stopping at turn %d ===", max_turn)
            break

        if not all(c.state.connected for c in clients):
            disconnected = [a.name for a in agents if not a.client.state.connected]
            logger.error("Agents disconnected: %s at turn %d", disconnected, max_turn)
            break

        checkpoint_turn = (min_turn // CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL
        if checkpoint_turn > last_checkpoint_turn and checkpoint_turn > 0:
            last_checkpoint_turn = checkpoint_turn
            report = generate_checkpoint(agents, checkpoint_turn, elapsed)
            logger.info("\n%s", format_checkpoint(report))
            with open(checkpoint_file, "a") as f:
                f.write(json.dumps(report, ensure_ascii=False, default=str) + "\n")

    final_report = generate_checkpoint(agents, max_turn, time.time() - t0)
    logger.info("\n=== FINAL REPORT ===\n%s", format_checkpoint(final_report))
    with open(checkpoint_file, "a") as f:
        f.write(json.dumps({"final": True, **final_report}, ensure_ascii=False, default=str) + "\n")

    for t in tasks:
        t.cancel()
    for a in agents:
        await a.close()
    for c in clients:
        await c.close()


def generate_checkpoint(agents: list[FreecivAgent], turn: int, elapsed: float) -> dict:
    agent_data = []
    for a in agents:
        s = a.client.state
        p = s.my_player() or {}
        my_cities = s.my_cities()
        my_units = s.my_units()

        tool_calls = [e for e in a.action_log if e.get("action") == "tool_call"]
        errors = [e for e in a.action_log if "error" in e.get("action", "")]
        timeouts = [e for e in a.action_log if e.get("action") == "timeout"]

        unit_types = {}
        for u in my_units.values():
            tn = a.client.state.unit_types.get(u.get("type", -1), {}).get("name", "?")
            unit_types[tn] = unit_types.get(tn, 0) + 1

        agent_data.append({
            "name": a.name,
            "turn": s.turn,
            "phase": s.phase,
            "connected": s.connected,
            "gold": p.get("gold", 0),
            "tax": p.get("tax", 0),
            "science": p.get("science", 0),
            "luxury": p.get("luxury", 0),
            "cities": len(my_cities),
            "city_names": [c.get("name", "?") for c in my_cities.values()],
            "units": len(my_units),
            "unit_types": unit_types,
            "total_tool_calls": len(tool_calls),
            "total_errors": len(errors),
            "total_timeouts": len(timeouts),
            "last_report": a.last_report[:200] if a.last_report else "",
        })

    return {
        "checkpoint_turn": turn,
        "elapsed_s": round(elapsed, 1),
        "agents": agent_data,
    }


def format_checkpoint(report: dict) -> str:
    lines = [f"{'='*60}",
             f"CHECKPOINT @ Turn {report['checkpoint_turn']} ({report['elapsed_s']}s elapsed)",
             f"{'='*60}"]
    for a in report["agents"]:
        lines.append(
            f"  {a['name']:10s} | turn={a['turn']:3d} | gold={a.get('gold',0):5} | "
            f"cities={a['cities']} | units={a['units']} | "
            f"tools={a['total_tool_calls']} err={a['total_errors']} timeout={a['total_timeouts']}"
        )
        if a["city_names"]:
            lines.append(f"{'':14s}cities: {', '.join(a['city_names'][:5])}")
        if a["unit_types"]:
            ut_str = ", ".join(f"{k}:{v}" for k, v in a["unit_types"].items())
            lines.append(f"{'':14s}units: {ut_str}")
    lines.append(f"{'='*60}")
    return "\n".join(lines)


if __name__ == "__main__":
    try:
        asyncio.run(run_test())
    except KeyboardInterrupt:
        print("\nInterrupted.")
