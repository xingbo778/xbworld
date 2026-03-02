#!/usr/bin/env python3
"""
Unified XBWorld server — replaces Java/Tomcat/publite2 with a single FastAPI process.

Serves:
- Static web client files (replaces Tomcat JSP)
- Game launcher API (replaces CivclientLauncher servlet)
- Metaserver status API (replaces RecentServerStatistics servlet)
- AI agent management API (from multi_main.py)
- WebSocket proxy management (spawns freeciv-proxy instances)
- Game server process management (replaces publite2)

Usage:
    python server.py                    # Start server on port 8080
    python server.py --port 8000        # Custom port
    python server.py --agents 4         # Auto-start a 4-agent game
"""

import argparse
import asyncio
import json
import logging
import os
import signal
import socket
import subprocess
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from config import (
    LLM_MODEL, LLM_API_KEY, LLM_BASE_URL,
)
from game_client import GameClient
from agent import XBWorldAgent, DEFAULT_SYSTEM_PROMPT

logger = logging.getLogger("xbworld-server")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEBAPP_DIR = PROJECT_ROOT / "xbworld-web" / "src" / "main" / "webapp"

STRATEGY_PROMPT_TEMPLATE = """You are an expert XBWorld player AI agent named "{name}". You control a civilization and make strategic decisions each turn.

Your strategic personality: {strategy}

Your capabilities:
- Query game state (cities, units, research, messages)
- Send server commands (e.g. /set tax 30, /start, /save)
- Change city production, set research targets, adjust tax rates
- Move units, found cities, fortify, explore, disband, sentry
- End turns when done

When no instructions are given, play autonomously following your strategic personality.
Always be concise. Respond in the same language as the user."""


# ---------------------------------------------------------------------------
# Server Process Manager (replaces publite2)
# ---------------------------------------------------------------------------
class ServerManager:
    """Manages freeciv-server and freeciv-proxy processes."""

    def __init__(self):
        self._servers: dict[int, subprocess.Popen] = {}
        self._proxies: dict[int, subprocess.Popen] = {}
        self._log_dir = PROJECT_ROOT / "logs"
        self._log_dir.mkdir(exist_ok=True)

    def _find_free_port(self, start: int = 6000, end: int = 6100) -> int:
        for port in range(start, end):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(("127.0.0.1", port))
                    return port
                except OSError:
                    continue
        raise RuntimeError(f"No free port in {start}-{end}")

    def spawn_game(self, game_type: str = "multiplayer") -> int:
        """Spawn a freeciv-server + freeciv-proxy pair. Returns server port."""
        port = self._find_free_port()
        proxy_port = 1000 + port

        freeciv_bin = os.path.expanduser("~/freeciv/bin/freeciv-web")
        freeciv_data = os.path.expanduser("~/freeciv/share/freeciv/")
        proxy_script = PROJECT_ROOT / "xbworld-proxy" / "freeciv-proxy.py"

        env = {**os.environ, "FREECIV_DATA_PATH": freeciv_data}

        self._proxies[port] = subprocess.Popen(
            [sys.executable, str(proxy_script), str(proxy_port)],
            stdout=open(self._log_dir / f"proxy-{proxy_port}.log", "w"),
            stderr=subprocess.STDOUT,
            env=env,
        )

        serv_script = f"pubscript_{game_type}.serv"
        self._servers[port] = subprocess.Popen(
            [freeciv_bin, "--debug", "1", "--port", str(port),
             "--Announce", "none", "--exit-on-end", "--quitidle", "120",
             "--read", serv_script],
            stdout=open(self._log_dir / f"server-{port}.log", "w"),
            stderr=subprocess.STDOUT,
            env=env,
            cwd=str(PROJECT_ROOT / "publite2"),
        )

        logger.info("Spawned game: server=%d proxy=%d (pids %d, %d)",
                     port, proxy_port,
                     self._servers[port].pid, self._proxies[port].pid)
        return port

    def kill_game(self, port: int):
        for store, label in [(self._servers, "server"), (self._proxies, "proxy")]:
            proc = store.pop(port, None)
            if proc and proc.poll() is None:
                try:
                    os.kill(proc.pid, signal.SIGTERM)
                    proc.wait(timeout=3)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                logger.info("Stopped %s for port %d", label, port)

    def kill_all(self):
        for port in list(self._servers.keys()):
            self.kill_game(port)

    def status(self) -> dict:
        active = []
        for port, proc in list(self._servers.items()):
            if proc.poll() is None:
                active.append(port)
            else:
                self._servers.pop(port, None)
                self._proxies.pop(port, None)
        return {
            "total": len(active),
            "single": 0,
            "multi": len(active),
            "ports": active,
        }


