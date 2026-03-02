# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **AI Agent system** (`freeciv-agent/`): LLM-powered autonomous agents that
  play Freeciv via WebSocket, with tool-calling interface for unit movement,
  city founding, production changes, and diplomacy.
- **Multi-agent test harness** (`freeciv-agent/test_8agents_50turns.py`):
  automated 8-player 50-turn integration test.
- **macOS launch scripts** (`start-macos.sh`, `stop-macos.sh`,
  `install-macos.sh`): one-command local development setup on macOS with
  Tomcat, nginx, and Freeciv server orchestration.
- **Enemy visibility tool**: `get_visible_enemies` exposes opponent unit
  positions to the AI agent for tactical decisions.
- **Direction mapping fix**: corrected agent direction constants to match
  Freeciv's `NW=0, N=1, NE=2, …, SE=7` convention (was previously using
  `N=0` which sent every unit in the wrong direction).
- **Destination tile computation**: `_compute_dest_tile()` replicates the JS
  client's `mapstep()` so `unit_move` packets carry the correct `dest_tile`
  instead of echoing `src_tile`.
- **City production guard**: `change_city_production` now checks current
  production before sending redundant packets.
- **Map redraw fix**: added `mark_all_dirty()` at end of
  `set_default_mapview_active()` so the canvas repaints after switching tabs.
- **Chinese language support**: i18n translation layer with `tr()` function,
  `text_zh_CN.properties`, and language toggle in the game tab bar.

### Changed

- Stripped 3D WebGL renderer, Blender models, glTF assets, and play-by-email
  module to reduce repository size and focus on the 2D isometric client.
- Simplified lobby/pregame UI: removed multiplayer server browser, longturn
  modes, and PBEM options; kept single-player AI game flow.
- Updated `publite2` launcher to remove longturn and PBEM server configs.

### Removed

- `blender/` directory (3D model sources).
- `freeciv-web/src/main/webapp/gltf/` (WebGL model assets).
- `freeciv-web/src/main/webapp/javascript/webgl/` (Three.js renderer).
- `pbem/` directory (play-by-email backend).
- Longturn ruleset and server script files.

---

*Based on [freeciv/freeciv-web](https://github.com/freeciv/freeciv-web)
(develop branch, commit c19ce060f). Original project licensed under
AGPL-3.0.*
