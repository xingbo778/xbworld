# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-03-02

### Added

- **AI Agent system** (`xbworld-agent/`): LLM-powered autonomous agents that
  play via WebSocket, with tool-calling interface for unit movement,
  city founding, production changes, and diplomacy.
- **Multi-agent test harness** (`xbworld-agent/test_8agents_50turns.py`):
  automated 8-player 50-turn integration test with pass/fail criteria.
- **macOS launch scripts** (`start-macos.sh`, `stop-macos.sh`,
  `install-macos.sh`): one-command local development setup on macOS with
  Tomcat, nginx, and game server orchestration.
- **Enemy visibility tool**: `get_visible_enemies` exposes opponent unit
  positions to the AI agent for tactical decisions.
- **Direction mapping fix**: corrected agent direction constants to match
  the server's `NW=0, N=1, NE=2, …, SE=7` convention (was previously using
  `N=0` which sent every unit in the wrong direction).
- **Destination tile computation**: `_compute_dest_tile()` replicates the JS
  client's `mapstep()` so `unit_move` packets carry the correct `dest_tile`
  instead of echoing `src_tile`.
- **City production guard**: `change_city_production` now checks current
  production before sending redundant packets.
- **Map redraw fix**: added `mark_all_dirty()` at end of
  `set_default_mapview_active()` so the canvas repaints after switching tabs.
- **Chinese language support**: full i18n with `text_zh_CN.properties`,
  `text_zh_TW.properties`, `FC_I18N` JavaScript translation layer with
  `tr()` function, and language toggle in the game tab bar and site header.
- **Performance profiling system** (`PerfTracker`): per-turn timing for
  LLM calls, tool execution, and idle wait; checkpoint summaries every 5
  turns; WebSocket message rate tracking; performance data in status API.
- **Logo generation script** (`scripts/generate_logo.py`): generates XBWorld
  logos via Compass/Gemini image API with SVG fallback when API unavailable.
- **SVG logos**: `xbworld-logo.svg` and `xbworld-favicon.svg` with globe/compass
  motif in gold (#d4a017) and dark navy (#1a1a2e) color scheme.
- **AI-first architecture plan** (`ARCHITECTURE.md`): comprehensive optimization
  roadmap for agent-first platform with API specifications and migration guide.
- **`.gitignore`**: excludes `freeciv/` (477MB C server), `.venv/` (260MB),
  `target/`, `node_modules/`, `logs/`, `music/`, and build artifacts.

### Changed

- **Full rebrand from Freeciv-web to XBWorld**:
  - Directory structure: `freeciv-web/` → `xbworld/`, `freeciv-agent/` →
    `xbworld-agent/`, `freeciv-proxy/` → `xbworld-proxy/`, `freeciv-web/` →
    `xbworld-web/`.
  - All user-visible strings updated: page titles, meta descriptions, dialog
    messages, loading screens, welcome text, error pages.
  - CSS selectors: `#freeciv_logo` → `#xbworld_logo`,
    `#freeciv_custom_scrollbar_div` → `#xbworld_custom_scrollbar_div`,
    `#freeciv_manual` → `#xbworld_manual`.
  - i18n properties: all 4 locale files (en, en_US, zh_CN, zh_TW) updated
    with XBWorld branding and game UI keys.
  - Python agent: class `FreecivAgent` → `XBWorldAgent`, logger names updated,
    docstrings and prompts rebranded.
  - Shell scripts: updated echo messages and comments.
  - Web manifest: name, description, icons updated.
  - Protocol identifiers kept unchanged for server compatibility.
- **UI redesign**:
  - Slim semi-transparent top bar with `backdrop-filter: blur(8px)`.
  - Icon tabs with bilingual tooltips (English/Chinese).
  - Prominent floating Turn Done button (bottom-right) with gold gradient
    and hover animation.
  - Semi-transparent chat panel with blur effect.
  - Mini-map with subtle shadow.
  - System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`.
  - Dark translucent panels with blue/gold accent colors.
  - Active tab indicator with gold bottom border.
- **Optimized conversation trimming**: threshold reduced from 20→16 messages,
  kept window from 12→10 to reduce LLM token usage (the #1 bottleneck).
- **README.md**: completely rewritten for XBWorld with architecture overview,
  quick start guide, and AI agent documentation.

### Removed

- `blender/` directory (3D model sources).
- `freeciv-web/src/main/webapp/gltf/` (WebGL model assets).
- `freeciv-web/src/main/webapp/javascript/webgl/` (Three.js renderer).
- `pbem/` directory (play-by-email backend).
- Longturn ruleset and server script files.
- 3D WebGL renderer, Blender models, and glTF assets.
- Multiplayer server browser, longturn modes, and PBEM options from lobby UI.

### Fixed

- **Direction mapping** (CRITICAL): agents were sending units in wrong
  directions due to `N=0` mapping instead of `NW=0, N=1, NE=2, W=3, E=4,
  SW=5, S=6, SE=7`. Every unit move for all 50 turns was going to the wrong
  tile.
- **`dest_tile` in `unit_move`** (CRITICAL): was sending `src_tile` as
  `dest_tile`. Now computes correct destination using `_compute_dest_tile()`
  with `DIR_DX/DIR_DY` tables and map wrapping.
- **Map rendering after tab switch**: returning to map tab after
  Government/Research/etc never triggered a redraw because no tiles were
  marked dirty while canvas was hidden.
- **City founding reliability**: increased verification sleep to 0.8s.
- **Redundant production packets**: `change_city_production` now skips if
  already producing the requested item.

### Known Issues

- Logo generation requires `COMPASS_API_KEY` environment variable; falls back
  to SVG when unavailable.
- The `freeciv/` C server directory must be separately compiled and is not
  tracked in git (477MB).
- MariaDB is still required for the proxy auth layer even in AI-only games.
- Turn timeout is infinite by default; one slow agent can block all others.

---

*Based on [freeciv/freeciv-web](https://github.com/freeciv/freeciv-web)
(develop branch, commit c19ce060f). Original project licensed under
AGPL-3.0.*
