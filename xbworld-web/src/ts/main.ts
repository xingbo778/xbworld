/**
 * XBWorld Web Client — New TS module entry point.
 *
 * This module runs ALONGSIDE the legacy JS files, not as a
 * replacement (yet). It:
 *   1. Patches missing legacy functions to prevent runtime errors.
 *   2. Syncs the GameStore with legacy global variables (bidirectional).
 *   3. Exposes migrated TS functions to legacy JS via window.
 *
 * Phase 5: Network layer (clinet.js + packhand.js) is now fully in TS.
 * The TS bundle loads AFTER all legacy JS files, so exposeToLegacy()
 * overrides the legacy implementations.
 */

import { syncStoreWithLegacy } from './bridge/sync';
import { logNormal } from './core/log';

// ---------------------------------------------------------------------------
// Phase 0: Patch missing legacy functions BEFORE any module overrides.
// ---------------------------------------------------------------------------
const win = window as unknown as Record<string, unknown>;

if (typeof win['update_unit_position'] !== 'function') {
  win['update_unit_position'] = function (_ptile: unknown): void {
    /* no-op in 2D renderer — only needed for WebGL */
  };
  logNormal('[TS] Patched missing update_unit_position (2D mode)');
}

// Patch missing WebGL functions that are referenced by legacy JS (overview.js,
// control.js) but only defined in the WebGL renderer bundle which is not loaded
// in 2D canvas mode.
const webglStubs: Record<string, (...args: unknown[]) => unknown> = {
  webgl_canvas_pos_to_tile: () => null,
  init_webgl_mapview: () => {},
  webgl_start_renderer: () => {},
};
for (const [name, fn] of Object.entries(webglStubs)) {
  if (typeof win[name] !== 'function') {
    win[name] = fn;
    logNormal(`[TS] Patched missing ${name} (2D mode)`);
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Import data modules.
// ---------------------------------------------------------------------------
import './data/game';
import './data/unit';
import './data/unittype';
import './data/player';
import './data/map';
import './data/tile';
import './data/terrain';
import './data/fcTypes';
import './data/actions';
import './data/extra';
import './data/improvement';
import './data/requirements';
import './data/government';
import './data/eventConstants';

// ---------------------------------------------------------------------------
// Phase 2: Import utility modules.
// ---------------------------------------------------------------------------
import './utils/helpers';

// ---------------------------------------------------------------------------
// Phase 3+5: Import packet constants and handlers.
// ---------------------------------------------------------------------------
import './net/packetConstants';
import './net/packhandlers';

// ---------------------------------------------------------------------------
// Phase 5: Import network layer (COMPLETE — replaces clinet.js).
// ---------------------------------------------------------------------------
import './net/connection';

// ---------------------------------------------------------------------------
// Import client modules — client state queries and core functions.
// ---------------------------------------------------------------------------
import './client/clientState';
import './client/clientCore';
import './client/clientTimers';
import './client/clientDebug';

// ---------------------------------------------------------------------------
// Phase 4: Import UI components.
// ---------------------------------------------------------------------------
import { exposeGameDialog } from './ui/GameDialog';
import './ui/game-dialog.css';

// ---------------------------------------------------------------------------
// Initialise bridge and sync.
// ---------------------------------------------------------------------------
function init(): void {
  logNormal('[TS] XBWorld TypeScript modules loading...');

  syncStoreWithLegacy();
  logNormal('[TS] Store ↔ legacy globals synced');

  exposeGameDialog();
  logNormal('[TS] GameDialog component exposed');

  logNormal('[TS] XBWorld TypeScript modules ready');
}

// Run immediately — this module loads after legacy JS files
// but before $(document).ready fires, so globals are available.
init();
