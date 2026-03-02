#!/usr/bin/env bash

# Start script for XBWorld on macOS

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASEDIR"

export PATH="/usr/local/opt/openjdk@17/bin:/usr/local/opt/tomcat@10/bin:$PATH"
export JAVA_HOME="/usr/local/opt/openjdk@17"
export XBWORLD_DIR="$BASEDIR"
export FREECIV_DATA_PATH="$HOME/freeciv/share/freeciv/"
export LC_ALL=en_US.UTF-8

echo "Starting XBWorld services..."
mkdir -p "$BASEDIR/logs"

# 1. MariaDB
echo "[1/4] Starting MariaDB..."
brew services start mariadb 2>/dev/null || true

# 2. Tomcat
echo "[2/4] Starting Tomcat..."
catalina start 2>/dev/null || true
sleep 3

# 3. nginx
echo "[3/4] Starting nginx..."
sudo nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true

# 4. publite2 (manages game servers and proxy instances)
echo "[4/4] Starting publite2..."
source "$BASEDIR/.venv/bin/activate" 2>/dev/null
cd "$BASEDIR/publite2"
nohup python3 -u publite2.py > "$BASEDIR/logs/publite2.log" 2>&1 &
echo "  publite2 PID: $!"

sleep 3
echo ""
echo "========================================="
echo "XBWorld is starting up!"
echo "========================================="
echo ""
echo "Open http://localhost:8000 in your browser"
echo "Or http://localhost:8080/xbworld-web/ (direct Tomcat)"
echo ""
echo "Logs: $BASEDIR/logs/"
echo ""
echo "To stop: $BASEDIR/stop-macos.sh"
