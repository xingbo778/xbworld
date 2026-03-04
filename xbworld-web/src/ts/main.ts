/**
 * XBWorld Web Client — TS module entry point.
 *
 * All game logic is now in TypeScript modules. This entry point:
 *   1. Initializes global data stores on window.
 *   2. Patches missing WebGL stubs for 2D canvas mode.
 *   3. Imports all TS modules.
 *   4. Registers all exports to window via globalRegistry (transitional).
 *   5. Syncs the GameStore with window globals.
 */

import { logNormal } from './core/log';

// ---------------------------------------------------------------------------
// Step 0: Ensure global data stores exist before any module runs.
// ---------------------------------------------------------------------------
const win = window as unknown as Record<string, unknown>;

// Data stores
if (!win['effects']) win['effects'] = {};
if (!win['specialists']) win['specialists'] = {};
if (!win['players']) win['players'] = {};
if (!win['research_data']) win['research_data'] = {};
if (win['game_info'] === undefined) win['game_info'] = null;
if (win['calendar_info'] === undefined) win['calendar_info'] = null;
if (win['game_rules'] === undefined) win['game_rules'] = null;
if (win['ruleset_control'] === undefined) win['ruleset_control'] = null;
if (win['ruleset_summary'] === undefined) win['ruleset_summary'] = null;
if (win['ruleset_description'] === undefined) win['ruleset_description'] = null;
if (!win['terrains']) win['terrains'] = {};
if (!win['resources']) win['resources'] = {};
if (!win['terrain_control']) win['terrain_control'] = {};
if (!win['governments']) win['governments'] = {};
if (win['requested_gov'] === undefined) win['requested_gov'] = -1;
if (!win['connections']) win['connections'] = {};
if (!win['conn_ping_info']) win['conn_ping_info'] = {};
if (!win['debug_ping_list']) win['debug_ping_list'] = [];
if (!win['actions']) win['actions'] = {};
if (!win['extras']) win['extras'] = {};
if (!win['roads']) win['roads'] = [];
if (!win['bases']) win['bases'] = [];
if (!win['unit_types']) win['unit_types'] = {};
if (!win['unit_classes']) win['unit_classes'] = {};
if (!win['tiles']) win['tiles'] = {};
if (!win['units']) win['units'] = {};
if (!win['cities']) win['cities'] = {};
if (!win['techs']) win['techs'] = {};
if (!win['nations']) win['nations'] = {};
if (!win['improvements']) win['improvements'] = {};
if (!win['map']) win['map'] = {};

// ---------------------------------------------------------------------------
// Step 1: Patch missing WebGL stubs (2D canvas mode).
// ---------------------------------------------------------------------------
if (typeof win['update_unit_position'] !== 'function') {
  win['update_unit_position'] = function (_ptile: unknown): void {
    /* no-op in 2D renderer */
  };
}
const webglStubs: Record<string, (...args: unknown[]) => unknown> = {
  webgl_canvas_pos_to_tile: () => null,
  init_webgl_mapview: () => {},
  webgl_start_renderer: () => {},
};
for (const [name, fn] of Object.entries(webglStubs)) {
  if (typeof win[name] !== 'function') {
    win[name] = fn;
  }
}

// ---------------------------------------------------------------------------
// Step 2: Import all TS modules (order matters for initialization).
// ---------------------------------------------------------------------------

// Data layer
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
import './data/city';
import './data/tech';
import './data/nation';
import './data/reqtree';
import './data/wikiDoc';

// Utilities
import './utils/bitvector';
import './utils/helpers';
import './utils/banlist';
import './utils/mobile';
import './utils/replay';
import './utils/savegame';

// Network layer
import './net/packetConstants';
import './net/packhandlers';
import './net/connection';

// Client layer
import './client/clientState';
import './client/clientCore';
import './client/clientMain';
import './client/civClient';
import './client/clientTimers';
import './client/clientDebug';

// Core layer
import './core/log';
import './core/messages';
import './core/overview';
import './core/pages';
import './core/control';
import './core/pregame';

// Renderer layer
import './renderer/mapctrl';
import './renderer/mapview';
import './renderer/mapviewCommon';
import './renderer/tilesetConfig';
import './renderer/tilespec';

// Audio layer
import './audio/sounds';
import './audio/speech';

// UI layer
import './ui/GameDialog';
import './ui/game-dialog.css';
import './ui/controls';
import './ui/actionDialog';
import './ui/cityDialog';
import './ui/techDialog';
import './ui/governmentDialog';
import './ui/cma';
import './ui/diplomacy';
import './ui/hallOfFame';
import './ui/helpdata';
import './ui/hotseat';
import './ui/intelDialog';
import './ui/mapFromImage';
import './ui/options';
import './ui/pillageDialog';
import './ui/rates';
import './ui/scorelog';
import './ui/spacerace';

// ---------------------------------------------------------------------------
// Step 3: Register all exports to window (transitional).
// ---------------------------------------------------------------------------
import './globalRegistry';

// ---------------------------------------------------------------------------
// Step 4: Sync GameStore with window globals.
// ---------------------------------------------------------------------------
import { store } from './data/store';

function syncStoreWithWindow(): void {
  const storeAny = store as any;
  const syncProps: [string, string][] = [
    ['tiles', 'tiles'],
    ['units', 'units'],
    ['cities', 'cities'],
    ['players', 'players'],
    ['terrains', 'terrains'],
    ['techs', 'techs'],
    ['nations', 'nations'],
    ['governments', 'governments'],
    ['improvements', 'improvements'],
    ['extras', 'extras'],
    ['connections', 'connections'],
    ['map', 'mapInfo'],
    ['unit_types', 'unitTypes'],
    ['game_info', 'gameInfo'],
    ['calendar_info', 'calendarInfo'],
    ['server_settings', 'serverSettings'],
    ['ruleset_control', 'rulesControl'],
    ['ruleset_summary', 'rulesSummary'],
    ['ruleset_description', 'rulesDescription'],
  ];

  for (const [globalName, storeProp] of syncProps) {
    const existing = win[globalName];
    if (existing !== undefined && existing !== null) {
      storeAny[storeProp] = existing;
    }
    try {
      Object.defineProperty(win, globalName, {
        get: () => storeAny[storeProp],
        set: (v: unknown) => { storeAny[storeProp] = v; },
        configurable: true,
        enumerable: true,
      });
    } catch {
      // defineProperty on window may fail in some environments
    }
  }
}

// ---------------------------------------------------------------------------
// Step 5: Initialize.
// ---------------------------------------------------------------------------
import { exposeGameDialog } from './ui/GameDialog';
import { initControls } from './ui/controls';

function init(): void {
  logNormal('[TS] XBWorld TypeScript modules loading...');

  syncStoreWithWindow();
  logNormal('[TS] Store ↔ window globals synced');

  exposeGameDialog();
  logNormal('[TS] GameDialog component exposed');

  initControls();
  logNormal('[TS] Controls initialized');

  logNormal('[TS] XBWorld TypeScript modules ready');
}

init();
