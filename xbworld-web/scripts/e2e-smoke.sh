#!/bin/bash
# =============================================================================
# E2E Smoke Test for XBWorld Web Client
#
# A lightweight final check before deployment. Does NOT require Playwright.
# Uses curl + Vite dev server to verify:
#   1. Vite build succeeds
#   2. Unit tests pass
#   3. Static compatibility checks pass
#   4. Dev server starts and serves pages
#   5. Key JS files load without 404
#   6. WebSocket proxy endpoint is reachable
#
# Usage:
#   ./scripts/e2e-smoke.sh [BACKEND_URL]
#
# Default BACKEND_URL: https://xbworld-production.up.railway.app
# =============================================================================

BACKEND_URL="${1:-https://xbworld-production.up.railway.app}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3333
REPORT_DIR="$PROJECT_DIR/tests/e2e"
LOG_FILE="$REPORT_DIR/smoke-test.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0
ERRORS=()
START_TIME=$(date +%s)

log()  { echo -e "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
pass() { PASSED=$((PASSED + 1)); log "${GREEN}PASS${NC}: $1"; }
fail() { FAILED=$((FAILED + 1)); ERRORS+=("$1"); log "${RED}FAIL${NC}: $1"; }
skip() { SKIPPED=$((SKIPPED + 1)); log "${YELLOW}SKIP${NC}: $1"; }
info() { log "${CYAN}INFO${NC}: $1"; }

cleanup() {
  if [ -n "$VITE_PID" ]; then
    kill "$VITE_PID" 2>/dev/null
    wait "$VITE_PID" 2>/dev/null
  fi
  fuser -k "$PORT/tcp" 2>/dev/null || true
}
trap cleanup EXIT

# =============================================================================
# Setup
# =============================================================================
mkdir -p "$REPORT_DIR"
: > "$LOG_FILE"

log "╔══════════════════════════════════════╗"
log "║     XBWorld E2E Smoke Test           ║"
log "╚══════════════════════════════════════╝"
info "Backend: $BACKEND_URL"
info "Port: $PORT"
info "Project: $PROJECT_DIR"
echo ""

# Clean up any existing processes on our port
fuser -k "$PORT/tcp" 2>/dev/null || true
pkill -f "vite.*port.*$PORT" 2>/dev/null || true
sleep 1

cd "$PROJECT_DIR"

# =============================================================================
# Step 1: Vite Build
# =============================================================================
log "── Step 1: Build ──"
BUILD_START=$(date +%s)
if npx vite build > /tmp/vite-build.log 2>&1; then
  BUILD_TIME=$(( $(date +%s) - BUILD_START ))
  BUNDLE_SIZE=$(wc -c < src/main/webapp/javascript/ts-bundle/main.js 2>/dev/null || echo "?")
  pass "Vite build succeeded (${BUILD_TIME}s, bundle: ${BUNDLE_SIZE} bytes)"
else
  fail "Vite build failed"
  cat /tmp/vite-build.log >> "$LOG_FILE"
  exit 1
fi

# =============================================================================
# Step 2: Unit Tests
# =============================================================================
log "── Step 2: Unit Tests ──"
if npx vitest run --reporter=verbose > /tmp/vitest-smoke.log 2>&1; then
  TEST_SUMMARY=$(grep -oP '\d+ tests? \| \d+ passed' /tmp/vitest-smoke.log | tail -1)
  if [ -z "$TEST_SUMMARY" ]; then
    TEST_SUMMARY=$(grep -oP '\d+ passed' /tmp/vitest-smoke.log | tail -1)
  fi
  pass "Unit tests: $TEST_SUMMARY"
else
  FAIL_INFO=$(grep -oP '\d+ failed' /tmp/vitest-smoke.log | head -1)
  fail "Unit tests: $FAIL_INFO"
  grep "FAIL\|Error\|expect" /tmp/vitest-smoke.log | head -20 >> "$LOG_FILE"
fi

# =============================================================================
# Step 3: Static Compatibility Check
# =============================================================================
log "── Step 3: Static Compatibility Check ──"
if node scripts/check-legacy-compat.cjs > /tmp/compat-check.log 2>&1; then
  COMPAT_WARNINGS=$(grep -c "WARN" /tmp/compat-check.log || echo "0")
  pass "Legacy compatibility check passed ($COMPAT_WARNINGS warnings)"
else
  COMPAT_ERRORS=$(grep -c "ERROR" /tmp/compat-check.log || echo "?")
  fail "Legacy compatibility check: $COMPAT_ERRORS errors"
  grep "ERROR" /tmp/compat-check.log >> "$LOG_FILE"
fi

# =============================================================================
# Step 4: Dev Server Startup
# =============================================================================
log "── Step 4: Dev Server ──"
BACKEND_URL="$BACKEND_URL" npx vite --config vite.config.dev.ts --port "$PORT" --host 0.0.0.0 > /tmp/vite-smoke-server.log 2>&1 &
VITE_PID=$!

SERVER_READY=false
for i in $(seq 1 15); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/webclient/index.html" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    SERVER_READY=true
    pass "Dev server started (PID: $VITE_PID, ${i}s)"
    break
  fi
  sleep 1
done

if [ "$SERVER_READY" = false ]; then
  fail "Dev server failed to start within 15s"
  cat /tmp/vite-smoke-server.log >> "$LOG_FILE"
  exit 1
fi

# =============================================================================
# Step 5: Page & Asset Loading
# =============================================================================
log "── Step 5: Page & Asset Loading ──"

check_url() {
  local url="$1"
  local desc="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    pass "$desc (HTTP $code)"
  else
    fail "$desc (HTTP $code)"
  fi
}

check_url "http://localhost:$PORT/webclient/index.html" "webclient/index.html"
check_url "http://localhost:$PORT/javascript/fc_types.js" "fc_types.js (Legacy source)"
check_url "http://localhost:$PORT/javascript/control.js" "control.js (Legacy source)"
check_url "http://localhost:$PORT/javascript/packhand.js" "packhand.js (Packet handlers)"
check_url "http://localhost:$PORT/javascript/packhand_glue.js" "packhand_glue.js (Dispatch table)"
check_url "http://localhost:$PORT/javascript/hbs-templates.js" "hbs-templates.js (Handlebars)"
check_url "http://localhost:$PORT/javascript/ts-bundle/main.js" "ts-bundle/main.js (TS bundle)"

# =============================================================================
# Step 6: TS Bundle Content Verification
# =============================================================================
log "── Step 6: TS Bundle Verification ──"

# Download the served TS bundle and check key functions
curl -s "http://localhost:$PORT/javascript/ts-bundle/main.js" > /tmp/served-bundle.js 2>/dev/null
if [ -s /tmp/served-bundle.js ]; then
  # Check critical functions are present
  CRITICAL_FNS=("client_state" "client_is_observer" "map_pos_to_tile" "tile_get_known" "move_points_text" "NATIVE_TO_MAP_POS" "GameDialog")
  ALL_FOUND=true
  MISSING=""
  for fn in "${CRITICAL_FNS[@]}"; do
    if ! grep -q "$fn" /tmp/served-bundle.js; then
      ALL_FOUND=false
      MISSING="$MISSING $fn"
    fi
  done
  if [ "$ALL_FOUND" = true ]; then
    pass "All ${#CRITICAL_FNS[@]} critical functions found in served bundle"
  else
    fail "Missing functions in served bundle:$MISSING"
  fi

  # Check no forbidden overrides
  FORBIDDEN=("game_init" "map_allocate" "tile_init" "map_init_topology")
  FOUND_FORBIDDEN=""
  for fn in "${FORBIDDEN[@]}"; do
    if grep -q "\b$fn\b" /tmp/served-bundle.js; then
      FOUND_FORBIDDEN="$FOUND_FORBIDDEN $fn"
    fi
  done
  if [ -z "$FOUND_FORBIDDEN" ]; then
    pass "No forbidden function overrides in served bundle"
  else
    fail "Forbidden overrides found:$FOUND_FORBIDDEN"
  fi
  rm -f /tmp/served-bundle.js
else
  fail "Could not download TS bundle from dev server"
fi

# =============================================================================
# Step 7: Backend Proxy Check
# =============================================================================
log "── Step 7: Backend Proxy ──"

# Check if the backend proxy works (validate_user endpoint)
PROXY_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "http://localhost:$PORT/validate_user?userstring=smoketest" 2>/dev/null || echo "000")
if [ "$PROXY_CODE" != "000" ] && [ "$PROXY_CODE" != "502" ] && [ "$PROXY_CODE" != "503" ]; then
  pass "Backend proxy reachable (HTTP $PROXY_CODE)"
