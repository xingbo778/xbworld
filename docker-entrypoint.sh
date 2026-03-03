#!/usr/bin/env bash
cd /app/xbworld-agent
exec python3 server.py --host 0.0.0.0 "$@"
