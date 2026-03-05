#!/usr/bin/env bash
cd /app/xbworld-backend
exec python3 server.py --host 0.0.0.0 "$@"
