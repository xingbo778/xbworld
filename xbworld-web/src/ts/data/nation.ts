/**
 * Nation data module — pure data queries and logic migrated from nation.js.
 *
 * Phase 7: Migrates 6 pure-data/logic functions from legacy nation.js.
 * UI/DOM functions (update_nation_screen, select_a_nation, etc.) remain
 * in legacy nation.js until the UI layer migration phase.
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Legacy global references (via window)
// ---------------------------------------------------------------------------
const w = window as unknown as Record<string, any>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const MAX_AI_LOVE = 1000;

// ---------------------------------------------------------------------------
// Pure data functions
// ---------------------------------------------------------------------------

/**
 * Return a text describing an AI's love for you.
 * These words are adjectives which can fit in the sentence
 * "The x are y towards us"
 */
function loveText(love: number): string {
  if (love <= -MAX_AI_LOVE * 90 / 100) {
    return 'Genocidal';
  } else if (love <= -MAX_AI_LOVE * 70 / 100) {
    return 'Belligerent';
  } else if (love <= -MAX_AI_LOVE * 50 / 100) {
    return 'Hostile';
  } else if (love <= -MAX_AI_LOVE * 25 / 100) {
    return 'Uncooperative';
  } else if (love <= -MAX_AI_LOVE * 10 / 100) {
    return 'Uneasy';
  } else if (love <= MAX_AI_LOVE * 10 / 100) {
    return 'Neutral';
  } else if (love <= MAX_AI_LOVE * 25 / 100) {
    return 'Respectful';
  } else if (love <= MAX_AI_LOVE * 50 / 100) {
    return 'Helpful';
  } else if (love <= MAX_AI_LOVE * 70 / 100) {
    return 'Enthusiastic';
  } else if (love <= MAX_AI_LOVE * 90 / 100) {
    return 'Admiring';
  } else {
    return 'Worshipful';
  }
}

/** Returns score text for a player. */
function getScoreText(player: any): string | number {
  if (player['score'] >= 0) {
    return player['score'];
  } else {
    return '?';
  }
}

/**
 * Returns the attitude text for a player towards the current player.
 * Used in the nation table's "Attitude" column.
 */
function colLove(pplayer: any): string {
  if (
    w.client_is_observer() ||
    w.client?.conn?.playing == null ||
    pplayer['playerno'] === w.client.conn.playing['playerno'] ||
    pplayer['flags'].isSet(w.PLRF_AI) === false
  ) {
    return '-';
  } else {
    return loveText(pplayer['love'][w.client.conn.playing['playerno']]);
  }
}

/** Handles the "Meet" button click in the nation dialog. */
function nationMeetClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  if (pplayer == null) return;
  const packet = {
    pid: w.packet_diplomacy_init_meeting_req,
    counterpart: pplayer['playerno'],
  };
  w.send_request(JSON.stringify(packet));
  w.set_default_mapview_active();
}

/** Handles the "Take Player" button click. */
function takePlayerClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  w.take_player(pplayer['name']);
  w.set_default_mapview_active();
}

/** Handles the "Toggle AI" button click. */
function toggleAiClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  w.aitoggle_player(pplayer['name']);
  w.set_default_mapview_active();
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------

// Constants
exposeToLegacy('MAX_AI_LOVE', MAX_AI_LOVE);

// Functions
exposeToLegacy('love_text', loveText);
exposeToLegacy('get_score_text', getScoreText);
exposeToLegacy('col_love', colLove);
exposeToLegacy('nation_meet_clicked', nationMeetClicked);
exposeToLegacy('take_player_clicked', takePlayerClicked);
exposeToLegacy('toggle_ai_clicked', toggleAiClicked);