else
  skip "Backend proxy unreachable (HTTP $PROXY_CODE) — backend may be down"
fi

# =============================================================================
# Report
# =============================================================================
END_TIME=$(date +%s)
DURATION=$(( END_TIME - START_TIME ))
TOTAL=$((PASSED + FAILED + SKIPPED))

echo ""
log "╔══════════════════════════════════════╗"
log "║          Test Results                ║"
log "╚══════════════════════════════════════╝"
log "  Duration: ${DURATION}s"
log "  Total:    $TOTAL"
log "  ${GREEN}Passed:   $PASSED${NC}"
log "  ${RED}Failed:   $FAILED${NC}"
log "  ${YELLOW}Skipped:  $SKIPPED${NC}"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  log "  Failed tests:"
  for err in "${ERRORS[@]}"; do
    log "    ✗ $err"
  done
fi

echo ""
log "Log: $LOG_FILE"

# Write JSON report
cat > "$REPORT_DIR/smoke-results.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "duration_seconds": $DURATION,
  "backend_url": "$BACKEND_URL",
  "total": $TOTAL,
  "passed": $PASSED,
  "failed": $FAILED,
  "skipped": $SKIPPED,
  "errors": [$(printf '"%s",' "${ERRORS[@]}" 2>/dev/null | sed 's/,$//')]
}
EOF

if [ "$FAILED" -gt 0 ]; then
  log "${RED}SMOKE TEST FAILED${NC}"
  exit 1
else
  log "${GREEN}SMOKE TEST PASSED${NC}"
  exit 0
fi
