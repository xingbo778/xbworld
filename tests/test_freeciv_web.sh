#!/usr/bin/env bash
# =============================================================================
# Freeciv-web macOS Integration Test Suite
# Tests the full stack: MariaDB, Tomcat, nginx, publite2, freeciv-proxy
# =============================================================================

set -u
PASS=0
FAIL=0
WARN=0
ERRORS=()

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

assert_ok() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc (expected='$expected', actual='$actual')"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc (expected to contain '$needle')"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

assert_http_status() {
  local desc="$1" url="$2" expected="$3" method="${4:-GET}"
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null)
  assert_eq "$desc" "$expected" "$actual"
}

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "============================================"
echo "Freeciv-web Integration Test Suite"
echo "Base dir: $BASEDIR"
echo "============================================"
echo ""

# ─── T1: Service Health Checks ───────────────────────────────────────────
echo "── T1: Service Health Checks ──"

assert_ok "MariaDB is running" mariadb -p'freeciv123' freeciv_web -e "SELECT 1"
assert_ok "Tomcat is listening on 8080" lsof -i :8080 -sTCP:LISTEN
assert_ok "nginx is listening on 8000" lsof -i :8000 -sTCP:LISTEN
assert_ok "publite2 process exists" pgrep -f "publite2.py"
assert_ok "At least one freeciv-web server process" pgrep -f "freeciv-web --debug"
assert_ok "At least one freeciv-proxy process" pgrep -f "freeciv-proxy.py"
echo ""

# ─── T2: Database Checks ─────────────────────────────────────────────────
echo "── T2: Database Checks ──"

DB_TABLES=$(mariadb -p'freeciv123' freeciv_web -N -e "SHOW TABLES;" 2>/dev/null)
assert_contains "DB has 'servers' table" "servers" "$DB_TABLES"
assert_contains "DB has 'players' table" "players" "$DB_TABLES"
assert_contains "DB has 'variables' table" "variables" "$DB_TABLES"

SERVER_COUNT=$(mariadb -p'freeciv123' freeciv_web -N -e "SELECT COUNT(*) FROM servers;" 2>/dev/null)
if [ "$SERVER_COUNT" -gt 0 ] 2>/dev/null; then
  green "  PASS: Servers registered in DB (count=$SERVER_COUNT)"
  ((PASS++))
else
  red "  FAIL: No servers registered in DB"
  ((FAIL++)); ERRORS+=("No servers in DB")
fi

SP_COUNT=$(mariadb -p'freeciv123' freeciv_web -N -e \
  "SELECT COUNT(*) FROM servers WHERE type='singleplayer' AND state='Pregame';" 2>/dev/null)
if [ "$SP_COUNT" -gt 0 ] 2>/dev/null; then
  green "  PASS: Singleplayer servers available (count=$SP_COUNT)"
  ((PASS++))
else
  red "  FAIL: No singleplayer servers in Pregame state (BUG: metaserver registration)"
  ((FAIL++)); ERRORS+=("No singleplayer servers available")
fi
echo ""

# ─── T3: Metaserver API ──────────────────────────────────────────────────
echo "── T3: Metaserver API ──"

META_STATUS=$(curl -s http://localhost:8080/freeciv-web/meta/status 2>/dev/null)
assert_contains "Metaserver status returns meta-status prefix" "meta-status;" "$META_STATUS"

IFS=';' read -ra PARTS <<< "$META_STATUS"
TOTAL="${PARTS[1]:-0}"
SINGLE="${PARTS[2]:-0}"
MULTI="${PARTS[3]:-0}"
PBEM="${PARTS[4]:-0}"

if [ "$TOTAL" -gt 0 ] 2>/dev/null; then
  green "  PASS: Metaserver reports $TOTAL total servers (single=$SINGLE, multi=$MULTI, pbem=$PBEM)"
  ((PASS++))
else
  red "  FAIL: Metaserver reports 0 total servers"
  ((FAIL++)); ERRORS+=("Metaserver 0 servers")
fi

if [ "$SINGLE" -gt 0 ] 2>/dev/null; then
  green "  PASS: Metaserver has singleplayer servers ($SINGLE)"
  ((PASS++))
else
  red "  FAIL: Metaserver has 0 singleplayer servers (BUG: multipart parsing or FileCountLimit)"
  ((FAIL++)); ERRORS+=("Metaserver 0 singleplayer")
fi

# Metaserver POST from localhost should succeed (simulating a game server registration)
REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://localhost:8080/freeciv-web/meta/metaserver" \
  -d "host=testhost&port=9999&type=singleplayer&state=Pregame&version=test&available=1&humans=0&ruleset=classic&capability=test&patches=none&serverid=&message=test" \
  2>/dev/null)
