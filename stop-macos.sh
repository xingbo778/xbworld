#!/usr/bin/env bash

# Stop script for XBWorld on macOS

echo "Stopping XBWorld services..."

pkill -f "server.py --port" 2>/dev/null && echo "XBWorld server stopped" || echo "XBWorld server not running"
pkill -f "standalone_proxy.py" 2>/dev/null && echo "standalone proxy stopped" || echo "standalone proxy not running"
pkill -f "freeciv-web --debug" 2>/dev/null && echo "game servers stopped" || echo "game servers not running"

sudo nginx -s stop 2>/dev/null && echo "nginx stopped" || echo "nginx not running"

echo "Done."
