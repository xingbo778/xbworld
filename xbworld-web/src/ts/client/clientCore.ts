/**
 * Core client functions — migrated from civclient.js.
 *
 * Functions with heavy jQuery UI dependencies (show_dialog_message,
 * show_auth_dialog, init_common_intro_dialog, civclient_init,
 * switch_renderer) remain in the legacy JS for now.
 *
 * Migrated functions:
 *   - is_longturn()
 *   - is_pbem()
 *   - is_hotseat()
 *   - is_server()
 *   - set_phase_start()
 *   - request_observe_game()
 *   - send_surrender_game()
 *   - get_invalid_username_reason()
 *   - validate_username()           [Phase 6]
 *   - is_username_valid_show()      [Phase 6]
 *   - surrender_game()              [Phase 6]
 *   - show_fullscreen_window()      [Phase 6]
 *   - motd_init()                   [Phase 6]
 */

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

/**
 * Full surrender_game() — sends surrender command and switches UI
 * back to the map tab. Migrated from civclient.js.
 */
export function surrenderGame(): void {
  sendSurrenderGame();

  // Switch UI back to map tab
  $('#tabs-map').removeClass('ui-tabs-hide');
  $('#tabs-opt').addClass('ui-tabs-hide');
  $('#map_tab').addClass('ui-state-active');
  $('#map_tab').addClass('ui-tabs-selected');
  $('#map_tab').removeClass('ui-state-default');
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

/**
 * Validates the username from the #username_req input field.
 * Stores valid username in simpleStorage.
 * Returns true if valid, false otherwise.
 *
 * Migrated from civclient.js validate_username().
 */
export function validateUsername(): boolean {
  const usernameVal = ($('#username_req') as any).val();
  win.username = usernameVal;

  if (!isUsernameValidShow(usernameVal)) {
    return false;
  }

  if (win.simpleStorage && typeof win.simpleStorage.set === 'function') {
    win.simpleStorage.set('username', usernameVal);
  }

  return true;
}

/**
 * Checks if the username is valid and shows the reason if it is not.
 * Returns whether the username is valid.
 *
 * Migrated from civclient.js is_username_valid_show().
 */
export function isUsernameValidShow(username: string | null): boolean {
  const reason = getInvalidUsernameReason(username);
  if (reason != null) {
    const safeUsername = (username ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;');
    $('#username_validation_result')
      .html("The username '" + safeUsername + "' is " + reason + '.')
      .show();
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

/**
 * Toggles fullscreen mode using BigScreen library, or shows a dialog
 * message as fallback.
 *
 * Migrated from civclient.js show_fullscreen_window().
 */
export function showFullscreenWindow(): void {
  if (win.BigScreen && win.BigScreen.enabled) {
    win.BigScreen.toggle();
  } else if (typeof win.show_dialog_message === 'function') {
    win.show_dialog_message('Fullscreen', 'Press F11 for fullscreen mode.');
  }
}

// ---------------------------------------------------------------------------
// MOTD (Message of the Day)
// ---------------------------------------------------------------------------

/**
 * Fetches and executes the /motd.js script, then schedules itself
 * to run again every 30 minutes.
 *
 * Migrated from civclient.js motd_init().
 */
export function motdInit(): void {
  ($ as any).getScript('/motd.js');
  setTimeout(motdInit, 1000 * 60 * 30);
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
// Phase 6 additions