assert_eq "Metaserver POST registration (url-encoded) returns 200" "200" "$REG_STATUS"

# Clean up test entry
mariadb -p'freeciv123' freeciv_web -e "DELETE FROM servers WHERE port=9999;" 2>/dev/null

# Metaserver POST from external should be blocked (403)
EXT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://localhost:8000/meta/metaserver" \
  -d "host=test&port=9999" 2>/dev/null)
assert_eq "Metaserver POST via nginx is blocked (403)" "403" "$EXT_STATUS"
echo ""

# ─── T4: CivclientLauncher ───────────────────────────────────────────────
echo "── T4: CivclientLauncher ──"

assert_http_status "CivclientLauncher rejects GET" \
  "http://localhost:8080/freeciv-web/civclientlauncher?action=new" "405" "GET"

LAUNCH_BODY=$(curl -s -X POST "http://localhost:8080/freeciv-web/civclientlauncher?action=new&type=singleplayer" 2>/dev/null)
assert_eq "CivclientLauncher returns 'success' for singleplayer" "success" "$LAUNCH_BODY"

LAUNCH_MULTI=$(curl -s -X POST "http://localhost:8080/freeciv-web/civclientlauncher?action=multi&civserverport=&type=multiplayer" 2>/dev/null)
assert_contains "CivclientLauncher handles multiplayer" "success" "$LAUNCH_MULTI"
echo ""

# ─── T5: Web Frontend via nginx ──────────────────────────────────────────
echo "── T5: Web Frontend via nginx ──"

assert_http_status "Homepage via nginx returns 200" "http://localhost:8000/" "200"

