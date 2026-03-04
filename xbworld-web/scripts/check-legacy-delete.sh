#!/bin/bash
#
# Legacy JS Deletion Readiness Checker
#
# Checks whether a legacy JS file can be safely deleted by verifying
# that all its functions, variables, and side effects are covered by TS.
#
# Usage:
#   ./scripts/check-legacy-delete.sh javascript/player.js
#   ./scripts/check-legacy-delete.sh javascript/terrain.js javascript/game.js
#   ./scripts/check-legacy-delete.sh --all    # check all remaining legacy files
#
# Output:
#   ✓ = covered by TS (safe to delete)
#   ✗ = NOT covered (must add to TS before deleting)
#   ? = needs manual review
#
set -euo pipefail

WEBAPP="$(cd "$(dirname "$0")/.." && pwd)/src/main/webapp"
TS_DIR="$(cd "$(dirname "$0")/.." && pwd)/src/ts"
BUNDLE="$(cd "$(dirname "$0")/.." && pwd)/src/main/webapp/javascript/ts-bundle/main.js"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helper Functions ─────────────────────────────────────────────────

extract_functions() {
  # Extract function names from a JS file (both declarations and assignments)
  local file="$1"
  grep -oE '(function\s+[a-zA-Z_$][a-zA-Z0-9_$]*|[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*function)' "$file" 2>/dev/null \
    | sed -E 's/function\s+//; s/\s*=\s*function//' \
    | sort -u
}

extract_vars() {
  # Extract top-level var declarations from a JS file
  local file="$1"
  grep -oE '^var\s+[a-zA-Z_$][a-zA-Z0-9_$]*' "$file" 2>/dev/null \
    | sed 's/^var\s*//' \
    | sort -u
}

extract_jquery_plugins() {
  # Extract jQuery plugin definitions ($.fn.xxx or $.xxx)
  local file="$1"
  grep -oE '\$\.(fn\.)?[a-zA-Z_$][a-zA-Z0-9_$]*\s*=' "$file" 2>/dev/null \
    | sed 's/\s*=$//' \
    | sort -u
}

is_in_ts_bundle() {
  # Check if a name is exposed to window in the TS bundle
  local name="$1"
  if [ -f "$BUNDLE" ]; then
    grep -q "\"$name\"" "$BUNDLE" 2>/dev/null && return 0
    grep -q "'$name'" "$BUNDLE" 2>/dev/null && return 0
  fi
  # Also check TS source files for exposeToLegacy calls
  grep -rq "exposeToLegacy(['\"]$name['\"]" "$TS_DIR" 2>/dev/null && return 0
  # Check Object.defineProperty exposures
  grep -rq "defineProperty.*['\"]$name['\"]" "$TS_DIR" 2>/dev/null && return 0
  # Check sync.ts
  grep -rq "syncProp(['\"]$name['\"]" "$TS_DIR" 2>/dev/null && return 0
  # Check main.ts window init
  grep -rq "win\[.*['\"]$name['\"]" "$TS_DIR" 2>/dev/null && return 0
  return 1
}

is_referenced_by_legacy() {
  # Check if a name is referenced by other legacy JS files (excluding the file itself)
  local name="$1"
  local exclude_file="$2"
  local exclude_basename
  exclude_basename=$(basename "$exclude_file")
  # Search in all JS files except the one being checked, node_modules, and ts-bundle
  grep -rl "$name" "$WEBAPP/javascript/" 2>/dev/null \
    | grep -v "node_modules\|ts-bundle\|$exclude_basename" \
    | head -1 > /dev/null 2>&1
}

