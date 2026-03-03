/**
 * Bidirectional sync between the new GameStore and legacy global variables.
 *
 * Legacy JS (webclient.min.js, packhand.js) reads/writes globals like
 * `units`, `cities`, `players`, etc. New TS code uses `store.units`,
 * `store.cities`, etc. This module makes them share the **same** objects
 * so both sides see the same data.
 *
 * Strategy: After legacy JS initialises the globals, we point `store.*`
 * at those same objects. We also define getters/setters on `window` for
 * globals that new TS code might write to `store` first (e.g. via
 * packet handlers that write to `store.cities`).
 *
 * Call `syncStoreWithLegacy()` once, early in bootstrap, **after** the
 * legacy JS <script> tags have executed.
 */

import { store } from '../data/store';

const win = window as unknown as Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeAny = store as any;

/**
 * For a given property name, make `window[globalName]` and
 * `store[storeProp]` reference the same object.
 *
 * - If the legacy global already exists (set by webclient.min.js),
 *   we adopt it into the store.
 * - Then we define a getter/setter on `window` so future reads/writes
 *   go through the store.
 */
function syncProp(globalName: string, storeProp: string): void {
  // Adopt existing legacy value into store (if any)
  const existing = win[globalName];
  if (existing !== undefined && existing !== null) {
    storeAny[storeProp] = existing;
  }

  // Define getter/setter so window[globalName] ↔ store[storeProp]
  try {
    Object.defineProperty(win, globalName, {
      get: () => storeAny[storeProp],
      set: (v: unknown) => {
        storeAny[storeProp] = v;
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    // In some environments defineProperty on window may fail; fall back silently.
  }
}

/**
 * Call once during bootstrap to wire up all global ↔ store bindings.
 */
export function syncStoreWithLegacy(): void {
  // Direct name matches (legacy global name === store property name)
  syncProp('tiles', 'tiles');
  syncProp('units', 'units');
  syncProp('cities', 'cities');
  syncProp('players', 'players');
  syncProp('terrains', 'terrains');
  syncProp('techs', 'techs');
  syncProp('nations', 'nations');
  syncProp('governments', 'governments');
  syncProp('improvements', 'improvements');
  syncProp('extras', 'extras');
  syncProp('connections', 'connections');

  // Aliased names (legacy name differs from store property)
  syncProp('unit_types', 'unitTypes');
  syncProp('game_info', 'gameInfo');
  syncProp('calendar_info', 'calendarInfo');
  syncProp('server_settings', 'serverSettings');
  syncProp('ruleset_control', 'rulesControl');
  syncProp('ruleset_summary', 'rulesSummary');
  syncProp('ruleset_description', 'rulesDescription');
}
