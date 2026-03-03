/**
 * XBWorld Web Client — New TS module entry point.
 *
 * This module runs ALONGSIDE the legacy webclient.min.js, not as a
 * replacement. It:
 *   1. Patches missing legacy functions to prevent runtime errors.
 *   2. Syncs the GameStore with legacy global variables (bidirectional).
 *   3. Exposes migrated TS functions to legacy JS via window.
 *
 * IMPORTANT: The legacy JS still drives the main game loop, network,
 * and rendering. This module only adds/overrides specific functions
 * that have been fully migrated to TypeScript.
 */

import { syncStoreWithLegacy } from './bridge/sync';
import { logNormal } from './core/log';

// ---------------------------------------------------------------------------
// Phase 0: Patch missing legacy functions BEFORE any module overrides.
//
// `update_unit_position` is referenced in auto_center_on_focus_unit()
// (webclient.min.js) but is only defined in the WebGL renderer which
// is not included in the 2D build. We provide a safe no-op so the
// call chain advance_unit_focus → set_unit_focus_and_redraw →
// auto_center_on_focus_unit does not throw a ReferenceError.
// ---------------------------------------------------------------------------
const win = window as unknown as Record<string, unknown>;

if (typeof win['update_unit_position'] !== 'function') {
  win['update_unit_position'] = function (_ptile: unknown): void {
    /* no-op in 2D renderer — only needed for WebGL */
  };
  logNormal('[TS] Patched missing update_unit_position (2D mode)');
}

// ---------------------------------------------------------------------------
// Phase 1: Import data modules.
// Their top-level exposeToLegacy() calls register migrated functions
// on window, overriding the old implementations in webclient.min.js.
// ---------------------------------------------------------------------------
import './data/game';
import './data/unit';
import './data/unittype';
import './data/player';
import './data/map';
import './data/tile';
import './data/terrain';
import './data/fcTypes';      // Phase 1: constants (no exposeToLegacy, TS-only imports)
import './data/actions';      // Phase 1: action queries
import './data/extra';        // Phase 1: extra queries
import './data/improvement';  // Phase 1: improvement queries
import './data/requirements'; // Phase 1: requirement system
import './data/government';   // Phase 1: government data queries

// ---------------------------------------------------------------------------
// Phase 2: Import utility modules.
// ---------------------------------------------------------------------------
import './utils/helpers';      // Phase 2: utility functions (clone, DIVIDE, FC_WRAP, etc.)

// ---------------------------------------------------------------------------
// Phase 3: Import packet handlers.
// ---------------------------------------------------------------------------
import './net/packhandlers';  // Phase 3: packet handler migrations from packhand.js

// ---------------------------------------------------------------------------
// Import client modules — client state queries and core functions.
// ---------------------------------------------------------------------------
import './client/clientState';
import './client/clientCore';

// ---------------------------------------------------------------------------
// Phase 3: Initialise bridge and sync.
// ---------------------------------------------------------------------------
function init(): void {
  logNormal('[TS] XBWorld TypeScript modules loading...');

  // Wire up store ↔ legacy global variable sync.
  // This must happen AFTER webclient.min.js has set up globals.
  syncStoreWithLegacy();
  logNormal('[TS] Store ↔ legacy globals synced');

  logNormal('[TS] XBWorld TypeScript modules ready');
}

// Run immediately — this module loads after webclient.min.js
// but before $(document).ready fires, so globals are available.
init();
