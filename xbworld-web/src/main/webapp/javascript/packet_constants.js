/**
 * Packet type ID constants.
 *
 * These were originally compiled into webclient.min.js by Closure Compiler.
 * After the Phase 4 split (webclient.min.js → individual source files),
 * they need to be loaded as a standalone file.
 *
 * Each constant maps a packet name to its numeric protocol ID, used by
 * send_request() and client_handle_packet() to identify packet types.
 *
 * TODO(Phase 5+): Move these into the TS packets module and remove this file.
 */

/* Server join / auth */
var packet_server_join_req = 4;
var packet_authentication_reply = 7;

/* Nation / player setup */
var packet_nation_select_req = 10;
var packet_player_ready = 11;

/* Chat */
var packet_chat_msg_req = 26;

/* City management */
var packet_city_sell = 33;
var packet_city_buy = 34;
var packet_city_change = 35;
var packet_city_worklist = 36;
var packet_city_make_specialist = 37;
var packet_city_make_worker = 38;
var packet_city_change_specialist = 39;
var packet_city_rename = 40;
var packet_city_options_req = 41;
var packet_city_refresh = 42;
var packet_city_name_suggestion_req = 43;
var packet_city_rally_point = 138;

/* Player actions */
var packet_player_phase_done = 52;
var packet_player_change_government = 54;
var packet_player_research = 55;
var packet_player_tech_goal = 56;
var packet_player_attribute_block = 57;
var packet_player_attribute_chunk = 58;
var packet_player_place_infra = 61;
var packet_player_multiplier = 242;

/* Unit actions */
var packet_unit_sscs_set = 71;
var packet_unit_orders = 73;
var packet_unit_server_side_agent_set = 74;
var packet_unit_action_query = 82;
var packet_unit_type_upgrade = 83;
var packet_unit_do_action = 84;
var packet_unit_get_actions = 87;
var packet_unit_change_activity = 222;

/* Connection */
var packet_conn_pong = 89;

/* Diplomacy */
var packet_diplomacy_init_meeting_req = 95;
var packet_diplomacy_create_clause_req = 99;
var packet_diplomacy_remove_clause_req = 101;
var packet_diplomacy_accept_treaty_req = 103;
var packet_diplomacy_cancel_pact = 105;

/* Reports */
var packet_report_req = 111;

/* Client info */
var packet_client_info = 119;

/* Spaceship */
var packet_spaceship_launch = 135;
var packet_spaceship_place = 136;

/* Misc */
var packet_single_want_hack_req = 160;
var packet_ruleset_select = 171;
var packet_save_scenario = 181;
var packet_vote_submit = 189;
var packet_worker_task = 241;
var packet_client_heartbeat = 254;

/* Editor */
var packet_edit_mode = 190;
var packet_edit_recalculate_borders = 197;
var packet_edit_check_tiles = 198;
var packet_edit_tile_terrain = 200;
var packet_edit_tile_extra = 202;
var packet_edit_startpos = 204;
var packet_edit_startpos_full = 205;
var packet_edit_tile = 206;
var packet_edit_unit_create = 207;
var packet_edit_unit_remove = 208;
var packet_edit_unit_remove_by_id = 209;
var packet_edit_unit = 210;
var packet_edit_city_create = 211;
var packet_edit_city_remove = 212;
var packet_edit_city = 213;
var packet_edit_player_create = 214;
var packet_edit_player_remove = 215;
var packet_edit_player = 216;
var packet_edit_player_vision = 217;
var packet_edit_game = 218;
var packet_edit_scenario_desc = 14;

/* Web-specific extensions */
var packet_web_cma_clear = 258;
var packet_web_goto_path_req = 287;
var packet_web_info_text_req = 289;
