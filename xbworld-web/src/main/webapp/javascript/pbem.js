/***********************************************************************
    XBWorld - Play-By-Email (PBEM) support.

    These functions were previously only in webclient.min.js (compiled
    from a source file that is no longer available). Since PBEM is not
    actively used, these are stub implementations that prevent runtime
    errors while maintaining the expected API.
***********************************************************************/

var pbem_phase_ended = false;

/**
 * Returns whether the current game is a PBEM game.
 */
function is_pbem() {
  return false;
}

function show_pbem_dialog() {
  /* PBEM not supported in this version */
}

function pbem_init_game() {
  /* no-op */
}

function pbem_end_phase() {
  /* no-op */
}

function activate_pbem_player() {
  /* no-op */
}

function challenge_pbem_player_dialog() {
  /* no-op */
}

function close_pbem_account() {
  /* no-op */
}

function create_new_pbem_game() {
  /* no-op */
}

function create_pbem_players() {
  /* no-op */
}

function get_pbem_game_key() {
  return null;
}

function handle_pbem_load() {
  /* no-op */
}

function login_pbem_user() {
  /* no-op */
}

function login_pbem_user_request() {
  /* no-op */
}

function pbem_duplicate_turn_play_check() {
  /* no-op */
}

function prepare_pbem_opponent_selection() {
  /* no-op */
}

function request_deactivate_account() {
  /* no-op */
}

function send_pbem_invitation() {
  /* no-op */
}

function set_human_pbem_players() {
  /* no-op */
}

function validateEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function forceLower(strInput) {
  strInput.value = strInput.value.toLowerCase();
}