# ---------------------------------------------------------------------------
# Agent Orchestrator
# ---------------------------------------------------------------------------
class AgentOrchestrator:
    def __init__(self, server_mgr: ServerManager):
        self.server_mgr = server_mgr
        self.agents: dict[str, XBWorldAgent] = {}
        self.clients: dict[str, GameClient] = {}
        self.server_port: int = -1
        self._tasks: list[asyncio.Task] = []

    async def create_game(self, agent_configs: list[dict], server_port: int = None,
                          aifill: int = 0):
        if self.agents:
            await self.shutdown()

        first_client = GameClient(username=agent_configs[0]["name"])

        if server_port:
            self.server_port = server_port
            await first_client.join_game(server_port)
        else:
            port = self.server_mgr.spawn_game("multiplayer")
            await asyncio.sleep(2)
            self.server_port = port
            await first_client.join_game(port)

        self.clients[agent_configs[0]["name"]] = first_client
        await asyncio.sleep(2)

        if not first_client.state.connected:
            raise ConnectionError("First agent failed to connect")

        for cfg in agent_configs[1:]:
            client = GameClient(username=cfg["name"])
            await client.join_game(self.server_port)
            self.clients[cfg["name"]] = client
            await asyncio.sleep(1)

        for cfg in agent_configs:
            client = self.clients[cfg["name"]]
            strategy = cfg.get("strategy", "balanced play")
            llm_model = cfg.get("llm_model")
            prompt = STRATEGY_PROMPT_TEMPLATE.format(name=cfg["name"], strategy=strategy)
            agent = XBWorldAgent(client, name=cfg["name"],
                                 system_prompt=prompt, llm_model=llm_model)
            self.agents[cfg["name"]] = agent

        first_client = self.clients[agent_configs[0]["name"]]
        total_players = len(agent_configs) + aifill
        if aifill > 0:
            await first_client.send_chat(f"/set aifill {total_players}")
            await asyncio.sleep(0.5)
        await first_client.send_chat("/set timeout 0")
        await asyncio.sleep(0.5)

        for name, client in self.clients.items():
            await client.send_chat("/start")
            await asyncio.sleep(0.3)

        for i in range(15):
            await asyncio.sleep(1)
            if any(c.state.turn >= 1 for c in self.clients.values()):
                break

        for name, agent in self.agents.items():
            task = asyncio.create_task(agent.run_game_loop())
            self._tasks.append(task)
            logger.info("Agent '%s' game loop started", name)

    async def shutdown(self):
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        for agent in self.agents.values():
            await agent.close()
        for client in self.clients.values():
            await client.close()
        self.clients.clear()
        self.agents.clear()
        if self.server_port > 0:
            self.server_mgr.kill_game(self.server_port)
        self.server_port = -1


# ---------------------------------------------------------------------------
# Global instances
# ---------------------------------------------------------------------------
server_mgr = ServerManager()
orchestrator = AgentOrchestrator(server_mgr)


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await orchestrator.shutdown()
    server_mgr.kill_all()


app = FastAPI(title="XBWorld Server", lifespan=lifespan)


# --- Metaserver API (replaces Java servlet /meta/status) ---

@app.get("/meta/status", response_class=PlainTextResponse)
@app.get("/freeciv-web/meta/status", response_class=PlainTextResponse)
async def meta_status():
    """Metaserver status endpoint — compatible with publite2 polling format.
    Returns semicolon-separated: ok;total;single;multi"""
    s = server_mgr.status()
    return f"ok;{s['total']};{s['single']};{s['multi']}"


# --- Game Launcher API (replaces CivclientLauncher servlet) ---

@app.post("/civclientlauncher")
@app.post("/freeciv-web/civclientlauncher")
async def civclient_launcher(request: Request):
    """Launch a new game server or connect to existing one.
    Compatible with the JS client which reads 'port' and 'result' from response headers."""
    params = dict(request.query_params)
    action = params.get("action", "new")
    existing_port = params.get("civserverport")

    if existing_port:
        return JSONResponse(
            content={"port": int(existing_port), "result": "success"},
            headers={"result": "success", "port": str(existing_port)},
        )

    game_type = "multiplayer" if action == "multi" else "singleplayer"

    try:
        port = server_mgr.spawn_game(game_type)
    except Exception as e:
        return JSONResponse(
            content={"error": str(e)},
            headers={"result": "error"},
            status_code=500,
        )

    await asyncio.sleep(1.5)
    return JSONResponse(
        content={"port": port, "result": "success"},
        headers={"result": "success", "port": str(port)},
    )


