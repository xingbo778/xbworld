#!/usr/bin/env python3
"""
Mock WebSocket server for offline XBWorld frontend testing.

Two modes:
  1. RECORD — proxy between browser and real backend, saving all messages
  2. REPLAY — replay recorded messages to the browser without a backend

Usage:
  # Record a session against the Railway backend
  python scripts/mock-server.py record --backend https://xbworld-production.up.railway.app

  # Replay the last recorded session
  python scripts/mock-server.py replay

  # Replay a specific recording
  python scripts/mock-server.py replay --recording data/recordings/session_20260304.jsonl

The mock server also serves the /civclientlauncher endpoint so the JS
client can complete its startup flow without a real backend.

Designed for use with vite.config.dev.ts:
  BACKEND_URL=http://localhost:8002 npx vite --config vite.config.dev.ts
"""
import argparse
import asyncio
import json
import logging
import os
import ssl
import sys
import time
from datetime import datetime
from pathlib import Path

import aiohttp
from aiohttp import web
import websockets.client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("mock-server")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = PROJECT_ROOT / "data" / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Recording storage
# ---------------------------------------------------------------------------

class Recording:
    """Stores a sequence of timestamped WebSocket messages."""

    def __init__(self, path: Path):
        self.path = path
        self.messages: list[dict] = []
        self._start_time: float = 0

    def start(self):
        self._start_time = time.monotonic()
        self.messages = []

    def add(self, direction: str, data: str):
        """direction: 'S2C' (server to client) or 'C2S' (client to server)"""
        elapsed = time.monotonic() - self._start_time if self._start_time else 0
        self.messages.append({
            "t": round(elapsed, 4),
            "dir": direction,
            "data": data,
        })

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.path, "w") as f:
            for msg in self.messages:
                f.write(json.dumps(msg, ensure_ascii=False) + "\n")
        logger.info("Saved %d messages to %s", len(self.messages), self.path)

    @classmethod
    def load(cls, path: Path) -> "Recording":
        rec = cls(path)
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    rec.messages.append(json.loads(line))
        logger.info("Loaded %d messages from %s", len(rec.messages), path)
        return rec


# ---------------------------------------------------------------------------
# RECORD mode: proxy + capture
# ---------------------------------------------------------------------------

class RecordProxy:
    """WebSocket proxy that records all messages."""

    def __init__(self, backend_url: str):
        self.backend_url = backend_url.rstrip("/")
        self.backend_ws_url = self.backend_url.replace("https://", "wss://").replace("http://", "ws://")
        self.recording: Recording | None = None
        self._mock_port = 6001  # fake civserver port for launcher response

    async def handle_launcher(self, request: web.Request):
        """Proxy /civclientlauncher to real backend and capture response."""
        url = f"{self.backend_url}/civclientlauncher?{request.query_string}"
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(url) as resp:
                body = await resp.text()
                headers = dict(resp.headers)
                # Record the launcher response
                if self.recording:
                    self.recording.add("LAUNCHER", json.dumps({
                        "status": resp.status,
                        "body": body,
                        "headers": {k: v for k, v in headers.items()
                                    if k.lower() in ("port", "result", "access-control-expose-headers")},
                    }))
                return web.Response(
                    text=body,
                    status=resp.status,
                    headers={k: v for k, v in headers.items()
                             if k.lower() in ("port", "result", "access-control-expose-headers",
                                               "content-type")},
                )

    async def handle_websocket(self, request: web.Request):
        """Proxy WebSocket and record all messages."""
        port = request.match_info.get("port", "6001")
        ws_client = web.WebSocketResponse()
        await ws_client.prepare(request)

        # Start recording
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.recording = Recording(RECORDINGS_DIR / f"session_{ts}.jsonl")
        self.recording.start()
        logger.info("Recording started: %s", self.recording.path.name)

        # Connect to real backend
        backend_ws_url = f"{self.backend_ws_url}/civsocket/{port}"
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        try:
            async with websockets.client.connect(
                backend_ws_url,
                ssl=ssl_ctx,
                max_size=10 * 1024 * 1024,
                additional_headers={"Origin": self.backend_url},
            ) as backend_ws:

                async def forward_client_to_server():
                    async for msg in ws_client:
                        if msg.type == web.WSMsgType.TEXT:
                            self.recording.add("C2S", msg.data)
                            await backend_ws.send(msg.data)
                        elif msg.type == web.WSMsgType.ERROR:
                            break

                async def forward_server_to_client():
                    async for msg in backend_ws:
                        self.recording.add("S2C", str(msg))
                        await ws_client.send_str(str(msg))

                await asyncio.gather(
                    forward_client_to_server(),
                    forward_server_to_client(),
                    return_exceptions=True,
                )
        except Exception as e:
            logger.error("WebSocket proxy error: %s", e)
        finally:
            self.recording.save()
            if not ws_client.closed:
                await ws_client.close()

        return ws_client

    async def handle_validate_user(self, request: web.Request):
        """Proxy validate_user to real backend."""
        url = f"{self.backend_url}/validate_user?{request.query_string}"
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url) as resp:
                body = await resp.text()
                return web.Response(text=body, status=resp.status)


