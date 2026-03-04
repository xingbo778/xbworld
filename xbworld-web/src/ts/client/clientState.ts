/**
 * Client state management — migrated from client_main.js.
 *
 * Provides type-safe client state queries that the legacy code uses
 * extensively (client_state(), can_client_control(), etc.).
 *
 * These functions are exposed to legacy JS via `exposeToLegacy()` so
 * they override the old implementations in client_main.js.
 */

import { ClientState } from '../core/constants';
// ---------------------------------------------------------------------------
// State accessors — read from legacy globals directly
// ---------------------------------------------------------------------------

/**
 * Returns the current client state enum value.
 * Legacy global `civclient_state` is the source of truth.
 */
export function clientState(): number {
  return (window as any).civclient_state ?? ClientState.INITIAL;
}

/**
 * Returns TRUE if the client can change the view (mapview is active).
 */
export function canClientChangeView(): boolean {
  const playing = (window as any).client?.conn?.playing;
  const observer = clientIsObserver();
  return (
    (playing != null || observer) &&
    (clientState() === ClientState.RUNNING || clientState() === ClientState.OVER)
  );
}

/**
 * Returns TRUE if the client can control the player (not observer).
 */
export function canClientControl(): boolean {
  return !clientIsObserver();
}

/**
 * Returns TRUE if the client can issue orders (control + running).
 */
export function canClientIssueOrders(): boolean {
  return canClientControl() && clientState() === ClientState.RUNNING;
}

/**
 * Returns TRUE if the client is an observer.
 *
 * PITFALL: Legacy uses `client.conn.playing == null` WITHOUT optional
 * chaining. When `client` or `client.conn` is not yet initialized, the
 * Legacy version throws an error (caught by the caller), effectively
 * returning a non-true value. Using `?.` here would silently return
 * `undefined == null → true`, incorrectly marking the player as an
 * observer. This breaks `advance_unit_focus()` which skips observers,
 * preventing the map from centering on the player's units at game start.
 *
 * Fix: Guard against uninitialized `client`/`conn` by returning `false`
 * early, matching Legacy's effective behavior.
 */
export function clientIsObserver(): boolean {
  const c = (window as any).client;
  const obs = (window as any).observing;

  // If client or conn is not yet initialized, we are NOT an observer —
  // we simply don't know yet. Legacy would throw here; we return false.
  if (c == null || c.conn == null) {
    return false;
  }

  return c.conn.playing == null || c.conn.observer || obs;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
// Also expose the constants so legacy code like `C_S_RUNNING` still works.
// These are already declared as `var` in client_main.js, so we don't
// override them — they remain as globals. But we export them for TS usage.
export { ClientState };

// Legacy-compatible constants
export const C_S_INITIAL = ClientState.INITIAL;
export const C_S_PREPARING = ClientState.PREPARING;
export const C_S_RUNNING = ClientState.RUNNING;
export const C_S_OVER = ClientState.OVER;

/** Set the client state. */
export function set_client_state(newState: number): void {
  (window as any).civclient_state = newState;
}
