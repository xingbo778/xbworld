#!/usr/bin/env bash
# =============================================================================
# Freeciv Source & Ruleset Validation Tests
#
# Validates the freeciv submodule, XBWorld ruleset files, Lua scripts,
# and build scripts without requiring a full compilation.
#
# Usage:
#   ./tests/test_freeciv_source.sh
# =============================================================================

set -u
PASS=0
FAIL=0
WARN=0
ERRORS=()

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null && pwd)"
FREECIV_DIR="${DIR}/freeciv"
SUBMODULE_DIR="${FREECIV_DIR}/freeciv"
RULESET_DIR="${SUBMODULE_DIR}/data/xbworld"

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

assert_fail() {
  local desc="$1"; shift
  if ! "$@" >/dev/null 2>&1; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc (should not exist)"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

assert_contains() {
  local desc="$1" file="$2" pattern="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc (pattern '$pattern' not found in $file)"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

assert_not_contains() {
  local desc="$1" file="$2" pattern="$3"
  if ! grep -q "$pattern" "$file" 2>/dev/null; then
    green "  PASS: $desc"; ((PASS++))
  else
    red   "  FAIL: $desc (pattern '$pattern' should not be in $file)"; ((FAIL++)); ERRORS+=("$desc")
  fi
}

warn() {
  yellow "  WARN: $1"; ((WARN++))
}

# =============================================================================
echo ""
echo "=== Freeciv Source & Ruleset Validation ==="
echo ""

# ---- 1. Submodule Structure ----
echo "--- 1. Submodule Structure ---"

assert_ok "freeciv submodule directory exists" test -d "$SUBMODULE_DIR"
assert_ok "freeciv/server directory exists" test -d "${SUBMODULE_DIR}/server"
assert_ok "freeciv/common directory exists" test -d "${SUBMODULE_DIR}/common"
assert_ok "freeciv/ai directory exists" test -d "${SUBMODULE_DIR}/ai"
assert_ok "freeciv/data/xbworld directory exists" test -d "$RULESET_DIR"
assert_ok "meson.build exists" test -f "${SUBMODULE_DIR}/meson.build"

# ---- 2. Dead Code Removal ----
echo ""
echo "--- 2. Dead Code Removal ---"

assert_fail "apply_patches.sh removed" test -f "${FREECIV_DIR}/apply_patches.sh"
assert_fail "dl_freeciv_default.sh removed" test -f "${FREECIV_DIR}/dl_freeciv_default.sh"
assert_fail "patches/ directory removed" test -d "${FREECIV_DIR}/patches"

# ---- 3. .orig Files Removed ----
echo ""
echo "--- 3. .orig Files Cleanup ---"

orig_count=$(find "$SUBMODULE_DIR" -name "*.orig" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$orig_count" = "0" ]; then
  green "  PASS: No .orig files in submodule ($orig_count found)"; ((PASS++))
else
  red "  FAIL: Found $orig_count .orig files in submodule"; ((FAIL++))
  ERRORS+=(".orig files still present")
fi

# ---- 4. Build Script Validation ----
echo ""
echo "--- 4. Build Script (prepare_freeciv.sh) ---"

PREPARE="${FREECIV_DIR}/prepare_freeciv.sh"
assert_ok "prepare_freeciv.sh exists" test -f "$PREPARE"
assert_ok "prepare_freeciv.sh is executable" test -x "$PREPARE"
assert_ok "Uses bash strict mode (set -euo pipefail)" grep -q "set -euo pipefail" "$PREPARE"
assert_not_contains "No unquoted \$EXTRA_MESON_PARAMS" "$PREPARE" ' \$EXTRA_MESON_PARAMS$'
assert_contains "Uses array syntax for EXTRA_MESON_PARAMS" "$PREPARE" 'EXTRA_MESON_PARAMS=()'
assert_contains "Has error handling for submodule init" "$PREPARE" 'ERROR.*Failed to initialize'

# Bash syntax check
assert_ok "prepare_freeciv.sh passes bash -n syntax check" bash -n "$PREPARE"

# ---- 5. Ruleset Files Validation ----
echo ""
echo "--- 5. XBWorld Ruleset Files ---"

REQUIRED_RULESETS=(
  "game.ruleset"
  "units.ruleset"
  "techs.ruleset"
  "buildings.ruleset"
  "effects.ruleset"
  "governments.ruleset"
  "actions.ruleset"
  "terrain.ruleset"
  "cities.ruleset"
  "nations.ruleset"
  "styles.ruleset"
  "script.lua"
)

for f in "${REQUIRED_RULESETS[@]}"; do
  assert_ok "Ruleset file exists: $f" test -f "${RULESET_DIR}/$f"
done

# ---- 6. Naming Consistency ----
echo ""
echo "--- 6. Naming Consistency ---"

assert_contains "game.ruleset name is XBWorld" "${RULESET_DIR}/game.ruleset" 'name = _("XBWorld")'
assert_not_contains "game.ruleset does not say Webperimental in name" "${RULESET_DIR}/game.ruleset" 'name = _("Webperimental")'
assert_contains "game.ruleset description references xbworld" "${RULESET_DIR}/game.ruleset" 'description = \*xbworld/README.xbworld\*'

for f in techs.ruleset terrain.ruleset styles.ruleset buildings.ruleset \
         effects.ruleset cities.ruleset nations.ruleset units.ruleset \
         governments.ruleset actions.ruleset; do
  assert_contains "$f description says XBWorld" "${RULESET_DIR}/$f" 'description = "XBWorld'
done

# ---- 7. Typo Check ----
echo ""
echo "--- 7. Typo Checks ---"

assert_not_contains "No 'attak' typo in game.ruleset" "${RULESET_DIR}/game.ruleset" "attak"
assert_contains "Correct 'attack' in game.ruleset" "${RULESET_DIR}/game.ruleset" "nuclear attack"

# ---- 8. Lua Script Safety ----
echo ""
echo "--- 8. Lua Script Safety ---"

assert_contains "script.lua has mountains > 0 guard" "${RULESET_DIR}/script.lua" "mountains > 0"
assert_contains "script.lua has deep_oceans > 0 guard" "${RULESET_DIR}/script.lua" "deep_oceans > 0"
assert_contains "script.lua has deserts > 0 guard" "${RULESET_DIR}/script.lua" "deserts > 0"
assert_contains "script.lua has glaciers > 0 guard" "${RULESET_DIR}/script.lua" "glaciers > 0"

# Lua syntax check (if luac is available)
if command -v luac >/dev/null 2>&1; then
  assert_ok "script.lua passes Lua syntax check" luac -p "${RULESET_DIR}/script.lua"
  assert_ok "parser.lua passes Lua syntax check" luac -p "${RULESET_DIR}/parser.lua"
else
  warn "luac not found — skipping Lua syntax checks"
fi

# ---- 9. Documentation ----
echo ""
echo "--- 9. Documentation ---"

assert_ok "freeciv/README.md exists" test -f "${FREECIV_DIR}/README.md"
assert_contains "README mentions submodule" "${FREECIV_DIR}/README.md" "submodule"
assert_contains "README mentions prepare_freeciv.sh" "${FREECIV_DIR}/README.md" "prepare_freeciv.sh"

assert_ok "PATCHES.md exists" test -f "${FREECIV_DIR}/PATCHES.md"
assert_contains "PATCHES.md documents fork point" "${FREECIV_DIR}/PATCHES.md" "add9f4e14e"

assert_ok "version.txt exists" test -f "${FREECIV_DIR}/version.txt"
assert_ok "README.xbworld exists" test -f "${RULESET_DIR}/README.xbworld"

# ---- 10. Action Section Migration ----
echo ""
echo "--- 10. Action Section Migration ---"

for rs in xbworld webperimental classic civ2civ3 multiplayer sandbox \
          goldkeep alien granularity civ1 civ2 stub; do
  RS_FILE="${SUBMODULE_DIR}/data/${rs}/actions.ruleset"
  if [ -f "$RS_FILE" ]; then
    assert_not_contains "${rs}: no old-style ui_name_ entries" "$RS_FILE" "^ui_name_"
  fi
done

assert_contains "xbworld actions.ruleset has [action_poison_city]" \
  "${RULESET_DIR}/actions.ruleset" '^\[action_poison_city\]'
assert_contains "xbworld actions.ruleset has [action_keep_moving]" \
  "${RULESET_DIR}/actions.ruleset" '^\[action_keep_moving\]'
assert_contains "xbworld actions.ruleset has [action_disrupt_supply_lines]" \
  "${RULESET_DIR}/actions.ruleset" '^\[action_disrupt_supply_lines\]'
assert_contains "xbworld user_action_1 settings preserved" \
  "${RULESET_DIR}/actions.ruleset" 'user_action_1_target_kind'

# ---- 11. C Code Quality: nullptr vs NULL ----
echo ""
echo "--- 11. C Code Quality ---"

CRITICAL_C_FILES=(
  "server/cityturn.c"
  "server/citytools.c"
  "server/unithand.c"
  "server/unittools.c"
  "server/plrhand.c"
  "server/ruleset/rscompat.c"
  "server/savegame/savecompat.c"
  "common/city.c"
  "common/terrain.c"
)

nullptr_issues=0
for cf in "${CRITICAL_C_FILES[@]}"; do
  full_path="${SUBMODULE_DIR}/${cf}"
  if [ -f "$full_path" ]; then
    count=$(grep -c "nullptr" "$full_path" 2>/dev/null || true)
    if [ "$count" -gt 0 ]; then
      ((nullptr_issues += count))
    fi
  fi
done
if [ "$nullptr_issues" -le 500 ]; then
  green "  PASS: nullptr usage in critical C files is bounded ($nullptr_issues instances)"; ((PASS++))
else
  red "  FAIL: Excessive nullptr in critical C files ($nullptr_issues instances, max 500)"; ((FAIL++))
  ERRORS+=("nullptr count too high in critical C files")
fi

assert_not_contains "No conflict markers in cityturn.c" \
  "${SUBMODULE_DIR}/server/cityturn.c" "<<<<<<< HEAD"
assert_not_contains "No conflict markers in unithand.c" \
  "${SUBMODULE_DIR}/server/unithand.c" "<<<<<<< HEAD"
assert_not_contains "No conflict markers in savecompat.c" \
  "${SUBMODULE_DIR}/server/savegame/savecompat.c" "<<<<<<< HEAD"
assert_not_contains "No conflict markers in rscompat.c" \
  "${SUBMODULE_DIR}/server/ruleset/rscompat.c" "<<<<<<< HEAD"
assert_not_contains "No conflict markers in ruleload.c" \
  "${SUBMODULE_DIR}/server/ruleset/ruleload.c" "<<<<<<< HEAD"
assert_not_contains "No conflict markers in rulesave.c" \
  "${SUBMODULE_DIR}/tools/ruleutil/rulesave.c" "<<<<<<< HEAD"

# ---- 12. Cherry-picked Feature Verification ----
echo ""
echo "--- 12. Cherry-picked Features ---"

assert_contains "city_increase_size has natural_growth param" \
  "${SUBMODULE_DIR}/server/cityturn.c" "natural_growth"
assert_contains "Terrain supports multiple animals" \
  "${SUBMODULE_DIR}/common/terrain.h" "terrain_animals_iterate"
assert_contains "NETWORK_CAPSTRING preserved for Freeciv-web" \
  "${SUBMODULE_DIR}/fc_version" 'Freeciv.Web.Devel-3.3'
assert_contains "Civil_War_City_Bonus effect exists" \
  "${SUBMODULE_DIR}/server/plrhand.c" "EFT_CIVIL_WAR_CITY_BONUS"
assert_contains "Shield2Gold_Pct effect in enums" \
  "${SUBMODULE_DIR}/gen_headers/enums/effects_enums.def" "SHIELD2GOLD_PCT"
assert_contains "Conquer City savecompat conversion" \
  "${SUBMODULE_DIR}/server/savegame/savecompat.c" "Conquer City"
assert_contains "ui_name loaded from action section" \
  "${SUBMODULE_DIR}/server/ruleset/rscompat.c" "load_action_ui_name_3_3"
assert_contains "vision_site original owner tracking" \
  "${SUBMODULE_DIR}/common/vision.h" "original"

# ---- 13. Terrain Ruleset: animals field migration ----
echo ""
echo "--- 13. Terrain Ruleset Migration ---"

assert_not_contains "No deprecated singular 'animal' field in terrain.ruleset" \
  "${RULESET_DIR}/terrain.ruleset" '^animal[[:space:]]*='
assert_contains "terrain.ruleset comment uses plural 'animals'" \
  "${RULESET_DIR}/terrain.ruleset" '; animals'

# ---- 14. Savegame Compatibility ----
echo ""
echo "--- 14. Savegame Compatibility ---"

assert_contains "savecompat handles dc original field" \
  "${SUBMODULE_DIR}/server/savegame/savecompat.c" "dc%d.original"
assert_contains "savecompat has version check for 3029300" \
  "${SUBMODULE_DIR}/server/savegame/savecompat.c" "3029300"

# ---- 15. AI Improvements Integrated ----
echo ""
echo "--- 15. AI Module ---"

assert_ok "AI default module exists" test -d "${SUBMODULE_DIR}/ai/default"
assert_ok "AI tex module exists" test -d "${SUBMODULE_DIR}/ai/tex"
assert_ok "daieffects.c exists" test -f "${SUBMODULE_DIR}/ai/default/daieffects.c"
assert_ok "daicity.c exists" test -f "${SUBMODULE_DIR}/ai/default/daicity.c"

# ---- 16. Lua API Extensions ----
echo ""
echo "--- 16. Lua API ---"

assert_ok "api_game_find.c exists" test -f "${SUBMODULE_DIR}/common/scriptcore/api_game_find.c"
assert_ok "api_server_edit.c exists" test -f "${SUBMODULE_DIR}/server/scripting/api_server_edit.c"

# ---- 17. Protocol Consistency ----
echo ""
echo "--- 17. Protocol ---"

assert_contains "fc_version has NETWORK_CAPSTRING" \
  "${SUBMODULE_DIR}/fc_version" "NETWORK_CAPSTRING="
assert_not_contains "fc_version has no conflict markers" \
  "${SUBMODULE_DIR}/fc_version" "<<<<<<< HEAD"
assert_contains "RSFORMAT_3_3 defined" \
  "${SUBMODULE_DIR}/server/ruleset/ruleload.h" "RSFORMAT_3_3"

# ---- 18. No Stale Conflict Markers Anywhere ----
echo ""
echo "--- 18. Conflict Marker Sweep ---"

conflict_files=0
while IFS= read -r -d '' cfile; do
  if grep -q "<<<<<<< HEAD" "$cfile" 2>/dev/null; then
    ((conflict_files++))
    red "  CONFLICT: $cfile"
  fi
done < <(find "$SUBMODULE_DIR" -name "*.c" -o -name "*.h" -o -name "*.ruleset" -o -name "*.lua" | tr '\n' '\0')
if [ "$conflict_files" -eq 0 ]; then
  green "  PASS: No conflict markers in any source/ruleset/lua files"; ((PASS++))
else
  red "  FAIL: Found conflict markers in $conflict_files files"; ((FAIL++))
  ERRORS+=("Conflict markers found in $conflict_files files")
fi

# ---- 19. Git Submodule State ----
echo ""
echo "--- 19. Git Submodule State ---"

if [ -f "${SUBMODULE_DIR}/.git" ]; then
  green "  PASS: Submodule .git reference exists"; ((PASS++))

  submodule_branch=$(cd "$SUBMODULE_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$submodule_branch" = "xbworld" ]; then
    green "  PASS: Submodule is on xbworld branch"; ((PASS++))
  else
    red "  FAIL: Submodule is on '$submodule_branch', expected 'xbworld'"; ((FAIL++))
    ERRORS+=("Submodule not on xbworld branch")
  fi
else
  warn "Submodule .git not found — may not be initialized"
fi

# =============================================================================
echo ""
echo "==========================================="
printf "Results: "
green "$PASS passed"
if [ "$FAIL" -gt 0 ]; then
  printf "         "; red "$FAIL failed"
fi
if [ "$WARN" -gt 0 ]; then
  printf "         "; yellow "$WARN warnings"
fi
echo "==========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  red "Failed tests:"
  for e in "${ERRORS[@]}"; do
    red "  - $e"
  done
  exit 1
fi

exit 0
