/**
 * Client timer functions — migrated from civclient.js.
 *
 * Handles:
 *   - update_timeout()           — countdown on Turn Done button
 *   - update_turn_change_timer() — turn-change wait indicator
 *
 * Both functions update the jQuery UI button label on #turn_done_button.
 * They read several legacy globals (game_info, seconds_to_phasedone, etc.)
 * and call legacy helpers (current_turn_timeout, is_small_screen, etc.).
 */

import { exposeToLegacy } from '../bridge/legacy';

const win = window as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert seconds to a human-readable time string (e.g. "1:23").
 * Falls back to legacy `seconds_to_human_time` if available.
 */
function secondsToHumanTime(seconds: number): string {
  if (typeof win.seconds_to_human_time === 'function') {
    return win.seconds_to_human_time(seconds);
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s < 10 ? '0' : ''}${s}` : `${s}`;
}

// ---------------------------------------------------------------------------
// update_timeout — called every 1 second by setInterval in civclient_init
// ---------------------------------------------------------------------------

/**
 * Updates the Turn Done button label with the remaining time for the
 * current turn phase. Reads legacy globals:
 *   - game_info, current_turn_timeout()
 *   - seconds_to_phasedone, seconds_to_phasedone_sync
 *   - turn_change_elapsed
 */
export function updateTimeout(): void {
  const now = Date.now();
  const gameInfo = win.game_info;
  const turnTimeout =
    typeof win.current_turn_timeout === 'function'
      ? win.current_turn_timeout()
      : null;

  if (gameInfo != null && turnTimeout != null && turnTimeout > 0) {
    const remaining = Math.floor(
      win.seconds_to_phasedone -
        (now - win.seconds_to_phasedone_sync) / 1000,
    );

    if (remaining >= 0 && win.turn_change_elapsed === 0) {
      const isSmall =
        typeof win.is_small_screen === 'function' && win.is_small_screen();
      const isLT =
        typeof win.is_longturn === 'function' && win.is_longturn();

      if (isSmall && !isLT) {
        $('#turn_done_button').button('option', 'label', 'Turn ' + remaining);
        $('#turn_done_button .ui-button-text').css('padding', '3px');
      } else {
        $('#turn_done_button').button(
          'option',
          'label',
          'Turn Done (' + secondsToHumanTime(remaining) + ')',
        );
      }

      if (typeof win.is_touch_device === 'function' && !win.is_touch_device()) {
        $('#turn_done_button').tooltip({ disabled: false });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// update_turn_change_timer — recursive setTimeout-based countdown
// ---------------------------------------------------------------------------

/**
 * Shows the remaining time of the turn change on the Turn Done button.
 * Reads/writes legacy globals:
 *   - turn_change_elapsed (incremented each call)
 *   - last_turn_change_time
 */
export function updateTurnChangeTimer(): void {
  win.turn_change_elapsed = (win.turn_change_elapsed ?? 0) + 1;

  if (win.turn_change_elapsed < win.last_turn_change_time) {
    setTimeout(updateTurnChangeTimer, 1000);
    $('#turn_done_button').button(
      'option',
      'label',
      'Please wait (' +
        (win.last_turn_change_time - win.turn_change_elapsed) +
        ')',
    );
  } else {
    win.turn_change_elapsed = 0;
    $('#turn_done_button').button('option', 'label', 'Turn Done');
  }
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('update_timeout', updateTimeout);
exposeToLegacy('update_turn_change_timer', updateTurnChangeTimer);