# --- Agent Management API ---

@app.post("/game/create")
async def api_create_game(body: dict):
    agent_configs = body.get("agents", [])
    if not agent_configs:
        raise HTTPException(400, "Must provide at least one agent config")

    for i, cfg in enumerate(agent_configs):
        if isinstance(cfg, str):
            agent_configs[i] = {"name": cfg}
        elif "name" not in cfg:
            raise HTTPException(400, f"Agent config at index {i} missing 'name'")

    try:
        await orchestrator.create_game(
            agent_configs,
            server_port=body.get("server_port"),
            aifill=body.get("aifill", 0),
        )
    except Exception as e:
        raise HTTPException(500, str(e))

    return {
        "status": "ok",
        "server_port": orchestrator.server_port,
        "observe_url": f"/webclient/index.html?action=observe&civserverport={orchestrator.server_port}",
        "agents": [c["name"] for c in agent_configs],
    }


@app.get("/game/status")
async def api_game_status():
    if not orchestrator.agents:
        return {"status": "no_game", "agents": []}
    return {
        "status": "running",
        "server_port": orchestrator.server_port,
        "agents": [a.get_status() for a in orchestrator.agents.values()],
    }


@app.delete("/game")
async def api_delete_game():
    await orchestrator.shutdown()
    return {"status": "ok"}


@app.get("/agents/{name}/state")
async def api_agent_state(name: str):
    agent = orchestrator.agents.get(name)
    if not agent:
        raise HTTPException(404, f"Agent '{name}' not found")
    return agent.get_status()


@app.post("/agents/{name}/command")
async def api_agent_command(name: str, body: dict):
    agent = orchestrator.agents.get(name)
    if not agent:
        raise HTTPException(404, f"Agent '{name}' not found")
    command = body.get("command", "")
    if not command:
        raise HTTPException(400, "Must provide 'command' field")
    result = await agent.submit_command(command)
    return {"status": "ok", "message": result}


@app.get("/agents/{name}/log")
async def api_agent_log(name: str, limit: int = 50):
    agent = orchestrator.agents.get(name)
    if not agent:
        raise HTTPException(404, f"Agent '{name}' not found")
    return {"name": name, "log": agent.action_log[-limit:]}


# --- Server management API ---

@app.get("/servers")
async def api_servers():
    return server_mgr.status()


# --- Static file serving (replaces Tomcat + nginx for dev) ---
# Mount static directories from the webapp

if WEBAPP_DIR.exists():
    for subdir in ["css", "javascript", "images", "static", "fonts",
                    "textures", "tileset", "music", "docs"]:
        path = WEBAPP_DIR / subdir
        if path.exists():
            app.mount(f"/{subdir}", StaticFiles(directory=str(path)), name=subdir)

    webclient_dir = WEBAPP_DIR / "webclient"
    if webclient_dir.exists():
        app.mount("/webclient", StaticFiles(directory=str(webclient_dir), html=True), name="webclient")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Redirect root to the game client."""
    index_path = WEBAPP_DIR / "webclient" / "index.html"
    if index_path.exists():
        return index_path.read_text()
    return HTMLResponse("<h1>XBWorld</h1><p><a href='/webclient/index.html'>Launch Game</a></p>")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="XBWorld Unified Server")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080,
                        help="HTTP server port (default 8080)")
    parser.add_argument("--agents", type=int, default=0,
                        help="Auto-start a game with N agents")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    print(f"[XBWorld] Starting server on {args.host}:{args.port}")
    print(f"[XBWorld] Open http://localhost:{args.port} in your browser")
    if args.agents > 0:
        print(f"[XBWorld] Will auto-start {args.agents}-agent game after server is ready")

    config = uvicorn.Config(app, host=args.host, port=args.port, log_level="info")
    server = uvicorn.Server(config)

    async def run():
        task = asyncio.create_task(server.serve())
        if args.agents > 0:
            await asyncio.sleep(3)
            agent_configs = [{"name": f"agent{i+1}"} for i in range(args.agents)]
            try:
                await orchestrator.create_game(agent_configs)
                print(f"[XBWorld] Game started with {args.agents} agents on port {orchestrator.server_port}")
            except Exception as e:
                print(f"[XBWorld] Failed to auto-start game: {e}")
        await task

    asyncio.run(run())


if __name__ == "__main__":
    main()
