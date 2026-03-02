#!/usr/bin/env python3
"""Standalone WebSocket-to-TCP proxy for freeciv-server.

Usage: python standalone_proxy.py <listen_port> [server_port]

If server_port is not given, it defaults to listen_port - 1000.
E.g. python standalone_proxy.py 7004  =>  proxies to 127.0.0.1:6004
"""

import asyncio
import json
import re
import struct
import sys
import logging

import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [proxy] %(levelname)s: %(message)s")
logger = logging.getLogger("proxy")


async def bridge(ws):
    first_msg = await ws.recv()
    try:
        login = json.loads(first_msg)
    except json.JSONDecodeError:
        await ws.close(1008, "Invalid login")
        return

    server_port = int(login.get("port", 0))
    username = login.get("username", "?")
    if server_port < 5000:
        await ws.send(json.dumps([{"pid": 5, "message": "Bad port", "you_can_join": False, "conn_id": -1}]))
        return

    logger.info("Connecting %s to civserver 127.0.0.1:%d", username, server_port)
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection("127.0.0.1", server_port), timeout=5.0
        )
    except Exception as e:
        logger.error("TCP connect failed: %s", e)
        await ws.send(json.dumps([{"pid": 25, "message": f"Proxy connect failed: {e}"}]))
        return

    encoded = first_msg.encode("utf-8")
    writer.write(struct.pack(">H", len(encoded) + 3) + encoded + b"\0")
    await writer.drain()

    async def tcp_to_ws():
        try:
            while True:
                header = await reader.readexactly(2)
                (size,) = struct.unpack(">H", header)
                body = await reader.readexactly(size - 2)
                if body and body[-1] == 0:
                    body = body[:-1]
                text = body.decode("utf-8", errors="ignore")
                await ws.send(f"[{text}]")
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        except Exception as e:
            logger.warning("tcp_to_ws error: %s", e)

    async def ws_to_tcp():
        try:
            async for msg in ws:
                encoded = msg.encode("utf-8")
                writer.write(struct.pack(">H", len(encoded) + 3) + encoded + b"\0")
                await writer.drain()
        except websockets.ConnectionClosed:
            pass
        except Exception as e:
            logger.warning("ws_to_tcp error: %s", e)

    tasks = [asyncio.create_task(tcp_to_ws()), asyncio.create_task(ws_to_tcp())]
    await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for t in tasks:
        t.cancel()
    writer.close()
    logger.info("Bridge closed for %s", username)


async def main(listen_port):
    async with websockets.serve(bridge, "0.0.0.0", listen_port):
        logger.info("WebSocket proxy listening on port %d", listen_port)
        await asyncio.Future()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 7004
    asyncio.run(main(port))
