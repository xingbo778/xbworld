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
import { exposeToLegacy } from '../bridge/legacy';

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
 */
export function clientIsObserver(): boolean {
  const c = (window as any).client;
  const obs = (window as any).observing;
  return c?.conn?.playing == null || c?.conn?.observer || obs;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('client_state', clientState);
exposeToLegacy('can_client_change_view', canClientChangeView);
exposeToLegacy('can_client_control', canClientControl);
exposeToLegacy('can_client_issue_orders', canClientIssueOrders);
exposeToLegacy('client_is_observer', clientIsObserver);

// Also expose the constants so legacy code like `C_S_RUNNING` still works.
// These are already declared as `var` in client_main.js, so we don't
// override them — they remain as globals. But we export them for TS usage.
export { ClientState };
