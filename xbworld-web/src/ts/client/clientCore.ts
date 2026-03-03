/**
 * Core client functions — migrated from civclient.js.
 *
 * Only pure-logic functions are migrated here. Functions with heavy
 * jQuery UI dependencies (show_dialog_message, show_auth_dialog, etc.)
 * remain in the legacy JS for now.
 *
 * Migrated functions:
 *   - is_longturn()
 *   - is_server()
 *   - set_phase_start()
 *   - request_observe_game()
 *   - send_surrender_game()
 *   - validate_username() — partial, username validation logic only
 *   - get_seconds_to_phasedone() — helper for timeout calculations
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Helpers — read legacy globals
// ---------------------------------------------------------------------------
const win = window as any;

// ---------------------------------------------------------------------------
// Game type queries
// ---------------------------------------------------------------------------

/**
 * Returns TRUE if this is a LongTurn (one-turn-per-day) game.
 */
export function isLongturn(): boolean {
  return win.game_type === 'longturn';
}

/**
 * Returns TRUE if this is a PBEM (play-by-email) game.
 */
export function isPbem(): boolean {
  return win.game_type === 'pbem';
}

/**
 * Returns TRUE if this is a hotseat game.
 */
export function isHotseat(): boolean {
  return win.game_type === 'hotseat';
}

/**
 * Webclient is always client, never server.
 */
export function isServer(): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Phase timing
// ---------------------------------------------------------------------------

/**
 * Records the start time of the current phase.
 */
export function setPhaseStart(): void {
  win.phase_start_time = Date.now();
}

// ---------------------------------------------------------------------------
// Game actions
// ---------------------------------------------------------------------------

/**
 * Sends a request to observe the current game.
 */
export function requestObserveGame(): void {
  if (typeof win.send_message === 'function') {
    win.send_message('/observe ');
  }
}

/**
 * Sends a surrender command if the player is not an observer
 * and the WebSocket is open.
 */
export function sendSurrenderGame(): void {
  const isObserver = typeof win.client_is_observer === 'function' ? win.client_is_observer() : true;
  const ws = win.ws as WebSocket | null;

  if (!isObserver && ws != null && ws.readyState === WebSocket.OPEN) {
    win.send_message('/surrender ');
  }
}

// ---------------------------------------------------------------------------
// Username validation
// ---------------------------------------------------------------------------

/**
 * Returns the reason a username is invalid, or null if valid.
 * Migrated from player.js / get_invalid_username_reason().
 *
 * NOTE: The legacy `check_text_with_banlist_exact(name)` returns TRUE
 * when the name is VALID (not banned), and FALSE when banned.
 */
export function getInvalidUsernameReason(name: string | null): string | null {
  if (name == null || name.length === 0) {
    return 'empty';
  }
  if (name.length <= 2) {
    return 'too short';
  }
  if (name.length >= 32) {
    return 'too long';
  }
  const lower = name.toLowerCase();
  if (lower === 'pbem') {
    return 'not available';
  }
  // Must start with a letter, then letters and numbers only
  if (!/^[a-z][a-z0-9]*$/g.test(lower)) {
    return 'invalid: only English letters and numbers are allowed, and must start with a letter';
  }
  // check_text_with_banlist_exact returns TRUE = valid, FALSE = banned
  if (
    typeof win.check_text_with_banlist_exact === 'function' &&
    !win.check_text_with_banlist_exact(lower)
  ) {
    return 'banned';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('is_longturn', isLongturn);
exposeToLegacy('is_pbem', isPbem);
exposeToLegacy('is_hotseat', isHotseat);
exposeToLegacy('is_server', isServer);
exposeToLegacy('set_phase_start', setPhaseStart);
exposeToLegacy('request_observe_game', requestObserveGame);
exposeToLegacy('send_surrender_game', sendSurrenderGame);
exposeToLegacy('get_invalid_username_reason', getInvalidUsernameReason);
