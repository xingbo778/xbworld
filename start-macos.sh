#!/usr/bin/env bash

# Start script for XBWorld on macOS
# No Java/Tomcat/MariaDB required — uses Python FastAPI for everything.

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASEDIR"

export XBWORLD_DIR="$BASEDIR"
export FREECIV_DATA_PATH="$HOME/freeciv/share/freeciv/"
export LC_ALL=en_US.UTF-8

echo "Starting XBWorld services..."
mkdir -p "$BASEDIR/logs"

# Activate virtualenv
source "$BASEDIR/.venv/bin/activate" 2>/dev/null

# 1. nginx (optional — for production; dev can skip this)
echo "[1/2] Starting nginx..."
sudo nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true

# 2. XBWorld unified server (FastAPI — replaces Tomcat + publite2 + MariaDB)
echo "[2/2] Starting XBWorld server..."
cd "$BASEDIR/xbworld-agent"
nohup python3 -u server.py --port 8080 > "$BASEDIR/logs/xbworld-server.log" 2>&1 &
echo "  XBWorld server PID: $!"

sleep 2
echo ""
echo "========================================="
echo "XBWorld is starting up!"
echo "========================================="
echo ""
echo "Open http://localhost:8080 in your browser"
echo ""
echo "API docs: http://localhost:8080/docs"
echo "Logs: $BASEDIR/logs/"
echo ""
echo "To stop: $BASEDIR/stop-macos.sh"