HOMEPAGE=$(curl -s http://localhost:8000/ 2>/dev/null)
assert_contains "Homepage contains 'Freeciv'" "Freeciv" "$HOMEPAGE"

assert_http_status "Static JS via nginx returns 200" \
  "http://localhost:8000/javascript/civclient.js" "200"
echo ""

# ─── T6: WebSocket Proxy (freeciv-proxy) ─────────────────────────────────
echo "── T6: WebSocket Proxy ──"

PROXY_PIDS=$(pgrep -f "freeciv-proxy.py" | wc -l | tr -d ' ')
if [ "$PROXY_PIDS" -gt 0 ]; then
  green "  PASS: freeciv-proxy processes running ($PROXY_PIDS instances)"
  ((PASS++))
else
  red "  FAIL: No freeciv-proxy processes running"
  ((FAIL++)); ERRORS+=("No freeciv-proxy")
fi
echo ""

# ─── T7: Configuration Validation ────────────────────────────────────────
echo "── T7: Configuration Validation ──"

assert_ok "publite2 settings.ini exists" test -f "$BASEDIR/publite2/settings.ini"
assert_ok "config.properties exists" test -f "$BASEDIR/freeciv-web/src/main/webapp/WEB-INF/config.properties"

# Check for hardcoded Linux paths that should have been converted
if grep -q "/var/lib/tomcat10" "$BASEDIR/publite2/settings.ini" 2>/dev/null; then
  red "  FAIL: settings.ini still has Linux path /var/lib/tomcat10"
  ((FAIL++)); ERRORS+=("Linux path in settings.ini")
else
  green "  PASS: settings.ini has no Linux hardcoded paths"
  ((PASS++))
fi

if grep -q "/var/lib/tomcat10" "$BASEDIR/publite2/init-freeciv-web.sh" 2>/dev/null; then
  red "  FAIL: init-freeciv-web.sh still has Linux path /var/lib/tomcat10"
  ((FAIL++)); ERRORS+=("Linux path in init-freeciv-web.sh")
else
  green "  PASS: init-freeciv-web.sh has no Linux hardcoded paths"
  ((PASS++))
fi

# Verify no longturn/pbem configs remain (simplified build)
LT_COUNT=$(ls "$BASEDIR"/publite2/pubscript_longturn_*.serv 2>/dev/null | wc -l | tr -d ' ')
PBEM_COUNT=$(ls "$BASEDIR"/publite2/pubscript_pbem.serv 2>/dev/null | wc -l | tr -d ' ')
assert_eq "No longturn scripts remain (simplified)" "0" "$LT_COUNT"
assert_eq "No pbem scripts remain (simplified)" "0" "$PBEM_COUNT"

# Verify WebGL directory removed
if [ -d "$BASEDIR/freeciv-web/src/main/webapp/javascript/webgl" ]; then
  red "  FAIL: WebGL directory still exists (should be removed)"
  ((FAIL++)); ERRORS+=("WebGL dir exists")
else
  green "  PASS: WebGL directory removed"
  ((PASS++))
fi
echo ""

# ─── T8: Tomcat server.xml maxPartCount ──────────────────────────────────
echo "── T8: Tomcat Configuration ──"

TOMCAT_CONF="/usr/local/opt/tomcat@10/libexec/conf/server.xml"
if grep -q "maxPartCount" "$TOMCAT_CONF" 2>/dev/null; then
  green "  PASS: server.xml has maxPartCount configured"
  ((PASS++))
else
  red "  FAIL: server.xml missing maxPartCount (BUG: FileCountLimitExceededException)"
  ((FAIL++)); ERRORS+=("Missing maxPartCount in server.xml")
fi
echo ""

# ─── T9: Error Log Analysis ──────────────────────────────────────────────
echo "── T9: Error Log Analysis ──"

CATALINA_LOG="/usr/local/opt/tomcat@10/libexec/logs/catalina.out"
if [ -f "$CATALINA_LOG" ]; then
  MULTIPART_ERRORS=$(grep -c "FileCountLimitExceededException" "$CATALINA_LOG" 2>/dev/null | tail -1)
  MULTIPART_ERRORS=${MULTIPART_ERRORS:-0}
  if [ "$MULTIPART_ERRORS" -gt 0 ]; then
    yellow "  WARN: $MULTIPART_ERRORS FileCountLimitExceededException in catalina.out (may be stale)"
    ((WARN++))
  else
    green "  PASS: No FileCountLimitExceededException in catalina.out"
    ((PASS++))
  fi

  NULL_PORT_ERRORS=$(grep -c "sPort=null" "$CATALINA_LOG" 2>/dev/null | tail -1)
  NULL_PORT_ERRORS=${NULL_PORT_ERRORS:-0}
  if [ "$NULL_PORT_ERRORS" -gt 0 ]; then
    yellow "  WARN: $NULL_PORT_ERRORS 'sPort=null' errors in catalina.out (multipart parsing failures)"
    ((WARN++))
  else
    green "  PASS: No sPort=null errors in catalina.out"
    ((PASS++))
  fi
fi

PUBLITE2_LOG="$BASEDIR/logs/publite2.log"
if [ -f "$PUBLITE2_LOG" ]; then
  SIGNAL_KILLS=$(grep -c "terminated by signal" "$PUBLITE2_LOG" 2>/dev/null | tail -1 || echo "0")
  SIGNAL_KILLS=${SIGNAL_KILLS:-0}
  if [ "$SIGNAL_KILLS" -gt 5 ] 2>/dev/null; then
    red "  FAIL: $SIGNAL_KILLS server terminations in publite2.log (excessive restarts)"
    ((FAIL++)); ERRORS+=("Excessive server restarts: $SIGNAL_KILLS")
  else
    green "  PASS: Server terminations in publite2.log within normal range ($SIGNAL_KILLS)"
    ((PASS++))
  fi
fi
echo ""

# ─── T10: Stress: Concurrent Launcher Requests ───────────────────────────
echo "── T10: Concurrent Launcher Stress Test ──"

CONCURRENT_OK=0
CONCURRENT_FAIL=0
for i in $(seq 1 5); do
  RESULT=$(curl -s -X POST "http://localhost:8080/freeciv-web/civclientlauncher?action=new" 2>/dev/null)
  if [ "$RESULT" = "success" ]; then
    ((CONCURRENT_OK++))
  else
    ((CONCURRENT_FAIL++))
  fi
done

if [ "$CONCURRENT_FAIL" -eq 0 ]; then
  green "  PASS: 5/5 sequential launcher requests succeeded"
  ((PASS++))
else
  red "  FAIL: $CONCURRENT_FAIL/5 launcher requests failed"
  ((FAIL++)); ERRORS+=("Launcher failures: $CONCURRENT_FAIL/5")
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────
echo "============================================"
echo "Test Results"
echo "============================================"
green "PASSED: $PASS"
[ "$WARN" -gt 0 ] && yellow "WARNINGS: $WARN"
if [ "$FAIL" -gt 0 ]; then
  red "FAILED: $FAIL"
  echo ""
  red "Failed tests:"
  for e in "${ERRORS[@]}"; do
    red "  - $e"
  done
  exit 1
else
  green "All tests passed!"
  exit 0
fi
