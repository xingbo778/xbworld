/**
 * Bridge layer for calling legacy JS functions from TypeScript.
 *
 * During the gradual migration, new TS modules need to call functions
 * that still live in the legacy webclient.min.js bundle. This module
 * provides type-safe wrappers so we can track and eventually eliminate
 * these cross-boundary calls.
 *
 * Usage:
 *   import { legacy } from '@/bridge/legacy';
 *   legacy.centerTileMapcanvas(tile);
 */

const win = window as Record<string, unknown>;

function legacyFn(name: string): ((...args: unknown[]) => unknown) | null {
  const fn = win[name];
  return typeof fn === 'function' ? (fn as (...args: unknown[]) => unknown) : null;
}

function callLegacy<T = void>(fnName: string, ...args: unknown[]): T {
  const fn = legacyFn(fnName);
  if (!fn) {
    console.warn(`[bridge] Legacy function "${fnName}" not found on window`);
    return undefined as T;
  }
  return fn(...args) as T;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
export const legacy = {
  centerTileMapcanvas: (tile: unknown) => callLegacy('center_tile_mapcanvas', tile),
  updateMapCanvas: () => callLegacy('update_map_canvas_check'),
  markAllDirty: () => callLegacy('dirty_all'),
  redrawOverview: () => callLegacy('redraw_overview'),

  // Unit control
  updateUnitFocus: () => callLegacy('update_unit_focus'),
  advanceUnitFocus: () => callLegacy('advance_unit_focus'),
  requestNewUnitActivity: (unit: unknown, activity: number) =>
    callLegacy('request_new_unit_activity', unit, activity),

  // Network
  sendRequest: (packet: string) => callLegacy('send_request', packet),
  sendMessage: (msg: string) => callLegacy('send_message', msg),
  sendEndTurn: () => callLegacy('send_end_turn'),

  // UI
  showDialogMessage: (title: string, message: string) =>
    callLegacy('show_dialog_message', title, message),
  updateGameStatusPanel: () => callLegacy('update_game_status_panel'),
  updateCityScreen: () => callLegacy('update_city_screen'),
  updateNationScreen: () => callLegacy('update_nation_screen'),

  // Game state queries
  clientState: () => callLegacy<number>('client_state'),
  clientIsObserver: () => callLegacy<boolean>('client_is_observer'),

  // Tile helpers
  tileUnits: (tile: unknown) => callLegacy<unknown[]>('tile_units', tile),
  tileCity: (tile: unknown) => callLegacy<unknown>('tile_city', tile),
  cityOwner: (city: unknown) => callLegacy<unknown>('city_owner', city),
};

// ---------------------------------------------------------------------------
// Expose new TS modules to legacy JS via window
// ---------------------------------------------------------------------------
export function exposeToLegacy(name: string, value: unknown): void {
  win[name] = value;
}
