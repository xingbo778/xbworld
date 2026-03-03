/**
 * Bridge layer for calling legacy JS functions from TypeScript.
 *
 * During the gradual migration, new TS modules need to call functions
 * that still live in the legacy webclient.min.js bundle. This module
 * provides type-safe wrappers so we can track and eventually eliminate
 * these cross-boundary calls.
 *
 * ## Debug mode
 *
 * Set `window.__TS_DEBUG = true` in the browser console **before** the
 * game starts to enable call-level logging for every `exposeToLegacy`
 * function.  Each call logs:
 *   - function name, arguments, return value
 *   - whether the legacy version still exists and its return value
 *   - a MISMATCH warning when legacy and TS return different results
 *
 * The log is also stored in `window.__TS_CALL_LOG` (ring buffer, last
 * 2000 entries) so you can inspect / export it at any time:
 *
 *   copy(JSON.stringify(__TS_CALL_LOG, null, 2))   // copy to clipboard
 *   __TS_CALL_LOG.filter(e => e.mismatch)          // show mismatches only
 *
 * ### Snapshot / diff workflow
 *
 * 1. **Before** migrating a function, load the game and run:
 *      `__TS_SNAPSHOT_START()`
 *    Play for a few turns, then:
 *      `copy(JSON.stringify(__TS_SNAPSHOT_STOP()))`
 *    Paste into a file `baseline.json`.
 *
 * 2. **After** migrating, repeat the same steps → `migrated.json`.
 *
 * 3. Diff the two JSON files to see exactly which calls changed.
 *
 * Usage:
 *   import { legacy } from '@/bridge/legacy';
 *   legacy.centerTileMapcanvas(tile);
 */

const win = window as unknown as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Debug infrastructure
// ---------------------------------------------------------------------------

/** Per-call log entry */
interface CallLogEntry {
  ts: number;         // Date.now()
  fn: string;         // function name
  args: unknown[];    // arguments (shallow clone)
  ret: unknown;       // TS return value
  legacyRet?: unknown; // legacy return value (if legacy fn still exists)
  mismatch?: boolean; // true when ret !== legacyRet
}

/** Ring buffer for call logs */
const CALL_LOG_MAX = 2000;
const callLog: CallLogEntry[] = [];

/** Snapshot recording state */
let snapshotRecording = false;
let snapshotBuffer: CallLogEntry[] = [];

function isDebug(): boolean {
  return !!(win as any).__TS_DEBUG;
}

function pushLog(entry: CallLogEntry): void {
  if (callLog.length >= CALL_LOG_MAX) {
    callLog.shift();
  }
  callLog.push(entry);

  if (snapshotRecording) {
    snapshotBuffer.push(entry);
  }
}

/**
 * Shallow-compare two values for mismatch detection.
 * Objects are compared by JSON serialization (good enough for game data).
 */
function valuesMatch(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// Expose debug utilities on window
win['__TS_CALL_LOG'] = callLog;
win['__TS_SNAPSHOT_START'] = function (): void {
  snapshotRecording = true;
  snapshotBuffer = [];
  console.log('[bridge] Snapshot recording started. Play the game, then call __TS_SNAPSHOT_STOP().');
};
win['__TS_SNAPSHOT_STOP'] = function (): CallLogEntry[] {
  snapshotRecording = false;
  const result = snapshotBuffer;
  snapshotBuffer = [];
  console.log(`[bridge] Snapshot stopped. ${result.length} entries captured.`);
  return result;
};

// ---------------------------------------------------------------------------
// Legacy function calling
// ---------------------------------------------------------------------------

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

/**
 * Expose a TS function/value to legacy JS via `window[name]`.
 *
 * When `__TS_DEBUG` is enabled and `value` is a function, the exposed
 * function is wrapped with logging that:
 *   1. Records every call (args + return value) into `__TS_CALL_LOG`.
 *   2. If the legacy version was saved before overwrite, also calls
 *      the legacy version with the same args and compares results.
 *   3. Logs a MISMATCH warning when results differ.
 *
 * This lets you run the game once and immediately see every function
 * where TS behaviour diverges from legacy — no guessing needed.
 */
export function exposeToLegacy(name: string, value: unknown): void {
  if (typeof value === 'function') {
    // Save the legacy version before overwriting (if it exists)
    const legacyVersion = typeof win[name] === 'function'
      ? (win[name] as (...args: unknown[]) => unknown)
      : null;

    // Store it for manual comparison too
    if (legacyVersion) {
      const legacyStore = (win['__TS_LEGACY_ORIGINALS'] ??= {}) as Record<string, unknown>;
      legacyStore[name] = legacyVersion;
    }

    const tsFn = value as (...args: unknown[]) => unknown;

    // Create the wrapper that adds logging in debug mode
    const wrapper = function (this: unknown, ...args: unknown[]): unknown {
      const result = tsFn.apply(this, args);

      if (isDebug()) {
        const entry: CallLogEntry = {
          ts: Date.now(),
          fn: name,
          args: args.length <= 5 ? args : [args.length + ' args (truncated)'],
          ret: result,
        };

        // Compare with legacy if available
        if (legacyVersion) {
          try {
            const legacyResult = legacyVersion.apply(this, args);
            entry.legacyRet = legacyResult;
            entry.mismatch = !valuesMatch(result, legacyResult);
            if (entry.mismatch) {
              console.warn(
                `[bridge] MISMATCH ${name}(${args.map(a => JSON.stringify(a)).join(', ')})`,
                '\n  TS:', result,
                '\n  Legacy:', legacyResult,
              );
            }
          } catch (e) {
            entry.legacyRet = `ERROR: ${(e as Error).message}`;
            entry.mismatch = true;
          }
        }

        pushLog(entry);
      }

      return result;
    };

    // Preserve function name for debugging
    Object.defineProperty(wrapper, 'name', { value: name });
    win[name] = wrapper;
  } else {
    // For non-function values (constants), just assign directly
    win[name] = value;
  }
}