check_file() {
  local jsfile="$1"
  local fullpath

  # Resolve full path
  if [[ "$jsfile" == /* ]]; then
    fullpath="$jsfile"
  elif [[ "$jsfile" == javascript/* ]]; then
    fullpath="$WEBAPP/$jsfile"
  else
    fullpath="$WEBAPP/javascript/$jsfile"
  fi

  if [ ! -f "$fullpath" ]; then
    echo -e "${RED}ERROR: File not found: $fullpath${NC}"
    return 1
  fi

  local basename
  basename=$(basename "$fullpath" .js)
  local lines
  lines=$(wc -l < "$fullpath")

  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}Checking: ${BLUE}$(basename "$fullpath")${NC} (${lines} lines)"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

  local total=0
  local covered=0
  local uncovered=0
  local uncovered_items=()

  # ─── Check Functions ─────────────────────────────────────────────
  echo -e "\n${BOLD}Functions:${NC}"
  local funcs
  funcs=$(extract_functions "$fullpath")
  if [ -z "$funcs" ]; then
    echo "  (no functions found)"
  else
    while IFS= read -r fn; do
      total=$((total + 1))
      if is_in_ts_bundle "$fn"; then
        echo -e "  ${GREEN}✓${NC} $fn"
        covered=$((covered + 1))
      else
        echo -e "  ${RED}✗${NC} $fn"
        uncovered=$((uncovered + 1))
        uncovered_items+=("fn:$fn")
      fi
    done <<< "$funcs"
  fi

  # ─── Check Variables ─────────────────────────────────────────────
  echo -e "\n${BOLD}Variables:${NC}"
  local vars
  vars=$(extract_vars "$fullpath")
  if [ -z "$vars" ]; then
    echo "  (no top-level vars found)"
  else
    while IFS= read -r v; do
      total=$((total + 1))
      if is_in_ts_bundle "$v"; then
        echo -e "  ${GREEN}✓${NC} $v"
        covered=$((covered + 1))
      else
        # Check if the variable is actually used by other legacy files
        if is_referenced_by_legacy "$v" "$fullpath"; then
          echo -e "  ${RED}✗${NC} $v (referenced by other legacy files)"
          uncovered=$((uncovered + 1))
          uncovered_items+=("var:$v")
        else
          echo -e "  ${YELLOW}?${NC} $v (not referenced externally — may be safe to skip)"
          covered=$((covered + 1))
        fi
      fi
    done <<< "$vars"
  fi

  # ─── Check jQuery Plugins ───────────────────────────────────────
  local plugins
  plugins=$(extract_jquery_plugins "$fullpath")
  if [ -n "$plugins" ]; then
    echo -e "\n${BOLD}jQuery Plugins:${NC}"
    while IFS= read -r p; do
      total=$((total + 1))
      # jQuery plugins are harder to detect in TS — check for the method name
      local method
      method=$(echo "$p" | sed 's/\$\.\(fn\.\)\?//')
      if grep -rq "$method" "$TS_DIR" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $p"
        covered=$((covered + 1))
      else
        echo -e "  ${RED}✗${NC} $p"
        uncovered=$((uncovered + 1))
        uncovered_items+=("jquery:$p")
      fi
    done <<< "$plugins"
  fi

  # ─── Check Side Effects ─────────────────────────────────────────
  echo -e "\n${BOLD}Side Effects:${NC}"
  # Check for document.ready, $(function), addEventListener, etc.
  local side_effects=0
  if grep -qE '\$\(document\)\.ready|\$\(function|addEventListener|window\.onload' "$fullpath" 2>/dev/null; then
    echo -e "  ${YELLOW}?${NC} Has document.ready or event listeners — review manually"
    side_effects=1
  fi
  # Check for immediate function calls (IIFE)
  if grep -qE '^\s*\(' "$fullpath" 2>/dev/null; then
    echo -e "  ${YELLOW}?${NC} Has IIFE — review manually"
    side_effects=1
  fi
  # Check for $.extend
  if grep -qE '\$\.extend' "$fullpath" 2>/dev/null; then
    echo -e "  ${YELLOW}?${NC} Has $.extend — may define jQuery plugins"
    side_effects=1
  fi
  if [ $side_effects -eq 0 ]; then
    echo "  (no side effects detected)"
  fi

  # ─── Summary ────────────────────────────────────────────────────
  echo ""
  if [ $total -eq 0 ]; then
    echo -e "${YELLOW}⚠ No functions or variables found — file may be data-only or have unusual patterns${NC}"
  elif [ $uncovered -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ READY TO DELETE${NC} — $covered/$total items covered by TS"
    if [ $side_effects -gt 0 ]; then
      echo -e "  ${YELLOW}(but review side effects above)${NC}"
    fi
  else
    echo -e "${RED}${BOLD}✗ NOT READY${NC} — $uncovered/$total items missing from TS:"
    for item in "${uncovered_items[@]}"; do
      local type="${item%%:*}"
      local name="${item#*:}"
      case "$type" in
        fn)     echo -e "  ${RED}→ Add: exposeToLegacy('$name', $name)${NC}" ;;
        var)    echo -e "  ${RED}→ Add: win['$name'] = ... (in main.ts or relevant module)${NC}" ;;
        jquery) echo -e "  ${RED}→ Add: jQuery plugin '$name' in helpers.ts${NC}" ;;
      esac
    done
  fi

  return $uncovered
}

# ─── Main ─────────────────────────────────────────────────────────────

if [ $# -eq 0 ]; then
  echo "Usage: $0 <js-file> [js-file2 ...] | --all"
  echo ""
  echo "Examples:"
  echo "  $0 government.js"
  echo "  $0 javascript/terrain.js javascript/game.js"
  echo "  $0 --all"
  exit 1
fi

total_files=0
ready_files=0
not_ready_files=0

if [ "$1" = "--all" ]; then
  # Check all remaining legacy JS files (excluding libs, 2dcanvas, ts-bundle)
  files=$(find "$WEBAPP/javascript" -maxdepth 1 -name "*.js" -not -name "webclient.min.js" | sort)
  for f in $files; do
    total_files=$((total_files + 1))
    if check_file "$f"; then
      ready_files=$((ready_files + 1))
    else
      not_ready_files=$((not_ready_files + 1))
    fi
  done
else
  for f in "$@"; do
    total_files=$((total_files + 1))
    if check_file "$f"; then
      ready_files=$((ready_files + 1))
    else
      not_ready_files=$((not_ready_files + 1))
    fi
  done
fi

if [ $total_files -gt 1 ]; then
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}Summary: $total_files files checked${NC}"
  echo -e "  ${GREEN}✓ Ready to delete: $ready_files${NC}"
  echo -e "  ${RED}✗ Not ready: $not_ready_files${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
fi
