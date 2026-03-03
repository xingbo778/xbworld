/**
 * XBWorld Web Client — New TS module entry point.
 *
 * This module runs ALONGSIDE the legacy webclient.min.js, not as a
 * replacement. It:
 *   1. Syncs the GameStore with legacy global variables (bidirectional).
 *   2. Exposes migrated TS functions to legacy JS via window.
 *
 * IMPORTANT: The legacy JS still drives the main game loop, network,
 * and rendering. This module only adds/overrides specific functions
 * that have been fully migrated to TypeScript.
 */

import { syncStoreWithLegacy } from './bridge/sync';
import { logNormal } from './core/log';

// Data modules — their top-level exposeToLegacy() calls register
// migrated functions on window, overriding the legacy versions.
import './data/game';
import './data/unit';
import './data/player';

// Client modules — client state queries and core game functions.
import './client/clientState';
import './client/clientCore';

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