# ---------------------------------------------------------------------------
# REPLAY mode: serve recorded messages
# ---------------------------------------------------------------------------

class ReplayServer:
    """Replays a recorded session to the browser."""

    def __init__(self, recording: Recording, speed: float = 1.0):
        self.recording = recording
        self.speed = speed
        self._launcher_response: dict | None = None
        self._s2c_messages: list[dict] = []
        self._parse_recording()

    def _parse_recording(self):
        for msg in self.recording.messages:
            if msg["dir"] == "LAUNCHER":
                self._launcher_response = json.loads(msg["data"])
            elif msg["dir"] == "S2C":
                self._s2c_messages.append(msg)
        logger.info("Replay: %d S2C messages, launcher=%s",
                     len(self._s2c_messages), "yes" if self._launcher_response else "no")

    async def handle_launcher(self, request: web.Request):
        """Return recorded launcher response."""
        if self._launcher_response:
            return web.Response(
                text=self._launcher_response["body"],
                status=self._launcher_response["status"],
                headers=self._launcher_response.get("headers", {}),
            )
        # Default mock response
        return web.json_response(
            {"port": 6001, "result": "success"},
            headers={"result": "success", "port": "6001",
                     "Access-Control-Expose-Headers": "port, result"},
        )

    async def handle_validate_user(self, request: web.Request):
        """Always return success for mock."""
        return web.Response(text="1", status=200)

    async def handle_websocket(self, request: web.Request):
        """Replay recorded S2C messages to the browser."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        logger.info("Replay WebSocket connected, sending %d messages", len(self._s2c_messages))

        # Wait for the login packet from client
        try:
            login_msg = await asyncio.wait_for(ws.receive(), timeout=10)
            logger.info("Received login packet: %s", login_msg.data[:100] if login_msg.data else "empty")
        except asyncio.TimeoutError:
            logger.warning("No login packet received within 10s")

        # Replay S2C messages with timing
        prev_t = 0
        for msg in self._s2c_messages:
            if ws.closed:
                break
            delay = (msg["t"] - prev_t) / self.speed
            if delay > 0.001:
                # Cap delay to avoid long waits (e.g., user thinking time)
                delay = min(delay, 2.0)
                await asyncio.sleep(delay)
            prev_t = msg["t"]
            try:
                await ws.send_str(msg["data"])
            except Exception as e:
                logger.error("Error sending replay message: %s", e)
                break

        # Drain any remaining client messages
        async def drain():
            try:
                async for _ in ws:
                    pass
            except Exception:
                pass

        await drain()
        logger.info("Replay complete")
        return ws

    async def handle_motd(self, request: web.Request):
        """Return empty MOTD."""
        return web.Response(text="var defined_motd = '';", content_type="application/javascript")


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

def create_app(mode: str, backend_url: str = "", recording_path: str = "", speed: float = 1.0):
    app = web.Application()

    if mode == "record":
        proxy = RecordProxy(backend_url)
        app.router.add_post("/civclientlauncher", proxy.handle_launcher)
        app.router.add_get("/validate_user", proxy.handle_validate_user)
        app.router.add_get("/civsocket/{port}", proxy.handle_websocket)
        logger.info("RECORD mode: proxying to %s", backend_url)

    elif mode == "replay":
        # Find recording file
        if recording_path:
            rec_path = Path(recording_path)
        else:
            # Use the latest recording
            recordings = sorted(RECORDINGS_DIR.glob("session_*.jsonl"))
            if not recordings:
                logger.error("No recordings found in %s", RECORDINGS_DIR)
                sys.exit(1)
            rec_path = recordings[-1]

        recording = Recording.load(rec_path)
        server = ReplayServer(recording, speed=speed)
        app.router.add_post("/civclientlauncher", server.handle_launcher)
        app.router.add_get("/validate_user", server.handle_validate_user)
        app.router.add_get("/civsocket/{port}", server.handle_websocket)
        app.router.add_get("/motd.js", server.handle_motd)
        logger.info("REPLAY mode: serving %s (speed=%.1fx)", rec_path.name, speed)

    return app


def main():
    parser = argparse.ArgumentParser(description="XBWorld Mock WebSocket Server")
    sub = parser.add_subparsers(dest="mode", required=True)

    rec = sub.add_parser("record", help="Record a session from real backend")
    rec.add_argument("--backend", default="https://xbworld-production.up.railway.app",
                     help="Backend URL to proxy")
    rec.add_argument("--port", type=int, default=8002, help="Local port to listen on")

    rep = sub.add_parser("replay", help="Replay a recorded session")
    rep.add_argument("--recording", default="", help="Path to recording file (default: latest)")
    rep.add_argument("--speed", type=float, default=1.0, help="Replay speed multiplier")
    rep.add_argument("--port", type=int, default=8002, help="Local port to listen on")

    args = parser.parse_args()

    if args.mode == "record":
        app = create_app("record", backend_url=args.backend)
    else:
        app = create_app("replay", recording_path=args.recording, speed=args.speed)

    logger.info("Starting mock server on port %d", args.port)
    logger.info("Use with: BACKEND_URL=http://localhost:%d ./scripts/dev.sh", args.port)
    web.run_app(app, host="0.0.0.0", port=args.port, print=None)


if __name__ == "__main__":
    main()
