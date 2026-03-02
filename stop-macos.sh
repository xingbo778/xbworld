#!/usr/bin/env bash

# Stop script for XBWorld on macOS

export PATH="/usr/local/opt/openjdk@17/bin:/usr/local/opt/tomcat@10/bin:$PATH"

echo "Stopping XBWorld services..."

pkill -f "publite2.py" 2>/dev/null && echo "publite2 stopped" || echo "publite2 not running"
pkill -f "freeciv-proxy.py" 2>/dev/null && echo "xbworld-proxy stopped" || echo "xbworld-proxy not running"
pkill -f "freeciv-web --debug" 2>/dev/null && echo "game servers stopped" || echo "game servers not running"

sudo nginx -s stop 2>/dev/null && echo "nginx stopped" || echo "nginx not running"
catalina stop 2>/dev/null && echo "Tomcat stopped" || echo "Tomcat not running"

echo "Done. MariaDB left running (use 'brew services stop mariadb' to stop)."
