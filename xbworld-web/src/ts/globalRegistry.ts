/**
 * Global Registry - Transitional module
 *
 * Imports all TS module exports and registers them on `window` so that
 * modules still using `const w = window as unknown as Record<string, any>`
 * can access functions by their legacy names.
 *
 * Generated from actual exposeToLegacy() mappings + new TS module exports.
 * TODO: Replace all w.xxx references with direct imports, then delete this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window as any;

// --- audio ---
import {
  check_unit_sound_play,
  play_combat_sound,
  play_sound,
  sound_error_handler,
  sound_path,
  unit_move_sound_play,
} from './audio/sounds';
w['check_unit_sound_play'] = check_unit_sound_play;
w['unit_move_sound_play'] = unit_move_sound_play;
w['play_combat_sound'] = play_combat_sound;
w['play_sound'] = play_sound;
w['sound_error_handler'] = sound_error_handler;
w['sound_path'] = sound_path;


// --- client ---
import {
  civClientInit,
  closeDialogMessage,
  closingDialogMessage,
  initCommonIntroDialog,
  showAuthDialog,
  showDialogMessage,
  switchRenderer,
} from './client/civClient';
w['civclient_init'] = civClientInit;
w['civClientInit'] = civClientInit;
w['init_common_intro_dialog'] = initCommonIntroDialog;
w['initCommonIntroDialog'] = initCommonIntroDialog;
w['close_dialog_message'] = closeDialogMessage;
w['closeDialogMessage'] = closeDialogMessage;
w['closing_dialog_message'] = closingDialogMessage;
w['closingDialogMessage'] = closingDialogMessage;
w['show_dialog_message'] = showDialogMessage;
w['showDialogMessage'] = showDialogMessage;
w['show_auth_dialog'] = showAuthDialog;
w['showAuthDialog'] = showAuthDialog;
w['switch_renderer'] = switchRenderer;
w['switchRenderer'] = switchRenderer;

import {
  getInvalidUsernameReason,
  isHotseat,
  isLongturn,
  isPbem,
  isServer,
  isUsernameValidShow,
  motdInit,
  requestObserveGame,
  sendSurrenderGame,
  setPhaseStart,
  showFullscreenWindow,
  surrenderGame,
  validateUsername,
} from './client/clientCore';
w['is_longturn'] = isLongturn;
w['isLongturn'] = isLongturn;
w['is_pbem'] = isPbem;
w['isPbem'] = isPbem;
w['is_hotseat'] = isHotseat;
w['isHotseat'] = isHotseat;
w['is_server'] = isServer;
w['isServer'] = isServer;
w['set_phase_start'] = setPhaseStart;
w['setPhaseStart'] = setPhaseStart;
w['request_observe_game'] = requestObserveGame;
w['requestObserveGame'] = requestObserveGame;
w['send_surrender_game'] = sendSurrenderGame;
w['sendSurrenderGame'] = sendSurrenderGame;
w['get_invalid_username_reason'] = getInvalidUsernameReason;
w['getInvalidUsernameReason'] = getInvalidUsernameReason;
w['validate_username'] = validateUsername;
w['validateUsername'] = validateUsername;
w['is_username_valid_show'] = isUsernameValidShow;
w['isUsernameValidShow'] = isUsernameValidShow;
w['surrender_game'] = surrenderGame;
w['surrenderGame'] = surrenderGame;
w['show_fullscreen_window'] = showFullscreenWindow;
w['showFullscreenWindow'] = showFullscreenWindow;
w['motd_init'] = motdInit;
w['motdInit'] = motdInit;

import { showDebugInfo } from './client/clientDebug';
w['show_debug_info'] = showDebugInfo;
w['showDebugInfo'] = showDebugInfo;

import {
  alertWar,
  setClientState,
  setDefaultMapviewActive,
  setupWindowSize,
  showEndgameDialog,
  showNewGameMessage,
  updateMetamessageGameRunningStatus,
  updateMetamessageOnGamestart,
} from './client/clientMain';
w['set_client_state'] = setClientState;
w['setClientState'] = setClientState;
w['setup_window_size'] = setupWindowSize;
w['setupWindowSize'] = setupWindowSize;
w['show_new_game_message'] = showNewGameMessage;
w['showNewGameMessage'] = showNewGameMessage;
w['alert_war'] = alertWar;
w['alertWar'] = alertWar;
w['show_endgame_dialog'] = showEndgameDialog;
w['showEndgameDialog'] = showEndgameDialog;
w['update_metamessage_on_gamestart'] = updateMetamessageOnGamestart;
w['updateMetamessageOnGamestart'] = updateMetamessageOnGamestart;
w['update_metamessage_game_running_status'] = updateMetamessageGameRunningStatus;
w['updateMetamessageGameRunningStatus'] = updateMetamessageGameRunningStatus;
w['set_default_mapview_active'] = setDefaultMapviewActive;
w['setDefaultMapviewActive'] = setDefaultMapviewActive;

import {
  canClientChangeView,
  canClientControl,
  canClientIssueOrders,
  clientIsObserver,
  clientState,
} from './client/clientState';
w['client_state'] = clientState;
w['clientState'] = clientState;
w['can_client_change_view'] = canClientChangeView;
w['canClientChangeView'] = canClientChangeView;
w['can_client_control'] = canClientControl;
w['canClientControl'] = canClientControl;
w['can_client_issue_orders'] = canClientIssueOrders;
w['canClientIssueOrders'] = canClientIssueOrders;
w['client_is_observer'] = clientIsObserver;
w['clientIsObserver'] = clientIsObserver;

import { updateTimeout, updateTurnChangeTimer } from './client/clientTimers';
w['update_timeout'] = updateTimeout;
w['updateTimeout'] = updateTimeout;
w['update_turn_change_timer'] = updateTurnChangeTimer;
w['updateTurnChangeTimer'] = updateTurnChangeTimer;

// --- core ---
import {
  CHAT_ICON_ALLIES,
  CHAT_ICON_EVERYBODY,
  SELECT_APPEND,
  SELECT_LAND,
  SELECT_POPUP,
  SELECT_SEA,
  action_decision_clear_want,
  action_decision_request,
  action_selection_in_progress_for,
  action_selection_next_in_focus,
  action_selection_no_longer_in_progress,
  action_tgt_sel_active,
  activate_goto,
  activate_goto_last,
  advance_unit_focus,
  airlift_active,
  allow_right_click,
  ask_server_for_actions,
  auto_center_on_focus_unit,
  bases,
  can_ask_server_for_actions,
  center_on_any_city,
  center_tile_mapcanvas,
  chat_context_change,
  chat_context_dialog_show,
  chat_context_get_recipients,
  chat_context_set_next,
  chat_send_to,
  check_mouse_drag_unit,
  check_request_goto_path,
  check_text_input,
  city_dialog_activate_unit,
  civclient_handle_key,
  context_menu_active,
  control_init,
  control_unit_killed,
  current_focus,
  current_goto_turns,
  deactivate_goto,
  do_map_click,
  do_unit_paradrop_to,
  encode_message_text,
  end_turn_info_message_shown,
  find_a_focus_unit_tile_to_center_on,
  find_active_dialog,
  find_best_focus_candidate,
  find_visible_unit,
  game_unit_panel_state,
  get_drawable_unit,
  get_focus_unit_on_tile,
  get_units_in_focus,
  global_keyboard_listener,
  goto_active,
  goto_last_action,
  goto_last_order,
  goto_request_map,
  goto_turns_request_map,
  handle_chat_direction_chosen,
  handle_context_menu_callback,
  has_movesleft_warning_been_shown,
  init_game_unit_panel,
  intro_click_description,
  is_more_user_input_needed,
  is_unprefixed_message,
  key_unit_action_select,
  key_unit_airbase,
  key_unit_airlift,
  key_unit_auto_explore,
  key_unit_auto_work,
  key_unit_clean,
  key_unit_cultivate,
  key_unit_disband,
  key_unit_fortify,
  key_unit_fortress,
  key_unit_homecity,
  key_unit_idle,
  key_unit_irrigate,
  key_unit_load,
  key_unit_mine,
  key_unit_move,
  key_unit_noorders,
  key_unit_nuke,
  key_unit_paradrop,
  key_unit_pillage,
  key_unit_plant,
  key_unit_road,
  key_unit_sentry,
  key_unit_show_cargo,
  key_unit_transform,
  key_unit_unload,
  key_unit_upgrade,
  key_unit_wait,
  keyboard_input,
  map_handle_key,
  mapview_mouse_movement,
  mouse_moved_cb,
  mouse_x,
  mouse_y,
  order_wants_direction,
  paradrop_active,
  popit,
  popit_req,
  prev_mouse_x,
  prev_mouse_y,
  request_goto_path,
  request_new_unit_activity,
  request_unit_act_sel_vs,
  request_unit_act_sel_vs_own_tile,
  request_unit_autoworkers,
  request_unit_build_city,
  request_unit_cancel_orders,
  request_unit_do_action,
  request_unit_ssa_set,
  resize_enabled,
  roads,
  send_end_turn,
  set_chat_direction,
  set_mouse_touch_started_on_unit,
  set_unit_focus,
  set_unit_focus_and_activate,
  set_unit_focus_and_redraw,
  should_ask_server_for_actions,
  show_citybar,
  unit_distance_compare,
  unit_focus_urgent,
  unit_is_in_focus,
  unitpanel_active,
  update_active_units_dialog,
  update_goto_path,
  update_mouse_cursor,
  update_unit_focus,
  update_unit_order_commands,
  urgent_focus_queue,
  waiting_units_list,
} from './core/control';
w['control_init'] = control_init;
w['mouse_moved_cb'] = mouse_moved_cb;
w['update_mouse_cursor'] = update_mouse_cursor;
w['chat_context_change'] = chat_context_change;
w['chat_context_get_recipients'] = chat_context_get_recipients;
w['chat_context_set_next'] = chat_context_set_next;
w['chat_context_dialog_show'] = chat_context_dialog_show;
w['handle_chat_direction_chosen'] = handle_chat_direction_chosen;
w['set_chat_direction'] = set_chat_direction;
w['encode_message_text'] = encode_message_text;
w['is_unprefixed_message'] = is_unprefixed_message;
w['check_text_input'] = check_text_input;
w['should_ask_server_for_actions'] = should_ask_server_for_actions;
w['can_ask_server_for_actions'] = can_ask_server_for_actions;
w['ask_server_for_actions'] = ask_server_for_actions;
w['action_selection_no_longer_in_progress'] = action_selection_no_longer_in_progress;
w['action_decision_clear_want'] = action_decision_clear_want;
w['action_selection_next_in_focus'] = action_selection_next_in_focus;
w['action_decision_request'] = action_decision_request;
w['get_focus_unit_on_tile'] = get_focus_unit_on_tile;
w['unit_is_in_focus'] = unit_is_in_focus;
w['get_units_in_focus'] = get_units_in_focus;
w['unit_focus_urgent'] = unit_focus_urgent;
w['control_unit_killed'] = control_unit_killed;
w['update_unit_focus'] = update_unit_focus;
w['advance_unit_focus'] = advance_unit_focus;
w['update_unit_order_commands'] = update_unit_order_commands;
w['init_game_unit_panel'] = init_game_unit_panel;
w['find_best_focus_candidate'] = find_best_focus_candidate;
w['unit_distance_compare'] = unit_distance_compare;
w['set_unit_focus'] = set_unit_focus;
w['set_unit_focus_and_redraw'] = set_unit_focus_and_redraw;
w['set_unit_focus_and_activate'] = set_unit_focus_and_activate;
w['city_dialog_activate_unit'] = city_dialog_activate_unit;
w['auto_center_on_focus_unit'] = auto_center_on_focus_unit;
w['find_a_focus_unit_tile_to_center_on'] = find_a_focus_unit_tile_to_center_on;
w['find_visible_unit'] = find_visible_unit;
w['get_drawable_unit'] = get_drawable_unit;
w['order_wants_direction'] = order_wants_direction;
w['do_unit_paradrop_to'] = do_unit_paradrop_to;
w['do_map_click'] = do_map_click;
w['find_active_dialog'] = find_active_dialog;
w['global_keyboard_listener'] = global_keyboard_listener;
w['civclient_handle_key'] = civclient_handle_key;
w['map_handle_key'] = map_handle_key;
w['handle_context_menu_callback'] = handle_context_menu_callback;
w['activate_goto'] = activate_goto;
w['activate_goto_last'] = activate_goto_last;
w['deactivate_goto'] = deactivate_goto;
w['send_end_turn'] = send_end_turn;
w['key_unit_auto_explore'] = key_unit_auto_explore;
w['key_unit_load'] = key_unit_load;
w['key_unit_unload'] = key_unit_unload;
w['key_unit_show_cargo'] = key_unit_show_cargo;
w['key_unit_wait'] = key_unit_wait;
w['key_unit_noorders'] = key_unit_noorders;
w['key_unit_idle'] = key_unit_idle;
w['key_unit_sentry'] = key_unit_sentry;
w['key_unit_fortify'] = key_unit_fortify;
w['key_unit_fortress'] = key_unit_fortress;
w['key_unit_airbase'] = key_unit_airbase;
w['key_unit_irrigate'] = key_unit_irrigate;
w['key_unit_cultivate'] = key_unit_cultivate;
w['key_unit_clean'] = key_unit_clean;
w['key_unit_nuke'] = key_unit_nuke;
w['key_unit_upgrade'] = key_unit_upgrade;
w['key_unit_paradrop'] = key_unit_paradrop;
w['key_unit_airlift'] = key_unit_airlift;
w['key_unit_transform'] = key_unit_transform;
w['key_unit_pillage'] = key_unit_pillage;
w['key_unit_mine'] = key_unit_mine;
w['key_unit_plant'] = key_unit_plant;
w['key_unit_road'] = key_unit_road;
w['key_unit_homecity'] = key_unit_homecity;
w['key_unit_action_select'] = key_unit_action_select;
w['request_unit_act_sel_vs'] = request_unit_act_sel_vs;
w['request_unit_act_sel_vs_own_tile'] = request_unit_act_sel_vs_own_tile;
w['key_unit_auto_work'] = key_unit_auto_work;
w['request_unit_cancel_orders'] = request_unit_cancel_orders;
w['request_new_unit_activity'] = request_new_unit_activity;
w['request_unit_ssa_set'] = request_unit_ssa_set;
w['request_unit_autoworkers'] = request_unit_autoworkers;
w['request_unit_build_city'] = request_unit_build_city;
w['request_unit_do_action'] = request_unit_do_action;
w['key_unit_disband'] = key_unit_disband;
w['key_unit_move'] = key_unit_move;
w['request_goto_path'] = request_goto_path;
w['check_request_goto_path'] = check_request_goto_path;
w['update_goto_path'] = update_goto_path;
w['center_tile_mapcanvas'] = center_tile_mapcanvas;
w['popit'] = popit;
w['popit_req'] = popit_req;
w['center_on_any_city'] = center_on_any_city;
w['update_active_units_dialog'] = update_active_units_dialog;
w['set_mouse_touch_started_on_unit'] = set_mouse_touch_started_on_unit;
w['check_mouse_drag_unit'] = check_mouse_drag_unit;
w['mouse_x'] = mouse_x;
w['mouse_y'] = mouse_y;
w['prev_mouse_x'] = prev_mouse_x;
w['prev_mouse_y'] = prev_mouse_y;
w['keyboard_input'] = keyboard_input;
w['unitpanel_active'] = unitpanel_active;
w['allow_right_click'] = allow_right_click;
w['mapview_mouse_movement'] = mapview_mouse_movement;
w['roads'] = roads;
w['bases'] = bases;
w['current_focus'] = current_focus;
w['urgent_focus_queue'] = urgent_focus_queue;
w['goto_active'] = goto_active;
w['paradrop_active'] = paradrop_active;
w['airlift_active'] = airlift_active;
w['action_tgt_sel_active'] = action_tgt_sel_active;
w['goto_last_order'] = goto_last_order;
w['goto_last_action'] = goto_last_action;
w['SELECT_POPUP'] = SELECT_POPUP;
w['SELECT_SEA'] = SELECT_SEA;
w['SELECT_LAND'] = SELECT_LAND;
w['SELECT_APPEND'] = SELECT_APPEND;
w['intro_click_description'] = intro_click_description;
w['resize_enabled'] = resize_enabled;
w['goto_request_map'] = goto_request_map;
w['goto_turns_request_map'] = goto_turns_request_map;
w['current_goto_turns'] = current_goto_turns;
w['waiting_units_list'] = waiting_units_list;
w['show_citybar'] = show_citybar;
w['context_menu_active'] = context_menu_active;
w['has_movesleft_warning_been_shown'] = has_movesleft_warning_been_shown;
w['game_unit_panel_state'] = game_unit_panel_state;
w['chat_send_to'] = chat_send_to;
w['CHAT_ICON_EVERYBODY'] = CHAT_ICON_EVERYBODY;
w['CHAT_ICON_ALLIES'] = CHAT_ICON_ALLIES;
w['end_turn_info_message_shown'] = end_turn_info_message_shown;
w['action_selection_in_progress_for'] = action_selection_in_progress_for;
w['is_more_user_input_needed'] = is_more_user_input_needed;

import {
  freelog,
} from './core/log';
w['freelog'] = freelog;
w['LOG_FATAL'] = 0;
w['LOG_ERROR'] = 1;
w['LOG_NORMAL'] = 2;
w['LOG_VERBOSE'] = 3;
w['LOG_DEBUG'] = 4;

import {
  add_chatbox_text,
  chatbox_active,
  chatbox_clip_messages,
  clear_chatbox,
  current_message_dialog_state,
  get_chatbox_msg_list,
  get_chatbox_text,
  init_chatbox,
  max_chat_message_length,
  message_log,
  previous_scroll,
  reclassify_chat_message,
  update_chatbox,
  wait_for_text,
} from './core/messages';
w['init_chatbox'] = init_chatbox;
w['reclassify_chat_message'] = reclassify_chat_message;
w['add_chatbox_text'] = add_chatbox_text;
w['get_chatbox_text'] = get_chatbox_text;
w['get_chatbox_msg_list'] = get_chatbox_msg_list;
w['clear_chatbox'] = clear_chatbox;
w['update_chatbox'] = update_chatbox;
w['chatbox_clip_messages'] = chatbox_clip_messages;
w['wait_for_text'] = wait_for_text;
w['chatbox_active'] = chatbox_active;
w['message_log'] = message_log;
w['previous_scroll'] = previous_scroll;
w['current_message_dialog_state'] = current_message_dialog_state;
w['max_chat_message_length'] = max_chat_message_length;

import {
  COLOR_OVERVIEW_ALLIED_CITY,
  COLOR_OVERVIEW_ALLIED_UNIT,
  COLOR_OVERVIEW_ENEMY_CITY,
  COLOR_OVERVIEW_ENEMY_UNIT,
  COLOR_OVERVIEW_MY_CITY,
  COLOR_OVERVIEW_MY_UNIT,
  COLOR_OVERVIEW_UNKNOWN,
  COLOR_OVERVIEW_VIEWRECT,
  OVERVIEW_REFRESH,
  OVERVIEW_TILE_SIZE,
  add_closed_path,
  generate_overview_grid,
  generate_overview_hash,
  generate_palette,
  init_overview,
  max_overview_height,
  max_overview_width,
  min_overview_width,
  overviewTimerId,
  overview_active,
  overview_clicked,
  overview_current_state,
  overview_hash,
  overview_tile_color,
  palette,
  palette_color_offset,
  palette_terrain_offset,
  redraw_overview,
  render_multipixel,
  render_viewrect,
} from './core/overview';
w['init_overview'] = init_overview;
w['redraw_overview'] = redraw_overview;
w['generate_overview_grid'] = generate_overview_grid;
w['generate_overview_hash'] = generate_overview_hash;
w['render_viewrect'] = render_viewrect;
w['add_closed_path'] = add_closed_path;
w['render_multipixel'] = render_multipixel;
w['generate_palette'] = generate_palette;
w['overview_tile_color'] = overview_tile_color;
w['overview_clicked'] = overview_clicked;
w['OVERVIEW_TILE_SIZE'] = OVERVIEW_TILE_SIZE;
w['overviewTimerId'] = overviewTimerId;
w['min_overview_width'] = min_overview_width;
w['max_overview_width'] = max_overview_width;
w['max_overview_height'] = max_overview_height;
w['OVERVIEW_REFRESH'] = OVERVIEW_REFRESH;
w['palette'] = palette;
w['palette_color_offset'] = palette_color_offset;
w['palette_terrain_offset'] = palette_terrain_offset;
w['overview_active'] = overview_active;
w['COLOR_OVERVIEW_UNKNOWN'] = COLOR_OVERVIEW_UNKNOWN;
w['COLOR_OVERVIEW_MY_CITY'] = COLOR_OVERVIEW_MY_CITY;
w['COLOR_OVERVIEW_ALLIED_CITY'] = COLOR_OVERVIEW_ALLIED_CITY;
w['COLOR_OVERVIEW_ENEMY_CITY'] = COLOR_OVERVIEW_ENEMY_CITY;
w['COLOR_OVERVIEW_MY_UNIT'] = COLOR_OVERVIEW_MY_UNIT;
w['COLOR_OVERVIEW_ALLIED_UNIT'] = COLOR_OVERVIEW_ALLIED_UNIT;
w['COLOR_OVERVIEW_ENEMY_UNIT'] = COLOR_OVERVIEW_ENEMY_UNIT;
w['COLOR_OVERVIEW_VIEWRECT'] = COLOR_OVERVIEW_VIEWRECT;
w['overview_hash'] = overview_hash;
w['overview_current_state'] = overview_current_state;

import {
  PAGE_GAME,
  PAGE_LOAD,
  PAGE_MAIN,
  PAGE_NATION,
  PAGE_NETWORK,
  PAGE_SCENARIO,
  PAGE_START,
  get_client_page,
  set_client_page,
} from './core/pages';
w['set_client_page'] = set_client_page;
w['get_client_page'] = get_client_page;
w['PAGE_MAIN'] = PAGE_MAIN;
w['PAGE_START'] = PAGE_START;
w['PAGE_SCENARIO'] = PAGE_SCENARIO;
w['PAGE_LOAD'] = PAGE_LOAD;
w['PAGE_NETWORK'] = PAGE_NETWORK;
w['PAGE_NATION'] = PAGE_NATION;
w['PAGE_GAME'] = PAGE_GAME;

import {
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  ai_skill_level,
  antialiasing_setting,
  change_ruleset,
  choosing_player,
  chosen_nation,
  chosen_style,
  create_new_freeciv_user_account_request,
  google_user_token,
  graphics_quality,
  logged_in_with_password,
  metamessage_changed,
  nation_select_id,
  observe,
  observing,
  password_reset_count,
  pick_nation,
  pregame_settings,
  pregame_start_game,
  render_city_style_list,
  ruledir_from_ruleset_name,
  sanitize_username,
  select_nation,
  set_alternate_turns,
  show_intro_dialog,
  show_longturn_intro_dialog,
  show_new_user_account_dialog,
  show_ruleset_description_full,
  submit_nation_choice,
  update_game_info_pregame,
  update_nation_selection,
  update_player_info_pregame,
  update_player_info_pregame_queued,
  update_player_info_pregame_real,
  validate_username_callback,
} from './core/pregame';
w['sanitize_username'] = sanitize_username;
w['pregame_start_game'] = pregame_start_game;
w['set_alternate_turns'] = set_alternate_turns;
w['observe'] = observe;
w['update_game_info_pregame'] = update_game_info_pregame;
w['update_player_info_pregame'] = update_player_info_pregame;
w['update_player_info_pregame_real'] = update_player_info_pregame_real;
w['pick_nation'] = pick_nation;
w['update_nation_selection'] = update_nation_selection;
w['render_city_style_list'] = render_city_style_list;
w['select_nation'] = select_nation;
w['submit_nation_choice'] = submit_nation_choice;
w['ruledir_from_ruleset_name'] = ruledir_from_ruleset_name;
w['show_ruleset_description_full'] = show_ruleset_description_full;
w['pregame_settings'] = pregame_settings;
w['change_ruleset'] = change_ruleset;
w['show_intro_dialog'] = show_intro_dialog;
w['show_longturn_intro_dialog'] = show_longturn_intro_dialog;
w['validate_username_callback'] = validate_username_callback;
w['show_new_user_account_dialog'] = show_new_user_account_dialog;
w['create_new_freeciv_user_account_request'] = create_new_freeciv_user_account_request;
w['observing'] = observing;
w['chosen_nation'] = chosen_nation;
w['chosen_style'] = chosen_style;
w['choosing_player'] = choosing_player;
w['ai_skill_level'] = ai_skill_level;
w['nation_select_id'] = nation_select_id;
w['metamessage_changed'] = metamessage_changed;
w['logged_in_with_password'] = logged_in_with_password;
w['antialiasing_setting'] = antialiasing_setting;
w['update_player_info_pregame_queued'] = update_player_info_pregame_queued;
w['password_reset_count'] = password_reset_count;
w['google_user_token'] = google_user_token;
w['QUALITY_MEDIUM'] = QUALITY_MEDIUM;
w['QUALITY_HIGH'] = QUALITY_HIGH;
w['graphics_quality'] = graphics_quality;

// --- data ---
import { actionByNumber, actionHasResult, actionProbPossible } from './data/actions';
w['action_by_number'] = actionByNumber;
w['actionByNumber'] = actionByNumber;
w['action_has_result'] = actionHasResult;
w['actionHasResult'] = actionHasResult;
w['action_prob_possible'] = actionProbPossible;
w['actionProbPossible'] = actionProbPossible;

import {
  CITYO_DISBAND,
  CITYO_LAST,
  CITYO_NEW_EINSTEIN,
  CITYO_NEW_TAXMAN,
  FEELING_BASE,
  FEELING_EFFECT,
  FEELING_FINAL,
  FEELING_LUXURY,
  FEELING_MARTIAL,
  FEELING_NATIONALITY,
  INCITE_IMPOSSIBLE_COST,
  MAX_LEN_WORKLIST,
  buildCityTileMap,
  buildCityTileMapWithLimits,
  canCityBuildImprovementNow,
  canCityBuildNow,
  canCityBuildUnitDirect,
  canCityBuildUnitNow,
  cityCanBuy,
  cityHasBuilding,
  cityOwner,
  cityOwnerPlayerId,
  cityPopulation,
  cityTile,
  cityTurnsToBuild,
  cityTurnsToGrowthText,
  cityUnhappy,
  deltaTileHelper,
  doesCityHaveImprovement,
  dxyToCenterIndex,
  generateProductionList,
  getCityDxyToIndex,
  getCityProductionTime,
  getCityProductionType,
  getCityProductionTypeSprite,
  getCityTileMapForPos,
  getProductionProgress,
  isCityCenter,
  isFreeWorked,
  isPrimaryCapital,
  removeCity,
  showCityTraderoutes,
} from './data/city';
w['CITYO_DISBAND'] = CITYO_DISBAND;
w['CITYO_NEW_EINSTEIN'] = CITYO_NEW_EINSTEIN;
w['CITYO_NEW_TAXMAN'] = CITYO_NEW_TAXMAN;
w['CITYO_LAST'] = CITYO_LAST;
w['FEELING_BASE'] = FEELING_BASE;
w['FEELING_LUXURY'] = FEELING_LUXURY;
w['FEELING_EFFECT'] = FEELING_EFFECT;
w['FEELING_NATIONALITY'] = FEELING_NATIONALITY;
w['FEELING_MARTIAL'] = FEELING_MARTIAL;
w['FEELING_FINAL'] = FEELING_FINAL;
w['MAX_LEN_WORKLIST'] = MAX_LEN_WORKLIST;
w['INCITE_IMPOSSIBLE_COST'] = INCITE_IMPOSSIBLE_COST;
w['city_tile'] = cityTile;
w['cityTile'] = cityTile;
w['city_owner_player_id'] = cityOwnerPlayerId;
w['cityOwnerPlayerId'] = cityOwnerPlayerId;
w['city_owner'] = cityOwner;
w['cityOwner'] = cityOwner;
w['remove_city'] = removeCity;
w['removeCity'] = removeCity;
w['is_city_center'] = isCityCenter;
w['isCityCenter'] = isCityCenter;
w['is_free_worked'] = isFreeWorked;
w['isFreeWorked'] = isFreeWorked;
w['is_primary_capital'] = isPrimaryCapital;
w['isPrimaryCapital'] = isPrimaryCapital;
w['get_city_production_type_sprite'] = getCityProductionTypeSprite;
w['getCityProductionTypeSprite'] = getCityProductionTypeSprite;
w['get_city_production_type'] = getCityProductionType;
w['getCityProductionType'] = getCityProductionType;
w['city_turns_to_build'] = cityTurnsToBuild;
w['cityTurnsToBuild'] = cityTurnsToBuild;
w['get_city_production_time'] = getCityProductionTime;
w['getCityProductionTime'] = getCityProductionTime;
w['get_production_progress'] = getProductionProgress;
w['getProductionProgress'] = getProductionProgress;
w['generate_production_list'] = generateProductionList;
w['generateProductionList'] = generateProductionList;
w['can_city_build_unit_direct'] = canCityBuildUnitDirect;
w['canCityBuildUnitDirect'] = canCityBuildUnitDirect;
w['can_city_build_unit_now'] = canCityBuildUnitNow;
w['canCityBuildUnitNow'] = canCityBuildUnitNow;
w['can_city_build_improvement_now'] = canCityBuildImprovementNow;
w['canCityBuildImprovementNow'] = canCityBuildImprovementNow;
w['can_city_build_now'] = canCityBuildNow;
w['canCityBuildNow'] = canCityBuildNow;
w['city_has_building'] = cityHasBuilding;
w['cityHasBuilding'] = cityHasBuilding;
w['does_city_have_improvement'] = doesCityHaveImprovement;
w['doesCityHaveImprovement'] = doesCityHaveImprovement;
w['city_can_buy'] = cityCanBuy;
w['cityCanBuy'] = cityCanBuy;
w['city_turns_to_growth_text'] = cityTurnsToGrowthText;
w['cityTurnsToGrowthText'] = cityTurnsToGrowthText;
w['city_unhappy'] = cityUnhappy;
w['cityUnhappy'] = cityUnhappy;
w['city_population'] = cityPopulation;
w['cityPopulation'] = cityPopulation;
w['dxy_to_center_index'] = dxyToCenterIndex;
w['dxyToCenterIndex'] = dxyToCenterIndex;
w['get_city_dxy_to_index'] = getCityDxyToIndex;
w['getCityDxyToIndex'] = getCityDxyToIndex;
w['build_city_tile_map'] = buildCityTileMap;
w['buildCityTileMap'] = buildCityTileMap;
w['delta_tile_helper'] = deltaTileHelper;
w['deltaTileHelper'] = deltaTileHelper;
w['build_city_tile_map_with_limits'] = buildCityTileMapWithLimits;
w['buildCityTileMapWithLimits'] = buildCityTileMapWithLimits;
w['get_city_tile_map_for_pos'] = getCityTileMapForPos;
w['getCityTileMapForPos'] = getCityTileMapForPos;
w['show_city_traderoutes'] = showCityTraderoutes;
w['showCityTraderoutes'] = showCityTraderoutes;

import {
  BASE_GUI_AIRBASE,
  BASE_GUI_FORTRESS,
  EXTRA_NONE,
  extraByNumber,
  extraOwner,
  isExtraCausedBy,
  isExtraRemovedBy,
  territoryClaimingExtra,
} from './data/extra';
w['EXTRA_NONE'] = EXTRA_NONE;
w['BASE_GUI_FORTRESS'] = BASE_GUI_FORTRESS;
w['BASE_GUI_AIRBASE'] = BASE_GUI_AIRBASE;
w['extra_by_number'] = extraByNumber;
w['extraByNumber'] = extraByNumber;
w['extra_owner'] = extraOwner;
w['extraOwner'] = extraOwner;
w['is_extra_caused_by'] = isExtraCausedBy;
w['isExtraCausedBy'] = isExtraCausedBy;
w['is_extra_removed_by'] = isExtraRemovedBy;
w['isExtraRemovedBy'] = isExtraRemovedBy;
w['territory_claiming_extra'] = territoryClaimingExtra;
w['territoryClaimingExtra'] = territoryClaimingExtra;

import {
  IDENTITY_NUMBER_ZERO,
  civ_population,
  current_turn_timeout,
  game_find_city_by_number,
  game_find_unit_by_number,
  game_init,
  get_year_string,
  sum_width,
  update_game_status_panel,
} from './data/game';
w['IDENTITY_NUMBER_ZERO'] = IDENTITY_NUMBER_ZERO;
w['game_init'] = game_init;
w['game_find_city_by_number'] = game_find_city_by_number;
w['game_find_unit_by_number'] = game_find_unit_by_number;
w['civ_population'] = civ_population;
w['update_game_status_panel'] = update_game_status_panel;
w['get_year_string'] = get_year_string;
w['current_turn_timeout'] = current_turn_timeout;
w['sum_width'] = sum_width;

import { canPlayerGetGov, governmentMaxRate } from './data/government';
w['government_max_rate'] = governmentMaxRate;
w['governmentMaxRate'] = governmentMaxRate;
w['can_player_get_gov'] = canPlayerGetGov;
w['canPlayerGetGov'] = canPlayerGetGov;

import {
  B_AIRPORT_NAME,
  B_LAST,
  get_improvement_requirements,
  get_improvements_from_tech,
  improvement_id_by_name,
  improvements_add_building,
  improvements_init,
  is_wonder,
} from './data/improvement';
w['improvements_init'] = improvements_init;
w['improvements_add_building'] = improvements_add_building;
w['get_improvements_from_tech'] = get_improvements_from_tech;
w['is_wonder'] = is_wonder;
w['get_improvement_requirements'] = get_improvement_requirements;
w['improvement_id_by_name'] = improvement_id_by_name;
w['B_AIRPORT_NAME'] = B_AIRPORT_NAME;
w['B_LAST'] = B_LAST;

import {
  DIR_DX,
  DIR_DY,
  TF_HEX,
  TF_ISO,
  T_UNKNOWN,
  WRAP_X,
  WRAP_Y,
  clearGotoTiles,
  dirCCW,
  dirCW,
  dirGetName,
  getDirectionForStep,
  indexToTile,
  isCardinalDir,
  isValidDir,
  mapAllocate,
  mapDistanceVector,
  mapInitTopology,
  mapPosToTile,
  mapToNativePos,
  mapToNaturalPos,
  mapVectorToDistance,
  mapVectorToSqDistance,
  mapstep,
  nativeToMapPos,
  naturalToMapPos,
  tileInit,
  topoHasFlag,
  wrapHasFlag,
} from './data/map';
w['topo_has_flag'] = topoHasFlag;
w['topoHasFlag'] = topoHasFlag;
w['wrap_has_flag'] = wrapHasFlag;
w['wrapHasFlag'] = wrapHasFlag;
w['map_allocate'] = mapAllocate;
w['mapAllocate'] = mapAllocate;
w['tile_init'] = tileInit;
w['tileInit'] = tileInit;
w['map_init_topology'] = mapInitTopology;
w['mapInitTopology'] = mapInitTopology;
w['is_valid_dir'] = isValidDir;
w['isValidDir'] = isValidDir;
w['is_cardinal_dir'] = isCardinalDir;
w['isCardinalDir'] = isCardinalDir;
w['map_pos_to_tile'] = mapPosToTile;
w['mapPosToTile'] = mapPosToTile;
w['index_to_tile'] = indexToTile;
w['indexToTile'] = indexToTile;
w['mapstep'] = mapstep;
w['get_direction_for_step'] = getDirectionForStep;
w['getDirectionForStep'] = getDirectionForStep;
w['NATIVE_TO_MAP_POS'] = nativeToMapPos;
w['nativeToMapPos'] = nativeToMapPos;
w['NATURAL_TO_MAP_POS'] = naturalToMapPos;
w['naturalToMapPos'] = naturalToMapPos;
w['MAP_TO_NATIVE_POS'] = mapToNativePos;
w['mapToNativePos'] = mapToNativePos;
w['MAP_TO_NATURAL_POS'] = mapToNaturalPos;
w['mapToNaturalPos'] = mapToNaturalPos;
w['map_distance_vector'] = mapDistanceVector;
w['mapDistanceVector'] = mapDistanceVector;
w['map_vector_to_sq_distance'] = mapVectorToSqDistance;
w['mapVectorToSqDistance'] = mapVectorToSqDistance;
w['map_vector_to_distance'] = mapVectorToDistance;
w['mapVectorToDistance'] = mapVectorToDistance;
w['dir_get_name'] = dirGetName;
w['dirGetName'] = dirGetName;
w['dir_cw'] = dirCW;
w['dirCW'] = dirCW;
w['dir_ccw'] = dirCCW;
w['dirCCW'] = dirCCW;
w['clear_goto_tiles'] = clearGotoTiles;
w['clearGotoTiles'] = clearGotoTiles;
w['WRAP_X'] = WRAP_X;
w['WRAP_Y'] = WRAP_Y;
w['TF_ISO'] = TF_ISO;
w['TF_HEX'] = TF_HEX;
w['T_UNKNOWN'] = T_UNKNOWN;
w['DIR_DX'] = DIR_DX;
w['DIR_DY'] = DIR_DY;

import {
  MAX_AI_LOVE,
  aitogglePlayer,
  cancelTreatyClicked,
  centerOnPlayer,
  colLove,
  getScoreText,
  handleNationTableSelect,
  loveText,
  nationMeetClicked,
  nationTableSelectPlayer,
  selectANation,
  selectNoNation,
  sendPrivateMessage,
  showSendPrivateMessageDialog,
  takePlayer,
  takePlayerClicked,
  toggleAiClicked,
  updateNationScreen,
  withdrawVisionClicked,
} from './data/nation';
w['MAX_AI_LOVE'] = MAX_AI_LOVE;
w['love_text'] = loveText;
w['loveText'] = loveText;
w['get_score_text'] = getScoreText;
w['getScoreText'] = getScoreText;
w['col_love'] = colLove;
w['colLove'] = colLove;
w['update_nation_screen'] = updateNationScreen;
w['updateNationScreen'] = updateNationScreen;
w['handle_nation_table_select'] = handleNationTableSelect;
w['handleNationTableSelect'] = handleNationTableSelect;
w['select_a_nation'] = selectANation;
w['selectANation'] = selectANation;
w['select_no_nation'] = selectNoNation;
w['selectNoNation'] = selectNoNation;
w['nation_table_select_player'] = nationTableSelectPlayer;
w['nationTableSelectPlayer'] = nationTableSelectPlayer;
w['cancel_treaty_clicked'] = cancelTreatyClicked;
w['cancelTreatyClicked'] = cancelTreatyClicked;
w['withdraw_vision_clicked'] = withdrawVisionClicked;
w['withdrawVisionClicked'] = withdrawVisionClicked;
w['nation_meet_clicked'] = nationMeetClicked;
w['nationMeetClicked'] = nationMeetClicked;
w['take_player_clicked'] = takePlayerClicked;
w['takePlayerClicked'] = takePlayerClicked;
w['toggle_ai_clicked'] = toggleAiClicked;
w['toggleAiClicked'] = toggleAiClicked;
w['take_player'] = takePlayer;
w['takePlayer'] = takePlayer;
w['aitoggle_player'] = aitogglePlayer;
w['aitogglePlayer'] = aitogglePlayer;
w['center_on_player'] = centerOnPlayer;
w['centerOnPlayer'] = centerOnPlayer;
w['send_private_message'] = sendPrivateMessage;
w['sendPrivateMessage'] = sendPrivateMessage;
w['show_send_private_message_dialog'] = showSendPrivateMessageDialog;
w['showSendPrivateMessageDialog'] = showSendPrivateMessageDialog;

import {
  does_player_own_city,
  get_ai_level_text,
  get_diplstate_text,
  get_embassy_text,
  get_invalid_username_reason,
  get_player_connection_status,
  player_by_full_username,
  player_by_name,
  player_by_number,
  player_capital,
  player_find_unit_by_id,
  player_has_wonder,
  player_index,
  player_number,
  research_data,
  research_get,
  valid_player_by_number,
} from './data/player';
w['valid_player_by_number'] = valid_player_by_number;
w['player_by_number'] = player_by_number;
w['player_by_name'] = player_by_name;
w['player_by_full_username'] = player_by_full_username;
w['player_find_unit_by_id'] = player_find_unit_by_id;
w['player_index'] = player_index;
w['player_number'] = player_number;
w['get_diplstate_text'] = get_diplstate_text;
w['get_embassy_text'] = get_embassy_text;
w['get_ai_level_text'] = get_ai_level_text;
w['get_player_connection_status'] = get_player_connection_status;
w['research_get'] = research_get;
w['player_has_wonder'] = player_has_wonder;
w['get_invalid_username_reason'] = get_invalid_username_reason;
w['player_capital'] = player_capital;
w['does_player_own_city'] = does_player_own_city;
w['research_data'] = research_data;

import { reqtree, reqtree_civ2civ3, reqtree_multiplayer } from './data/reqtree';
w['reqtree'] = reqtree;
w['reqtree_multiplayer'] = reqtree_multiplayer;
w['reqtree_civ2civ3'] = reqtree_civ2civ3;

import { areReqsActive, isReqActive, isTechInRange, universalBuildShieldCost } from './data/requirements';
w['is_req_active'] = isReqActive;
w['isReqActive'] = isReqActive;
w['are_reqs_active'] = areReqsActive;
w['areReqsActive'] = areReqsActive;
w['is_tech_in_range'] = isTechInRange;
w['isTechInRange'] = isTechInRange;
w['universal_build_shield_cost'] = universalBuildShieldCost;
w['universalBuildShieldCost'] = universalBuildShieldCost;

import {
  AR_ONE,
  AR_ROOT,
  AR_SIZE,
  AR_TWO,
  A_FIRST,
  A_NONE,
  TECH_KNOWN,
  TECH_PREREQS_KNOWN,
  TECH_UNKNOWN,
  TF_BONUS_TECH,
  TF_BRIDGE,
  TF_BUILD_AIRBORNE,
  TF_FARMLAND,
  TF_LAST,
  TF_POPULATION_POLLUTION_INC,
  TF_RAILROAD,
  getCurrentBulbsOutput,
  getCurrentBulbsOutputText,
  isTechReqForGoal,
  isTechReqForTech,
  playerInventionState,
  techIdByName,
} from './data/tech';
w['TECH_UNKNOWN'] = TECH_UNKNOWN;
w['TECH_PREREQS_KNOWN'] = TECH_PREREQS_KNOWN;
w['TECH_KNOWN'] = TECH_KNOWN;
w['AR_ONE'] = AR_ONE;
w['AR_TWO'] = AR_TWO;
w['AR_ROOT'] = AR_ROOT;
w['AR_SIZE'] = AR_SIZE;
w['TF_BONUS_TECH'] = TF_BONUS_TECH;
w['TF_BRIDGE'] = TF_BRIDGE;
w['TF_RAILROAD'] = TF_RAILROAD;
w['TF_POPULATION_POLLUTION_INC'] = TF_POPULATION_POLLUTION_INC;
w['TF_FARMLAND'] = TF_FARMLAND;
w['TF_BUILD_AIRBORNE'] = TF_BUILD_AIRBORNE;
w['TF_LAST'] = TF_LAST;
w['A_NONE'] = A_NONE;
w['A_FIRST'] = A_FIRST;
w['player_invention_state'] = playerInventionState;
w['playerInventionState'] = playerInventionState;
w['is_tech_req_for_goal'] = isTechReqForGoal;
w['isTechReqForGoal'] = isTechReqForGoal;
w['is_tech_req_for_tech'] = isTechReqForTech;
w['isTechReqForTech'] = isTechReqForTech;
w['get_current_bulbs_output'] = getCurrentBulbsOutput;
w['getCurrentBulbsOutput'] = getCurrentBulbsOutput;
w['get_current_bulbs_output_text'] = getCurrentBulbsOutputText;
w['getCurrentBulbsOutputText'] = getCurrentBulbsOutputText;
w['tech_id_by_name'] = techIdByName;
w['techIdByName'] = techIdByName;

import { isOceanTile, tileSetTerrain, tileTerrain, tileTerrainNear } from './data/terrain';
w['tile_set_terrain'] = tileSetTerrain;
w['tileSetTerrain'] = tileSetTerrain;
w['tile_terrain'] = tileTerrain;
w['tileTerrain'] = tileTerrain;
w['tile_terrain_near'] = tileTerrainNear;
w['tileTerrainNear'] = tileTerrainNear;
w['is_ocean_tile'] = isOceanTile;
w['isOceanTile'] = isOceanTile;

import {
  TILE_KNOWN_SEEN,
  TILE_KNOWN_UNSEEN,
  TILE_UNKNOWN,
  tileCity,
  tileGetKnown,
  tileHasExtra,
  tileHasTerritoryClaimingExtra,
  tileOwner,
  tileResource,
  tileSetOwner,
  tileSetWorked,
  tileWorked,
} from './data/tile';
w['tile_get_known'] = tileGetKnown;
w['tileGetKnown'] = tileGetKnown;
w['tile_has_extra'] = tileHasExtra;
w['tileHasExtra'] = tileHasExtra;
w['tile_resource'] = tileResource;
w['tileResource'] = tileResource;
w['tile_has_territory_claiming_extra'] = tileHasTerritoryClaimingExtra;
w['tileHasTerritoryClaimingExtra'] = tileHasTerritoryClaimingExtra;
w['tile_owner'] = tileOwner;
w['tileOwner'] = tileOwner;
w['tile_set_owner'] = tileSetOwner;
w['tileSetOwner'] = tileSetOwner;
w['tile_worked'] = tileWorked;
w['tileWorked'] = tileWorked;
w['tile_set_worked'] = tileSetWorked;
w['tileSetWorked'] = tileSetWorked;
w['tile_city'] = tileCity;
w['tileCity'] = tileCity;
w['TILE_UNKNOWN'] = TILE_UNKNOWN;
w['TILE_KNOWN_UNSEEN'] = TILE_KNOWN_UNSEEN;
w['TILE_KNOWN_SEEN'] = TILE_KNOWN_SEEN;

import {
  ANIM_STEPS,
  Order,
  ServerSideAgent,
  UnitSSDataType,
  clear_tile_unit,
  client_remove_unit,
  get_supported_units,
  get_unit_anim_offset,
  get_unit_city_info,
  get_unit_homecity_name,
  get_unit_moves_left,
  get_what_can_unit_pillage_from,
  idex_lookup_unit,
  is_unit_visible,
  move_points_text,
  reset_unit_anim_list,
  tile_units,
  unit_can_do_action,
  unit_has_goto,
  unit_list_size,
  unit_list_without,
  unit_owner,
  unit_type,
  unittype_ids_alphabetic,
  update_tile_unit,
  update_unit_anim_list,
} from './data/unit';
w['idex_lookup_unit'] = idex_lookup_unit;
w['unit_owner'] = unit_owner;
w['client_remove_unit'] = client_remove_unit;
w['tile_units'] = tile_units;
w['get_supported_units'] = get_supported_units;
w['update_tile_unit'] = update_tile_unit;
w['clear_tile_unit'] = clear_tile_unit;
w['unit_list_size'] = unit_list_size;
w['unit_list_without'] = unit_list_without;
w['unit_type'] = unit_type;
w['unit_can_do_action'] = unit_can_do_action;
w['get_unit_moves_left'] = get_unit_moves_left;
w['move_points_text'] = move_points_text;
w['unit_has_goto'] = unit_has_goto;
w['update_unit_anim_list'] = update_unit_anim_list;
w['get_unit_anim_offset'] = get_unit_anim_offset;
w['reset_unit_anim_list'] = reset_unit_anim_list;
w['get_unit_homecity_name'] = get_unit_homecity_name;
w['is_unit_visible'] = is_unit_visible;
w['unittype_ids_alphabetic'] = unittype_ids_alphabetic;
w['get_unit_city_info'] = get_unit_city_info;
w['get_what_can_unit_pillage_from'] = get_what_can_unit_pillage_from;
w['ORDER_MOVE'] = Order;
w['Order'] = Order;
w['ORDER_ACTIVITY'] = Order;
w['ORDER_FULL_MP'] = Order;
w['ORDER_ACTION_MOVE'] = Order;
w['ORDER_PERFORM_ACTION'] = Order;
w['ORDER_LAST'] = Order;
w['USSDT_QUEUE'] = UnitSSDataType;
w['UnitSSDataType'] = UnitSSDataType;
w['USSDT_UNQUEUE'] = UnitSSDataType;
w['USSDT_BATTLE_GROUP'] = UnitSSDataType;
w['USSDT_SENTRY'] = UnitSSDataType;
w['SSA_NONE'] = ServerSideAgent;
w['ServerSideAgent'] = ServerSideAgent;
w['SSA_AUTOWORKER'] = ServerSideAgent;
w['SSA_AUTOEXPLORE'] = ServerSideAgent;
w['SSA_COUNT'] = ServerSideAgent;
w['ANIM_STEPS'] = ANIM_STEPS;

import {
  UCF,
  UTYF_FLAGLESS,
  UTYF_PROVIDES_RANSOM,
  U_LAST,
  U_NOT_OBSOLETED,
  can_player_build_unit_direct,
  get_units_from_tech,
  unit_classes,
  utype_can_do_action,
  utype_can_do_action_result,
} from './data/unittype';
w['utype_can_do_action'] = utype_can_do_action;
w['utype_can_do_action_result'] = utype_can_do_action_result;
w['can_player_build_unit_direct'] = can_player_build_unit_direct;
w['get_units_from_tech'] = get_units_from_tech;
w['unit_classes'] = unit_classes;
w['UCF_TERRAIN_SPEED'] = UCF;
w['UCF'] = UCF;
w['UCF_TERRAIN_DEFENSE'] = UCF;
w['UCF_DAMAGE_SLOWS'] = UCF;
w['UCF_CAN_OCCUPY_CITY'] = UCF;
w['UCF_MISSILE'] = UCF;
w['UCF_BUILD_ANYWHERE'] = UCF;
w['UCF_UNREACHABLE'] = UCF;
w['UCF_COLLECT_RANSOM'] = UCF;
w['UCF_ZOC'] = UCF;
w['UCF_CAN_FORTIFY'] = UCF;
w['UCF_CAN_PILLAGE'] = UCF;
w['UCF_HUT_FRIGHTEN'] = UCF;
w['UTYF_FLAGLESS'] = UTYF_FLAGLESS;
w['UTYF_PROVIDES_RANSOM'] = UTYF_PROVIDES_RANSOM;
w['U_NOT_OBSOLETED'] = U_NOT_OBSOLETED;
w['U_LAST'] = U_LAST;

import { freeciv_wiki_docs } from './data/wikiDoc';
w['freeciv_wiki_docs'] = freeciv_wiki_docs;

// --- net ---
import {
  check_websocket_ready,
  clinet_debug_collect,
  debug_client_speed_list,
  network_init,
  network_init_manual_hack,
  network_stop,
  ping_check,
  send_message,
  send_message_delayed,
  send_request,
  websocket_init,
} from './net/connection';
w['network_init'] = network_init;
w['network_init_manual_hack'] = network_init_manual_hack;
w['websocket_init'] = websocket_init;
w['check_websocket_ready'] = check_websocket_ready;
w['network_stop'] = network_stop;
w['send_request'] = send_request;
w['send_message'] = send_message;
w['send_message_delayed'] = send_message_delayed;
w['clinet_debug_collect'] = clinet_debug_collect;
w['ping_check'] = ping_check;
w['debug_client_speed_list'] = debug_client_speed_list;

import {
  action_decision_handle,
  action_decision_maybe_auto,
  client_handle_packet,
  client_remove_cli_conn,
  conn_list_append,
  find_conn_by_id,
  handle_achievement_info,
  handle_authentication_req,
  handle_begin_turn,
  handle_calendar_info,
  handle_chat_msg,
  handle_city_info,
  handle_city_name_suggestion_info,
  handle_city_nationalities,
  handle_city_rally_point,
  handle_city_remove,
  handle_city_sabotage_list,
  handle_city_short_info,
  handle_city_update_counter,
  handle_city_update_counters,
  handle_conn_info,
  handle_conn_ping,
  handle_conn_ping_info,
  handle_connect_msg,
  handle_diplomacy_accept_treaty,
  handle_diplomacy_cancel_meeting,
  handle_diplomacy_create_clause,
  handle_diplomacy_init_meeting,
  handle_diplomacy_remove_clause,
  handle_early_chat_msg,
  handle_edit_object_created,
  handle_edit_startpos,
  handle_edit_startpos_full,
  handle_end_phase,
  handle_end_turn,
  handle_endgame_player,
  handle_endgame_report,
  handle_freeze_client,
  handle_freeze_hint,
  handle_game_info,
  handle_game_load,
  handle_investigate_finished,
  handle_investigate_started,
  handle_map_info,
  handle_nation_availability,
  handle_new_year,
  handle_nuke_tile_info,
  handle_page_msg,
  handle_page_msg_part,
  handle_play_music,
  handle_player_attribute_chunk,
  handle_player_diplstate,
  handle_player_info,
  handle_player_remove,
  handle_popup_image,
  handle_processing_finished,
  handle_processing_started,
  handle_research_info,
  handle_ruleset_achievement,
  handle_ruleset_action,
  handle_ruleset_action_auto,
  handle_ruleset_action_enabler,
  handle_ruleset_base,
  handle_ruleset_building,
  handle_ruleset_choices,
  handle_ruleset_city,
  handle_ruleset_clause,
  handle_ruleset_control,
  handle_ruleset_counter,
  handle_ruleset_description_part,
  handle_ruleset_disaster,
  handle_ruleset_effect,
  handle_ruleset_extra,
  handle_ruleset_extra_flag,
  handle_ruleset_game,
  handle_ruleset_goods,
  handle_ruleset_government,
  handle_ruleset_government_ruler_title,
  handle_ruleset_impr_flag,
  handle_ruleset_multiplier,
  handle_ruleset_music,
  handle_ruleset_nation,
  handle_ruleset_nation_groups,
  handle_ruleset_nation_sets,
  handle_ruleset_resource,
  handle_ruleset_road,
  handle_ruleset_specialist,
  handle_ruleset_style,
  handle_ruleset_summary,
  handle_ruleset_tech,
  handle_ruleset_tech_class,
  handle_ruleset_tech_flag,
  handle_ruleset_terrain,
  handle_ruleset_terrain_control,
  handle_ruleset_terrain_flag,
  handle_ruleset_trade,
  handle_ruleset_unit,
  handle_ruleset_unit_bonus,
  handle_ruleset_unit_class,
  handle_ruleset_unit_class_flag,
  handle_ruleset_unit_flag,
  handle_rulesets_ready,
  handle_scenario_description,
  handle_scenario_info,
  handle_server_info,
  handle_server_join_reply,
  handle_server_setting_bitwise,
  handle_server_setting_bool,
  handle_server_setting_const,
  handle_server_setting_control,
  handle_server_setting_enum,
  handle_server_setting_int,
  handle_server_setting_str,
  handle_server_shutdown,
  handle_set_topology,
  handle_single_want_hack_reply,
  handle_spaceship_info,
  handle_start_phase,
  handle_team_name_info,
  handle_thaw_client,
  handle_thaw_hint,
  handle_tile_info,
  handle_timeout_info,
  handle_trade_route_info,
  handle_unit_action_answer,
  handle_unit_actions,
  handle_unit_combat_info,
  handle_unit_info,
  handle_unit_remove,
  handle_unit_short_info,
  handle_unknown_research,
  handle_vote_new,
  handle_vote_remove,
  handle_vote_resolve,
  handle_vote_update,
  handle_web_city_info_addition,
  handle_web_goto_path,
  handle_web_player_info_addition,
  handle_web_ruleset_unit_addition,
  handle_worker_task,
  packet_hand_table,
  recreate_old_tech_req,
  register_packet_handler,
  terrain_control,
  update_client_state,
} from './net/packhandlers';
w['terrain_control'] = terrain_control;
w['handle_processing_started'] = handle_processing_started;
w['handle_processing_finished'] = handle_processing_finished;
w['handle_investigate_started'] = handle_investigate_started;
w['handle_investigate_finished'] = handle_investigate_finished;
w['handle_freeze_hint'] = handle_freeze_hint;
w['handle_thaw_hint'] = handle_thaw_hint;
w['handle_freeze_client'] = handle_freeze_client;
w['handle_thaw_client'] = handle_thaw_client;
w['handle_ruleset_terrain'] = handle_ruleset_terrain;
w['handle_ruleset_resource'] = handle_ruleset_resource;
w['handle_ruleset_game'] = handle_ruleset_game;
w['handle_ruleset_specialist'] = handle_ruleset_specialist;
w['handle_ruleset_nation_groups'] = handle_ruleset_nation_groups;
w['handle_ruleset_nation'] = handle_ruleset_nation;
w['handle_ruleset_city'] = handle_ruleset_city;
w['handle_ruleset_government'] = handle_ruleset_government;
w['handle_ruleset_summary'] = handle_ruleset_summary;
w['handle_ruleset_description_part'] = handle_ruleset_description_part;
w['handle_ruleset_action'] = handle_ruleset_action;
w['handle_ruleset_goods'] = handle_ruleset_goods;
w['handle_ruleset_clause'] = handle_ruleset_clause;
w['handle_ruleset_effect'] = handle_ruleset_effect;
w['handle_ruleset_unit'] = handle_ruleset_unit;
w['handle_web_ruleset_unit_addition'] = handle_web_ruleset_unit_addition;
w['handle_ruleset_tech'] = handle_ruleset_tech;
w['handle_ruleset_tech_class'] = handle_ruleset_tech_class;
w['handle_ruleset_tech_flag'] = handle_ruleset_tech_flag;
w['handle_ruleset_terrain_control'] = handle_ruleset_terrain_control;
w['handle_ruleset_building'] = handle_ruleset_building;
w['handle_ruleset_unit_class'] = handle_ruleset_unit_class;
w['handle_ruleset_disaster'] = handle_ruleset_disaster;
w['handle_ruleset_trade'] = handle_ruleset_trade;
w['handle_rulesets_ready'] = handle_rulesets_ready;
w['handle_ruleset_choices'] = handle_ruleset_choices;
w['handle_game_load'] = handle_game_load;
w['handle_ruleset_unit_flag'] = handle_ruleset_unit_flag;
w['handle_ruleset_unit_class_flag'] = handle_ruleset_unit_class_flag;
w['handle_ruleset_unit_bonus'] = handle_ruleset_unit_bonus;
w['handle_ruleset_terrain_flag'] = handle_ruleset_terrain_flag;
w['handle_ruleset_impr_flag'] = handle_ruleset_impr_flag;
w['handle_ruleset_government_ruler_title'] = handle_ruleset_government_ruler_title;
w['handle_ruleset_base'] = handle_ruleset_base;
w['handle_ruleset_road'] = handle_ruleset_road;
w['handle_ruleset_action_enabler'] = handle_ruleset_action_enabler;
w['handle_ruleset_extra'] = handle_ruleset_extra;
w['handle_ruleset_counter'] = handle_ruleset_counter;
w['handle_ruleset_extra_flag'] = handle_ruleset_extra_flag;
w['handle_ruleset_nation_sets'] = handle_ruleset_nation_sets;
w['handle_ruleset_style'] = handle_ruleset_style;
w['handle_nation_availability'] = handle_nation_availability;
w['handle_ruleset_music'] = handle_ruleset_music;
w['handle_ruleset_multiplier'] = handle_ruleset_multiplier;
w['handle_ruleset_action_auto'] = handle_ruleset_action_auto;
w['handle_ruleset_achievement'] = handle_ruleset_achievement;
w['handle_achievement_info'] = handle_achievement_info;
w['handle_team_name_info'] = handle_team_name_info;
w['handle_popup_image'] = handle_popup_image;
w['handle_worker_task'] = handle_worker_task;
w['handle_play_music'] = handle_play_music;
w['handle_ruleset_control'] = handle_ruleset_control;
w['handle_game_info'] = handle_game_info;
w['handle_calendar_info'] = handle_calendar_info;
w['handle_spaceship_info'] = handle_spaceship_info;
w['handle_new_year'] = handle_new_year;
w['handle_timeout_info'] = handle_timeout_info;
w['handle_trade_route_info'] = handle_trade_route_info;
w['handle_endgame_player'] = handle_endgame_player;
w['handle_unknown_research'] = handle_unknown_research;
w['handle_server_join_reply'] = handle_server_join_reply;
w['handle_conn_info'] = handle_conn_info;
w['handle_authentication_req'] = handle_authentication_req;
w['handle_server_shutdown'] = handle_server_shutdown;
w['handle_server_info'] = handle_server_info;
w['handle_conn_ping'] = handle_conn_ping;
w['handle_conn_ping_info'] = handle_conn_ping_info;
w['handle_connect_msg'] = handle_connect_msg;
w['handle_set_topology'] = handle_set_topology;
w['handle_server_setting_const'] = handle_server_setting_const;
w['handle_server_setting_int'] = handle_server_setting_int;
w['handle_server_setting_enum'] = handle_server_setting_enum;
w['handle_server_setting_bitwise'] = handle_server_setting_bitwise;
w['handle_server_setting_bool'] = handle_server_setting_bool;
w['handle_server_setting_str'] = handle_server_setting_str;
w['handle_server_setting_control'] = handle_server_setting_control;
w['handle_tile_info'] = handle_tile_info;
w['handle_map_info'] = handle_map_info;
w['handle_nuke_tile_info'] = handle_nuke_tile_info;
w['handle_city_info'] = handle_city_info;
w['handle_city_nationalities'] = handle_city_nationalities;
w['handle_city_rally_point'] = handle_city_rally_point;
w['handle_web_city_info_addition'] = handle_web_city_info_addition;
w['handle_city_short_info'] = handle_city_short_info;
w['handle_city_update_counters'] = handle_city_update_counters;
w['handle_city_update_counter'] = handle_city_update_counter;
w['handle_city_remove'] = handle_city_remove;
w['handle_city_name_suggestion_info'] = handle_city_name_suggestion_info;
w['handle_city_sabotage_list'] = handle_city_sabotage_list;
w['handle_player_info'] = handle_player_info;
w['handle_web_player_info_addition'] = handle_web_player_info_addition;
w['handle_player_remove'] = handle_player_remove;
w['handle_player_attribute_chunk'] = handle_player_attribute_chunk;
w['handle_player_diplstate'] = handle_player_diplstate;
w['handle_unit_remove'] = handle_unit_remove;
w['handle_unit_info'] = handle_unit_info;
w['handle_unit_short_info'] = handle_unit_short_info;
w['handle_unit_combat_info'] = handle_unit_combat_info;
w['handle_unit_action_answer'] = handle_unit_action_answer;
w['handle_unit_actions'] = handle_unit_actions;
w['handle_diplomacy_init_meeting'] = handle_diplomacy_init_meeting;
w['handle_diplomacy_cancel_meeting'] = handle_diplomacy_cancel_meeting;
w['handle_diplomacy_create_clause'] = handle_diplomacy_create_clause;
w['handle_diplomacy_remove_clause'] = handle_diplomacy_remove_clause;
w['handle_diplomacy_accept_treaty'] = handle_diplomacy_accept_treaty;
w['handle_chat_msg'] = handle_chat_msg;
w['handle_early_chat_msg'] = handle_early_chat_msg;
w['handle_page_msg'] = handle_page_msg;
w['handle_page_msg_part'] = handle_page_msg_part;
w['handle_begin_turn'] = handle_begin_turn;
w['handle_end_turn'] = handle_end_turn;
w['handle_start_phase'] = handle_start_phase;
w['handle_end_phase'] = handle_end_phase;
w['handle_research_info'] = handle_research_info;
w['handle_endgame_report'] = handle_endgame_report;
w['handle_scenario_info'] = handle_scenario_info;
w['handle_scenario_description'] = handle_scenario_description;
w['handle_single_want_hack_reply'] = handle_single_want_hack_reply;
w['handle_vote_new'] = handle_vote_new;
w['handle_vote_update'] = handle_vote_update;
w['handle_vote_remove'] = handle_vote_remove;
w['handle_vote_resolve'] = handle_vote_resolve;
w['handle_edit_startpos'] = handle_edit_startpos;
w['handle_edit_startpos_full'] = handle_edit_startpos_full;
w['handle_edit_object_created'] = handle_edit_object_created;
w['handle_web_goto_path'] = handle_web_goto_path;
w['action_decision_handle'] = action_decision_handle;
w['action_decision_maybe_auto'] = action_decision_maybe_auto;
w['update_client_state'] = update_client_state;
w['recreate_old_tech_req'] = recreate_old_tech_req;
w['packet_hand_table'] = packet_hand_table;
w['client_handle_packet'] = client_handle_packet;
w['register_packet_handler'] = register_packet_handler;
w['find_conn_by_id'] = find_conn_by_id;
w['client_remove_cli_conn'] = client_remove_cli_conn;
w['conn_list_append'] = conn_list_append;

// --- renderer ---
import {
  action_button_pressed,
  city_action_button_pressed,
  city_mapview_mouse_click,
  handle_web_info_text_message,
  map_select_active,
  map_select_check,
  map_select_check_started,
  map_select_setting_enabled,
  map_select_units,
  map_select_x,
  map_select_y,
  mapctrl_init_2d,
  mapview_mouse_click,
  mapview_mouse_down,
  mapview_touch_end,
  mapview_touch_move,
  mapview_touch_start,
  mouse_touch_started_on_unit,
  mouse_x,
  mouse_y,
  recenter_button_pressed,
  touch_start_x,
  touch_start_y,
} from './renderer/mapctrl';
w['mapctrl_init_2d'] = mapctrl_init_2d;
w['mapview_mouse_click'] = mapview_mouse_click;
w['mapview_mouse_down'] = mapview_mouse_down;
w['mapview_touch_start'] = mapview_touch_start;
w['mapview_touch_end'] = mapview_touch_end;
w['mapview_touch_move'] = mapview_touch_move;
w['city_mapview_mouse_click'] = city_mapview_mouse_click;
w['action_button_pressed'] = action_button_pressed;
w['city_action_button_pressed'] = city_action_button_pressed;
w['map_select_units'] = map_select_units;
w['recenter_button_pressed'] = recenter_button_pressed;
w['handle_web_info_text_message'] = handle_web_info_text_message;
w['mouse_x'] = mouse_x;
w['mouse_y'] = mouse_y;
w['touch_start_x'] = touch_start_x;
w['touch_start_y'] = touch_start_y;
w['map_select_setting_enabled'] = map_select_setting_enabled;
w['map_select_check'] = map_select_check;
w['map_select_check_started'] = map_select_check_started;
w['map_select_active'] = map_select_active;
w['map_select_x'] = map_select_x;
w['map_select_y'] = map_select_y;
w['mouse_touch_started_on_unit'] = mouse_touch_started_on_unit;

import {
  canvas_put_rectangle,
  canvas_put_select_rectangle,
  drawPath,
  enable_mapview_slide,
  init_cache_sprites,
  init_mapview,
  init_sprites,
  is_small_screen,
  mapview_put_border_line,
  mapview_put_city_bar,
  mapview_put_goto_line,
  mapview_put_tile,
  mapview_put_tile_label,
  mapview_window_resized,
  preload_check,
  set_city_mapview_active,
  set_default_mapview_inactive,
} from './renderer/mapview';
w['init_mapview'] = init_mapview;
w['is_small_screen'] = is_small_screen;
w['init_sprites'] = init_sprites;
w['preload_check'] = preload_check;
w['init_cache_sprites'] = init_cache_sprites;
w['mapview_window_resized'] = mapview_window_resized;
w['drawPath'] = drawPath;
w['mapview_put_tile'] = mapview_put_tile;
w['canvas_put_rectangle'] = canvas_put_rectangle;
w['canvas_put_select_rectangle'] = canvas_put_select_rectangle;
w['mapview_put_city_bar'] = mapview_put_city_bar;
w['mapview_put_tile_label'] = mapview_put_tile_label;
w['mapview_put_border_line'] = mapview_put_border_line;
w['mapview_put_goto_line'] = mapview_put_goto_line;
w['set_city_mapview_active'] = set_city_mapview_active;
w['set_default_mapview_inactive'] = set_default_mapview_inactive;
w['enable_mapview_slide'] = enable_mapview_slide;

import {
  DIRTY_FULL_THRESHOLD,
  MAPVIEW_REFRESH_INTERVAL,
  base_canvas_to_map_pos,
  base_set_mapview_origin,
  canvas_pos_to_tile,
  center_tile_id,
  center_tile_mapcanvas_2d,
  clear_dirty,
  dirty_all,
  dirty_count,
  dirty_tiles,
  gui_to_map_pos,
  last_redraw_time,
  map_to_gui_pos,
  map_to_gui_vector,
  mapdeco_crosshair_table,
  mapdeco_highlight_table,
  mapdeco_init,
  mapview,
  mapview_slide,
  mark_all_dirty,
  mark_tile_dirty,
  normalize_gui_pos,
  put_drawn_sprites,
  put_one_element,
  put_one_tile,
  set_mapview_origin,
  update_map_canvas,
  update_map_canvas_check,
  update_map_canvas_dirty,
  update_map_canvas_full,
  update_map_slide,
} from './renderer/mapviewCommon';
w['mark_tile_dirty'] = mark_tile_dirty;
w['mark_all_dirty'] = mark_all_dirty;
w['clear_dirty'] = clear_dirty;
w['mapdeco_init'] = mapdeco_init;
w['center_tile_mapcanvas_2d'] = center_tile_mapcanvas_2d;
w['center_tile_id'] = center_tile_id;
w['map_to_gui_vector'] = map_to_gui_vector;
w['set_mapview_origin'] = set_mapview_origin;
w['base_set_mapview_origin'] = base_set_mapview_origin;
w['normalize_gui_pos'] = normalize_gui_pos;
w['gui_to_map_pos'] = gui_to_map_pos;
w['map_to_gui_pos'] = map_to_gui_pos;
w['update_map_canvas'] = update_map_canvas;
w['put_one_tile'] = put_one_tile;
w['put_one_element'] = put_one_element;
w['put_drawn_sprites'] = put_drawn_sprites;
w['base_canvas_to_map_pos'] = base_canvas_to_map_pos;
w['canvas_pos_to_tile'] = canvas_pos_to_tile;
w['update_map_canvas_full'] = update_map_canvas_full;
w['update_map_canvas_dirty'] = update_map_canvas_dirty;
w['update_map_canvas_check'] = update_map_canvas_check;
w['update_map_slide'] = update_map_slide;
w['mapview'] = mapview;
w['mapdeco_highlight_table'] = mapdeco_highlight_table;
w['mapdeco_crosshair_table'] = mapdeco_crosshair_table;
w['last_redraw_time'] = last_redraw_time;
w['MAPVIEW_REFRESH_INTERVAL'] = MAPVIEW_REFRESH_INTERVAL;
w['dirty_tiles'] = dirty_tiles;
w['dirty_all'] = dirty_all;
w['dirty_count'] = dirty_count;
w['DIRTY_FULL_THRESHOLD'] = DIRTY_FULL_THRESHOLD;
w['mapview_slide'] = mapview_slide;

import {
  cellgroup_map,
  city_flag_offset_x,
  city_flag_offset_y,
  city_size_offset_x,
  city_size_offset_y,
  citybar_offset_x,
  citybar_offset_y,
  darkness_style,
  dither_offset_x,
  dither_offset_y,
  fogstyle,
  is_full_citybar,
  is_hex,
  is_isometric,
  is_mountainous,
  normal_tile_height,
  normal_tile_width,
  priority,
  roadstyle,
  small_tile_height,
  small_tile_width,
  tile_types_setup,
  tilelabel_offset_x,
  tilelabel_offset_y,
  tileset_image_count,
  tileset_name,
  tileset_options,
  tileset_tile_height,
  tileset_tile_width,
  ts_layer,
  ts_tiles,
  unit_activity_offset_x,
  unit_activity_offset_y,
  unit_flag_offset_x,
  unit_flag_offset_y,
  unit_offset_x,
  unit_offset_y,
} from './renderer/tilesetConfig';
w['tileset_tile_width'] = tileset_tile_width;
w['tileset_tile_height'] = tileset_tile_height;
w['tileset_options'] = tileset_options;
w['tileset_name'] = tileset_name;
w['priority'] = priority;
w['tileset_image_count'] = tileset_image_count;
w['normal_tile_width'] = normal_tile_width;
w['normal_tile_height'] = normal_tile_height;
w['small_tile_width'] = small_tile_width;
w['small_tile_height'] = small_tile_height;
w['is_hex'] = is_hex;
w['is_isometric'] = is_isometric;
w['is_mountainous'] = is_mountainous;
w['roadstyle'] = roadstyle;
w['fogstyle'] = fogstyle;
w['darkness_style'] = darkness_style;
w['unit_flag_offset_x'] = unit_flag_offset_x;
w['unit_flag_offset_y'] = unit_flag_offset_y;
w['city_flag_offset_x'] = city_flag_offset_x;
w['city_flag_offset_y'] = city_flag_offset_y;
w['city_size_offset_x'] = city_size_offset_x;
w['city_size_offset_y'] = city_size_offset_y;
w['unit_activity_offset_x'] = unit_activity_offset_x;
w['unit_activity_offset_y'] = unit_activity_offset_y;
w['unit_offset_x'] = unit_offset_x;
w['unit_offset_y'] = unit_offset_y;
w['is_full_citybar'] = is_full_citybar;
w['citybar_offset_y'] = citybar_offset_y;
w['citybar_offset_x'] = citybar_offset_x;
w['tilelabel_offset_y'] = tilelabel_offset_y;
w['tilelabel_offset_x'] = tilelabel_offset_x;
w['dither_offset_x'] = dither_offset_x;
w['dither_offset_y'] = dither_offset_y;
w['ts_layer'] = ts_layer;
w['ts_tiles'] = ts_tiles;
w['tile_types_setup'] = tile_types_setup;
w['cellgroup_map'] = cellgroup_map;

import {
  CELL_CORNER,
  CELL_WHOLE,
  DARKNESS_CARD_FULL,
  DARKNESS_CARD_SINGLE,
  DARKNESS_CORNER,
  DARKNESS_ISORECT,
  DARKNESS_NONE,
  EDGE_COUNT,
  EDGE_LR,
  EDGE_NS,
  EDGE_UD,
  EDGE_WE,
  LAYER_CITY1,
  LAYER_CITYBAR,
  LAYER_COUNT,
  LAYER_FOG,
  LAYER_GOTO,
  LAYER_ROADS,
  LAYER_SPECIAL1,
  LAYER_SPECIAL2,
  LAYER_SPECIAL3,
  LAYER_TERRAIN1,
  LAYER_TERRAIN2,
  LAYER_TERRAIN3,
  LAYER_TILELABEL,
  LAYER_UNIT,
  MATCH_FULL,
  MATCH_NONE,
  MATCH_PAIR,
  MATCH_SAME,
  cardinal_index_str,
  check_sprite_type,
  dir_get_tileset_name,
  explosion_anim_map,
  fill_fog_sprite_array,
  fill_goto_line_sprite_array,
  fill_path_sprite_array,
  fill_sprite_array,
  fill_terrain_sprite_array,
  fill_terrain_sprite_layer,
  fill_unit_sprite_array,
  get_base_flag_sprite,
  get_border_line_sprites,
  get_city_flag_sprite,
  get_city_food_output_sprite,
  get_city_info_text,
  get_city_invalid_worked_sprite,
  get_city_occupied_sprite,
  get_city_shields_output_sprite,
  get_city_sprite,
  get_city_trade_output_sprite,
  get_improvement_image_sprite,
  get_nation_flag_sprite,
  get_select_sprite,
  get_specialist_image_sprite,
  get_technology_image_sprite,
  get_tile_label_text,
  get_tile_river_sprite,
  get_tile_specials_sprite,
  get_treaty_agree_thumb_up,
  get_treaty_disagree_thumb_down,
  get_unit_activity_sprite,
  get_unit_agent_sprite,
  get_unit_hp_sprite,
  get_unit_image_sprite,
  get_unit_nation_flag_normal_sprite,
  get_unit_nation_flag_sprite,
  get_unit_stack_sprite,
  get_unit_type_image_sprite,
  get_unit_veteran_sprite,
  tileset_building_graphic_tag,
  tileset_extra_activity_graphic_tag,
  tileset_extra_graphic_tag,
  tileset_extra_id_activity_graphic_tag,
  tileset_extra_id_graphic_tag,
  tileset_extra_id_rmactivity_graphic_tag,
  tileset_extra_rmactivity_graphic_tag,
  tileset_has_tag,
  tileset_ruleset_entity_tag_str_or_alt,
  tileset_tech_graphic_tag,
  tileset_unit_graphic_tag,
  tileset_unit_type_graphic_tag,
} from './renderer/tilespec';
w['tileset_has_tag'] = tileset_has_tag;
w['tileset_ruleset_entity_tag_str_or_alt'] = tileset_ruleset_entity_tag_str_or_alt;
w['tileset_extra_graphic_tag'] = tileset_extra_graphic_tag;
w['tileset_unit_type_graphic_tag'] = tileset_unit_type_graphic_tag;
w['tileset_unit_graphic_tag'] = tileset_unit_graphic_tag;
w['tileset_building_graphic_tag'] = tileset_building_graphic_tag;
w['tileset_tech_graphic_tag'] = tileset_tech_graphic_tag;
w['tileset_extra_id_graphic_tag'] = tileset_extra_id_graphic_tag;
w['tileset_extra_activity_graphic_tag'] = tileset_extra_activity_graphic_tag;
w['tileset_extra_id_activity_graphic_tag'] = tileset_extra_id_activity_graphic_tag;
w['tileset_extra_rmactivity_graphic_tag'] = tileset_extra_rmactivity_graphic_tag;
w['tileset_extra_id_rmactivity_graphic_tag'] = tileset_extra_id_rmactivity_graphic_tag;
w['fill_sprite_array'] = fill_sprite_array;
w['fill_terrain_sprite_layer'] = fill_terrain_sprite_layer;
w['fill_terrain_sprite_array'] = fill_terrain_sprite_array;
w['check_sprite_type'] = check_sprite_type;
w['fill_unit_sprite_array'] = fill_unit_sprite_array;
w['dir_get_tileset_name'] = dir_get_tileset_name;
w['cardinal_index_str'] = cardinal_index_str;
w['get_city_flag_sprite'] = get_city_flag_sprite;
w['get_base_flag_sprite'] = get_base_flag_sprite;
w['get_city_occupied_sprite'] = get_city_occupied_sprite;
w['get_city_food_output_sprite'] = get_city_food_output_sprite;
w['get_city_shields_output_sprite'] = get_city_shields_output_sprite;
w['get_city_trade_output_sprite'] = get_city_trade_output_sprite;
w['get_city_invalid_worked_sprite'] = get_city_invalid_worked_sprite;
w['fill_goto_line_sprite_array'] = fill_goto_line_sprite_array;
w['get_border_line_sprites'] = get_border_line_sprites;
w['get_unit_nation_flag_sprite'] = get_unit_nation_flag_sprite;
w['get_unit_nation_flag_normal_sprite'] = get_unit_nation_flag_normal_sprite;
w['get_unit_stack_sprite'] = get_unit_stack_sprite;
w['get_unit_hp_sprite'] = get_unit_hp_sprite;
w['get_unit_veteran_sprite'] = get_unit_veteran_sprite;
w['get_unit_activity_sprite'] = get_unit_activity_sprite;
w['get_unit_agent_sprite'] = get_unit_agent_sprite;
w['get_city_sprite'] = get_city_sprite;
w['fill_fog_sprite_array'] = fill_fog_sprite_array;
w['get_select_sprite'] = get_select_sprite;
w['get_city_info_text'] = get_city_info_text;
w['get_tile_label_text'] = get_tile_label_text;
w['get_tile_specials_sprite'] = get_tile_specials_sprite;
w['get_tile_river_sprite'] = get_tile_river_sprite;
w['get_unit_image_sprite'] = get_unit_image_sprite;
w['get_unit_type_image_sprite'] = get_unit_type_image_sprite;
w['get_improvement_image_sprite'] = get_improvement_image_sprite;
w['get_specialist_image_sprite'] = get_specialist_image_sprite;
w['get_technology_image_sprite'] = get_technology_image_sprite;
w['get_nation_flag_sprite'] = get_nation_flag_sprite;
w['get_treaty_agree_thumb_up'] = get_treaty_agree_thumb_up;
w['get_treaty_disagree_thumb_down'] = get_treaty_disagree_thumb_down;
w['fill_path_sprite_array'] = fill_path_sprite_array;
w['explosion_anim_map'] = explosion_anim_map;
w['LAYER_TERRAIN1'] = LAYER_TERRAIN1;
w['LAYER_TERRAIN2'] = LAYER_TERRAIN2;
w['LAYER_TERRAIN3'] = LAYER_TERRAIN3;
w['LAYER_ROADS'] = LAYER_ROADS;
w['LAYER_SPECIAL1'] = LAYER_SPECIAL1;
w['LAYER_CITY1'] = LAYER_CITY1;
w['LAYER_SPECIAL2'] = LAYER_SPECIAL2;
w['LAYER_UNIT'] = LAYER_UNIT;
w['LAYER_FOG'] = LAYER_FOG;
w['LAYER_SPECIAL3'] = LAYER_SPECIAL3;
w['LAYER_TILELABEL'] = LAYER_TILELABEL;
w['LAYER_CITYBAR'] = LAYER_CITYBAR;
w['LAYER_GOTO'] = LAYER_GOTO;
w['LAYER_COUNT'] = LAYER_COUNT;
w['EDGE_NS'] = EDGE_NS;
w['EDGE_WE'] = EDGE_WE;
w['EDGE_UD'] = EDGE_UD;
w['EDGE_LR'] = EDGE_LR;
w['EDGE_COUNT'] = EDGE_COUNT;
w['MATCH_NONE'] = MATCH_NONE;
w['MATCH_SAME'] = MATCH_SAME;
w['MATCH_PAIR'] = MATCH_PAIR;
w['MATCH_FULL'] = MATCH_FULL;
w['CELL_WHOLE'] = CELL_WHOLE;
w['CELL_CORNER'] = CELL_CORNER;
w['DARKNESS_NONE'] = DARKNESS_NONE;
w['DARKNESS_ISORECT'] = DARKNESS_ISORECT;
w['DARKNESS_CARD_SINGLE'] = DARKNESS_CARD_SINGLE;
w['DARKNESS_CARD_FULL'] = DARKNESS_CARD_FULL;
w['DARKNESS_CORNER'] = DARKNESS_CORNER;

// --- ui ---
import { exposeGameDialog } from './ui/GameDialog';
w['exposeGameDialog'] = exposeGameDialog;

import {
  act_sel_click_function,
  act_sel_queue_done,
  act_sel_queue_may_be_done,
  action_prob_not_impl,
  action_selection_actor_unit,
  action_selection_close,
  action_selection_refresh,
  action_selection_target_city,
  action_selection_target_extra,
  action_selection_target_tile,
  action_selection_target_unit,
  create_act_sel_button,
  create_sabotage_impr_button,
  create_select_tgt_extra_button,
  create_select_tgt_unit_button,
  create_steal_tech_button,
  format_act_prob_part,
  format_action_label,
  format_action_probability,
  format_action_tooltip,
  list_potential_target_extras,
  popup_action_selection,
  popup_bribe_dialog,
  popup_incite_dialog,
  popup_sabotage_dialog,
  popup_steal_tech_selection_dialog,
  popup_unit_upgrade_dlg,
  select_tgt_extra,
  select_tgt_unit,
} from './ui/actionDialog';
w['act_sel_queue_may_be_done'] = act_sel_queue_may_be_done;
w['act_sel_queue_done'] = act_sel_queue_done;
w['action_prob_not_impl'] = action_prob_not_impl;
w['format_act_prob_part'] = format_act_prob_part;
w['format_action_probability'] = format_action_probability;
w['format_action_label'] = format_action_label;
w['format_action_tooltip'] = format_action_tooltip;
w['act_sel_click_function'] = act_sel_click_function;
w['create_act_sel_button'] = create_act_sel_button;
w['popup_action_selection'] = popup_action_selection;
w['popup_bribe_dialog'] = popup_bribe_dialog;
w['popup_incite_dialog'] = popup_incite_dialog;
w['popup_unit_upgrade_dlg'] = popup_unit_upgrade_dlg;
w['create_steal_tech_button'] = create_steal_tech_button;
w['popup_steal_tech_selection_dialog'] = popup_steal_tech_selection_dialog;
w['create_sabotage_impr_button'] = create_sabotage_impr_button;
w['popup_sabotage_dialog'] = popup_sabotage_dialog;
w['create_select_tgt_unit_button'] = create_select_tgt_unit_button;
w['select_tgt_unit'] = select_tgt_unit;
w['list_potential_target_extras'] = list_potential_target_extras;
w['create_select_tgt_extra_button'] = create_select_tgt_extra_button;
w['select_tgt_extra'] = select_tgt_extra;
w['action_selection_actor_unit'] = action_selection_actor_unit;
w['action_selection_target_city'] = action_selection_target_city;
w['action_selection_target_unit'] = action_selection_target_unit;
w['action_selection_target_tile'] = action_selection_target_tile;
w['action_selection_target_extra'] = action_selection_target_extra;
w['action_selection_refresh'] = action_selection_refresh;
w['action_selection_close'] = action_selection_close;

import {
  CITYO_DISBAND,
  CITYO_LAST,
  CITYO_NEW_EINSTEIN,
  CITYO_NEW_TAXMAN,
  FEELING_BASE,
  FEELING_EFFECT,
  FEELING_FINAL,
  FEELING_LUXURY,
  FEELING_MARTIAL,
  FEELING_NATIONALITY,
  INCITE_IMPOSSIBLE_COST,
  MAX_LEN_WORKLIST,
  active_city,
  cities,
  city_add_to_worklist,
  city_change_production,
  city_change_specialist,
  city_dialog_close_handler,
  city_exchange_worklist_task,
  city_insert_in_worklist,
  city_keyboard_listener,
  city_name_dialog,
  city_prod_clicks,
  city_rules,
  city_screen_updater,
  city_sell_improvement,
  city_tab_index,
  city_tile_map,
  city_trade_routes,
  city_worklist_dialog,
  city_worklist_task_down,
  city_worklist_task_remove,
  city_worklist_task_up,
  citydlg_map_height,
  citydlg_map_width,
  close_city_dialog,
  do_city_map_click,
  extract_universal,
  find_universal_in_worklist,
  get_city_state,
  goods,
  handle_current_worklist_click,
  handle_current_worklist_direct_remove,
  handle_current_worklist_select,
  handle_current_worklist_unselect,
  handle_worklist_select,
  handle_worklist_unselect,
  next_city,
  opt_show_unreachable_items,
  populate_worklist_production_choices,
  previous_city,
  production_selection,
  rename_city,
  request_city_buy,
  send_city_buy,
  send_city_change,
  send_city_worklist,
  send_city_worklist_add,
  set_citydlg_dimensions,
  show_city_dialog,
  show_city_dialog_by_id,
  update_city_screen,
  update_worklist_actions,
  worklist_dialog_active,
  worklist_selection,
} from './ui/cityDialog';
w['show_city_dialog_by_id'] = show_city_dialog_by_id;
w['show_city_dialog'] = show_city_dialog;
w['request_city_buy'] = request_city_buy;
w['send_city_buy'] = send_city_buy;
w['send_city_change'] = send_city_change;
w['close_city_dialog'] = close_city_dialog;
w['city_dialog_close_handler'] = city_dialog_close_handler;
w['do_city_map_click'] = do_city_map_click;
w['city_name_dialog'] = city_name_dialog;
w['next_city'] = next_city;
w['previous_city'] = previous_city;
w['city_sell_improvement'] = city_sell_improvement;
w['city_change_specialist'] = city_change_specialist;
w['rename_city'] = rename_city;
w['city_worklist_dialog'] = city_worklist_dialog;
w['populate_worklist_production_choices'] = populate_worklist_production_choices;
w['extract_universal'] = extract_universal;
w['find_universal_in_worklist'] = find_universal_in_worklist;
w['handle_worklist_select'] = handle_worklist_select;
w['handle_worklist_unselect'] = handle_worklist_unselect;
w['handle_current_worklist_select'] = handle_current_worklist_select;
w['handle_current_worklist_unselect'] = handle_current_worklist_unselect;
w['handle_current_worklist_click'] = handle_current_worklist_click;
w['update_worklist_actions'] = update_worklist_actions;
w['send_city_worklist'] = send_city_worklist;
w['send_city_worklist_add'] = send_city_worklist_add;
w['city_change_production'] = city_change_production;
w['city_add_to_worklist'] = city_add_to_worklist;
w['handle_current_worklist_direct_remove'] = handle_current_worklist_direct_remove;
w['city_insert_in_worklist'] = city_insert_in_worklist;
w['city_worklist_task_up'] = city_worklist_task_up;
w['city_worklist_task_down'] = city_worklist_task_down;
w['city_exchange_worklist_task'] = city_exchange_worklist_task;
w['city_worklist_task_remove'] = city_worklist_task_remove;
w['update_city_screen'] = update_city_screen;
w['get_city_state'] = get_city_state;
w['city_keyboard_listener'] = city_keyboard_listener;
w['set_citydlg_dimensions'] = set_citydlg_dimensions;
w['citydlg_map_width'] = citydlg_map_width;
w['citydlg_map_height'] = citydlg_map_height;
w['cities'] = cities;
w['city_rules'] = city_rules;
w['city_trade_routes'] = city_trade_routes;
w['goods'] = goods;
w['active_city'] = active_city;
w['worklist_dialog_active'] = worklist_dialog_active;
w['production_selection'] = production_selection;
w['worklist_selection'] = worklist_selection;
w['CITYO_DISBAND'] = CITYO_DISBAND;
w['CITYO_NEW_EINSTEIN'] = CITYO_NEW_EINSTEIN;
w['CITYO_NEW_TAXMAN'] = CITYO_NEW_TAXMAN;
w['CITYO_LAST'] = CITYO_LAST;
w['FEELING_BASE'] = FEELING_BASE;
w['FEELING_LUXURY'] = FEELING_LUXURY;
w['FEELING_EFFECT'] = FEELING_EFFECT;
w['FEELING_NATIONALITY'] = FEELING_NATIONALITY;
w['FEELING_MARTIAL'] = FEELING_MARTIAL;
w['FEELING_FINAL'] = FEELING_FINAL;
w['MAX_LEN_WORKLIST'] = MAX_LEN_WORKLIST;
w['INCITE_IMPOSSIBLE_COST'] = INCITE_IMPOSSIBLE_COST;
w['city_tab_index'] = city_tab_index;
w['city_prod_clicks'] = city_prod_clicks;
w['city_screen_updater'] = city_screen_updater;
w['city_tile_map'] = city_tile_map;
w['opt_show_unreachable_items'] = opt_show_unreachable_items;

import {
  _cma_allow_disorder,
  _cma_allow_specialists,
  _cma_celebrate,
  _cma_happy_slider,
  _cma_max_growth,
  _cma_min_sliders,
  _cma_val_sliders,
  button_pushed_toggle_cma,
  request_new_cma,
  show_city_governor_tab,
} from './ui/cma';
w['show_city_governor_tab'] = show_city_governor_tab;
w['request_new_cma'] = request_new_cma;
w['button_pushed_toggle_cma'] = button_pushed_toggle_cma;
w['_cma_val_sliders'] = _cma_val_sliders;
w['_cma_min_sliders'] = _cma_min_sliders;
w['_cma_happy_slider'] = _cma_happy_slider;
w['_cma_celebrate'] = _cma_celebrate;
w['_cma_allow_disorder'] = _cma_allow_disorder;
w['_cma_max_growth'] = _cma_max_growth;
w['_cma_allow_specialists'] = _cma_allow_specialists;

import { initControls } from './ui/controls';
w['initControls'] = initControls;

import {
  CLAUSE_ADVANCE,
  CLAUSE_ALLIANCE,
  CLAUSE_CEASEFIRE,
  CLAUSE_CITY,
  CLAUSE_EMBASSY,
  CLAUSE_GOLD,
  CLAUSE_MAP,
  CLAUSE_PEACE,
  CLAUSE_SEAMAP,
  CLAUSE_SHARED_TILES,
  CLAUSE_VISION,
  SPECENUM_COUNT,
  accept_treaty,
  accept_treaty_req,
  cancel_meeting,
  cancel_meeting_req,
  clause_infos,
  cleanup_diplomacy_dialog,
  client_diplomacy_clause_string,
  create_clause_req,
  create_clauses_menu,
  create_diplomacy_dialog,
  diplomacy_cancel_treaty,
  diplomacy_clause_map,
  diplomacy_init_meeting_req,
  discard_diplomacy_dialogs,
  meeting_gold_change_req,
  meeting_paint_custom_flag,
  meeting_template_data,
  remove_clause,
  remove_clause_req,
  show_diplomacy_clauses,
  show_diplomacy_dialog,
} from './ui/diplomacy';
w['diplomacy_init_meeting_req'] = diplomacy_init_meeting_req;
w['show_diplomacy_dialog'] = show_diplomacy_dialog;
w['accept_treaty_req'] = accept_treaty_req;
w['accept_treaty'] = accept_treaty;
w['cancel_meeting_req'] = cancel_meeting_req;
w['create_clause_req'] = create_clause_req;
w['cancel_meeting'] = cancel_meeting;
w['cleanup_diplomacy_dialog'] = cleanup_diplomacy_dialog;
w['discard_diplomacy_dialogs'] = discard_diplomacy_dialogs;
w['show_diplomacy_clauses'] = show_diplomacy_clauses;
w['remove_clause_req'] = remove_clause_req;
w['remove_clause'] = remove_clause;
w['client_diplomacy_clause_string'] = client_diplomacy_clause_string;
w['diplomacy_cancel_treaty'] = diplomacy_cancel_treaty;
w['create_diplomacy_dialog'] = create_diplomacy_dialog;
w['meeting_paint_custom_flag'] = meeting_paint_custom_flag;
w['create_clauses_menu'] = create_clauses_menu;
w['meeting_gold_change_req'] = meeting_gold_change_req;
w['meeting_template_data'] = meeting_template_data;
w['CLAUSE_ADVANCE'] = CLAUSE_ADVANCE;
w['CLAUSE_GOLD'] = CLAUSE_GOLD;
w['CLAUSE_MAP'] = CLAUSE_MAP;
w['CLAUSE_SEAMAP'] = CLAUSE_SEAMAP;
w['CLAUSE_CITY'] = CLAUSE_CITY;
w['CLAUSE_CEASEFIRE'] = CLAUSE_CEASEFIRE;
w['CLAUSE_PEACE'] = CLAUSE_PEACE;
w['CLAUSE_ALLIANCE'] = CLAUSE_ALLIANCE;
w['CLAUSE_VISION'] = CLAUSE_VISION;
w['CLAUSE_EMBASSY'] = CLAUSE_EMBASSY;
w['CLAUSE_SHARED_TILES'] = CLAUSE_SHARED_TILES;
w['SPECENUM_COUNT'] = SPECENUM_COUNT;
w['clause_infos'] = clause_infos;
w['diplomacy_clause_map'] = diplomacy_clause_map;

import {
  REPORT_ACHIEVEMENTS,
  REPORT_DEMOGRAPHIC,
  REPORT_TOP_CITIES,
  REPORT_WONDERS_OF_THE_WORLD,
  REPORT_WONDERS_OF_THE_WORLD_LONG,
  governments,
  init_civ_dialog,
  request_report,
  requested_gov,
  send_player_change_government,
  set_req_government,
  show_revolution_dialog,
  start_revolution,
  update_govt_dialog,
} from './ui/governmentDialog';
w['show_revolution_dialog'] = show_revolution_dialog;
w['init_civ_dialog'] = init_civ_dialog;
w['update_govt_dialog'] = update_govt_dialog;
w['start_revolution'] = start_revolution;
w['set_req_government'] = set_req_government;
w['send_player_change_government'] = send_player_change_government;
w['request_report'] = request_report;
w['governments'] = governments;
w['requested_gov'] = requested_gov;
w['REPORT_WONDERS_OF_THE_WORLD'] = REPORT_WONDERS_OF_THE_WORLD;
w['REPORT_WONDERS_OF_THE_WORLD_LONG'] = REPORT_WONDERS_OF_THE_WORLD_LONG;
w['REPORT_TOP_CITIES'] = REPORT_TOP_CITIES;
w['REPORT_DEMOGRAPHIC'] = REPORT_DEMOGRAPHIC;
w['REPORT_ACHIEVEMENTS'] = REPORT_ACHIEVEMENTS;


import {
  find_parent_help_key,
  generate_help_menu,
  generate_help_text,
  generate_help_toplevel,
  handle_help_menu_select,
  helpdata_format_current_ruleset,
  helpdata_tag_to_title,
  hidden_menu_items,
  render_sprite,
  show_help,
  show_help_intro,
  toplevel_menu_items,
  wiki_on_item_button,
} from './ui/helpdata';
w['show_help'] = show_help;
w['show_help_intro'] = show_help_intro;
w['generate_help_menu'] = generate_help_menu;
w['render_sprite'] = render_sprite;
w['generate_help_toplevel'] = generate_help_toplevel;
w['find_parent_help_key'] = find_parent_help_key;
w['handle_help_menu_select'] = handle_help_menu_select;
w['wiki_on_item_button'] = wiki_on_item_button;
w['helpdata_format_current_ruleset'] = helpdata_format_current_ruleset;
w['generate_help_text'] = generate_help_text;
w['helpdata_tag_to_title'] = helpdata_tag_to_title;
w['toplevel_menu_items'] = toplevel_menu_items;
w['hidden_menu_items'] = hidden_menu_items;


import { show_intelligence_report_dialog, show_intelligence_report_embassy, show_intelligence_report_hearsay } from './ui/intelDialog';
w['show_intelligence_report_dialog'] = show_intelligence_report_dialog;
w['show_intelligence_report_hearsay'] = show_intelligence_report_hearsay;
w['show_intelligence_report_embassy'] = show_intelligence_report_embassy;


import {
  ai_manual_turn_done,
  ask_city_name,
  auto_center_each_turn,
  auto_center_on_combat,
  auto_center_on_unit,
  auto_turn_done,
  center_when_popup_city,
  concise_city_production,
  default_metaserver,
  default_server_host,
  default_server_port,
  default_sound_plugin_name,
  default_sound_set_name,
  default_theme_name,
  default_tileset_name,
  default_user_name,
  do_combat_animation,
  draw_borders,
  draw_cities,
  draw_city_buycost,
  draw_city_growth,
  draw_city_names,
  draw_city_outlines,
  draw_city_output,
  draw_city_productions,
  draw_city_traderoutes,
  draw_coastline,
  draw_focus_unit,
  draw_fog_of_war,
  draw_fortress_airbase,
  draw_full_citybar,
  draw_huts,
  draw_irrigation,
  draw_map_grid,
  draw_mines,
  draw_pollution,
  draw_resources,
  draw_roads_rails,
  draw_terrain,
  draw_unit_shields,
  draw_units,
  enable_cursor_changes,
  fullscreen_mode,
  goto_into_unknown,
  gui_gtk2_allied_chat_only,
  gui_gtk2_better_fog,
  gui_gtk2_dialogs_on_top,
  gui_gtk2_enable_tabs,
  gui_gtk2_map_scrollbars,
  gui_gtk2_metaserver_tab_first,
  gui_gtk2_new_messages_go_to_top,
  gui_gtk2_show_chat_message_time,
  gui_gtk2_show_message_window_buttons,
  gui_gtk2_show_task_icons,
  gui_gtk2_small_display_layout,
  gui_gtk2_split_bottom_notebook,
  highlight_our_names,
  init_options_dialog,
  keyboardless_goto,
  meta_accelerators,
  player_dlg_show_dead_players,
  popup_actor_arrival,
  popup_new_cities,
  reqtree_curved_lines,
  reqtree_show_icons,
  save_options_on_exit,
  separate_unit_selection,
  server_settings,
  smooth_center_slide_msec,
  smooth_move_unit_msec,
  solid_color_behind_units,
  sound_bell_at_new_turn,
  sounds_enabled,
  unit_selection_clears_orders,
  update_city_text_in_refresh_tile,
  wakeup_focus,
} from './ui/options';
w['init_options_dialog'] = init_options_dialog;
w['server_settings'] = server_settings;
w['default_user_name'] = default_user_name;
w['default_server_host'] = default_server_host;
w['default_server_port'] = default_server_port;
w['default_metaserver'] = default_metaserver;
w['default_theme_name'] = default_theme_name;
w['default_tileset_name'] = default_tileset_name;
w['default_sound_set_name'] = default_sound_set_name;
w['default_sound_plugin_name'] = default_sound_plugin_name;
w['sounds_enabled'] = sounds_enabled;
w['save_options_on_exit'] = save_options_on_exit;
w['fullscreen_mode'] = fullscreen_mode;
w['solid_color_behind_units'] = solid_color_behind_units;
w['sound_bell_at_new_turn'] = sound_bell_at_new_turn;
w['smooth_move_unit_msec'] = smooth_move_unit_msec;
w['smooth_center_slide_msec'] = smooth_center_slide_msec;
w['do_combat_animation'] = do_combat_animation;
w['ai_manual_turn_done'] = ai_manual_turn_done;
w['auto_center_on_unit'] = auto_center_on_unit;
w['auto_center_on_combat'] = auto_center_on_combat;
w['auto_center_each_turn'] = auto_center_each_turn;
w['wakeup_focus'] = wakeup_focus;
w['goto_into_unknown'] = goto_into_unknown;
w['center_when_popup_city'] = center_when_popup_city;
w['concise_city_production'] = concise_city_production;
w['auto_turn_done'] = auto_turn_done;
w['meta_accelerators'] = meta_accelerators;
w['ask_city_name'] = ask_city_name;
w['popup_new_cities'] = popup_new_cities;
w['popup_actor_arrival'] = popup_actor_arrival;
w['keyboardless_goto'] = keyboardless_goto;
w['enable_cursor_changes'] = enable_cursor_changes;
w['separate_unit_selection'] = separate_unit_selection;
w['unit_selection_clears_orders'] = unit_selection_clears_orders;
w['highlight_our_names'] = highlight_our_names;
w['update_city_text_in_refresh_tile'] = update_city_text_in_refresh_tile;
w['draw_city_outlines'] = draw_city_outlines;
w['draw_city_output'] = draw_city_output;
w['draw_map_grid'] = draw_map_grid;
w['draw_city_names'] = draw_city_names;
w['draw_city_growth'] = draw_city_growth;
w['draw_city_productions'] = draw_city_productions;
w['draw_city_buycost'] = draw_city_buycost;
w['draw_city_traderoutes'] = draw_city_traderoutes;
w['draw_terrain'] = draw_terrain;
w['draw_coastline'] = draw_coastline;
w['draw_roads_rails'] = draw_roads_rails;
w['draw_irrigation'] = draw_irrigation;
w['draw_mines'] = draw_mines;
w['draw_fortress_airbase'] = draw_fortress_airbase;
w['draw_huts'] = draw_huts;
w['draw_resources'] = draw_resources;
w['draw_pollution'] = draw_pollution;
w['draw_cities'] = draw_cities;
w['draw_units'] = draw_units;
w['draw_focus_unit'] = draw_focus_unit;
w['draw_fog_of_war'] = draw_fog_of_war;
w['draw_borders'] = draw_borders;
w['draw_full_citybar'] = draw_full_citybar;
w['draw_unit_shields'] = draw_unit_shields;
w['player_dlg_show_dead_players'] = player_dlg_show_dead_players;
w['reqtree_show_icons'] = reqtree_show_icons;
w['reqtree_curved_lines'] = reqtree_curved_lines;
w['gui_gtk2_map_scrollbars'] = gui_gtk2_map_scrollbars;
w['gui_gtk2_dialogs_on_top'] = gui_gtk2_dialogs_on_top;
w['gui_gtk2_show_task_icons'] = gui_gtk2_show_task_icons;
w['gui_gtk2_enable_tabs'] = gui_gtk2_enable_tabs;
w['gui_gtk2_better_fog'] = gui_gtk2_better_fog;
w['gui_gtk2_show_chat_message_time'] = gui_gtk2_show_chat_message_time;
w['gui_gtk2_split_bottom_notebook'] = gui_gtk2_split_bottom_notebook;
w['gui_gtk2_new_messages_go_to_top'] = gui_gtk2_new_messages_go_to_top;
w['gui_gtk2_show_message_window_buttons'] = gui_gtk2_show_message_window_buttons;
w['gui_gtk2_metaserver_tab_first'] = gui_gtk2_metaserver_tab_first;
w['gui_gtk2_allied_chat_only'] = gui_gtk2_allied_chat_only;
w['gui_gtk2_small_display_layout'] = gui_gtk2_small_display_layout;

import { pillage_target_selected, popup_pillage_selection_dialog } from './ui/pillageDialog';
w['popup_pillage_selection_dialog'] = popup_pillage_selection_dialog;
w['pillage_target_selected'] = pillage_target_selected;

import {
  create_rates_dialog,
  current_government,
  freeze,
  government_list,
  lux,
  maxrate,
  s_lux,
  s_sci,
  s_tax,
  sci,
  show_tax_rates_dialog,
  submit_player_rates,
  tax,
  update_lux_rates,
  update_net_bulbs,
  update_net_income,
  update_rates_dialog,
  update_rates_labels,
  update_sci_rates,
  update_tax_rates,
} from './ui/rates';
w['show_tax_rates_dialog'] = show_tax_rates_dialog;
w['update_rates_dialog'] = update_rates_dialog;
w['update_net_income'] = update_net_income;
w['update_net_bulbs'] = update_net_bulbs;
w['create_rates_dialog'] = create_rates_dialog;
w['update_rates_labels'] = update_rates_labels;
w['update_tax_rates'] = update_tax_rates;
w['update_lux_rates'] = update_lux_rates;
w['update_sci_rates'] = update_sci_rates;
w['submit_player_rates'] = submit_player_rates;
w['s_tax'] = s_tax;
w['s_lux'] = s_lux;
w['s_sci'] = s_sci;
w['tax'] = tax;
w['sci'] = sci;
w['lux'] = lux;
w['maxrate'] = maxrate;
w['freeze'] = freeze;
w['government_list'] = government_list;
w['current_government'] = current_government;



import {
  AR_ONE,
  AR_ROOT,
  AR_SIZE,
  AR_TWO,
  A_FIRST,
  A_FUTURE,
  A_LAST,
  A_LAST_REAL,
  A_NEVER,
  A_NONE,
  A_UNKNOWN,
  A_UNSET,
  MAX_NUM_ADVANCES,
  TECH_KNOWN,
  TECH_PREREQS_KNOWN,
  TECH_UNKNOWN,
  TF_BONUS_TECH,
  TF_BRIDGE,
  TF_BUILD_AIRBORNE,
  TF_FARMLAND,
  TF_LAST,
  TF_POPULATION_POLLUTION_INC,
  TF_RAILROAD,
  bulbs_output_updater,
  check_queued_tech_gained_dialog,
  clicked_tech_id,
  get_advances_text,
  get_tech_infobox_html,
  init_tech_screen,
  is_tech_tree_init,
  maxleft,
  queue_tech_gained_dialog,
  scroll_tech_tree,
  send_player_research,
  send_player_tech_goal,
  show_observer_tech_dialog,
  show_tech_gained_dialog,
  show_tech_info_dialog,
  show_wikipedia_dialog,
  tech_canvas,
  tech_canvas_ctx,
  tech_canvas_text_font,
  tech_dialog_active,
  tech_item_height,
  tech_item_width,
  tech_mapview_mouse_click,
  tech_xscale,
  techcoststyle1,
  techs,
  update_bulbs_output_info,
  update_tech_dialog_cursor,
  update_tech_screen,
  update_tech_tree,
  wikipedia_url,
} from './ui/techDialog';
w['init_tech_screen'] = init_tech_screen;
w['update_tech_tree'] = update_tech_tree;
w['update_tech_screen'] = update_tech_screen;
w['get_advances_text'] = get_advances_text;
w['scroll_tech_tree'] = scroll_tech_tree;
w['send_player_research'] = send_player_research;
w['send_player_tech_goal'] = send_player_tech_goal;
w['tech_mapview_mouse_click'] = tech_mapview_mouse_click;
w['get_tech_infobox_html'] = get_tech_infobox_html;
w['check_queued_tech_gained_dialog'] = check_queued_tech_gained_dialog;
w['queue_tech_gained_dialog'] = queue_tech_gained_dialog;
w['show_tech_gained_dialog'] = show_tech_gained_dialog;
w['show_wikipedia_dialog'] = show_wikipedia_dialog;
w['show_tech_info_dialog'] = show_tech_info_dialog;
w['update_tech_dialog_cursor'] = update_tech_dialog_cursor;
w['show_observer_tech_dialog'] = show_observer_tech_dialog;
w['update_bulbs_output_info'] = update_bulbs_output_info;
w['techs'] = techs;
w['techcoststyle1'] = techcoststyle1;
w['tech_canvas_text_font'] = tech_canvas_text_font;
w['is_tech_tree_init'] = is_tech_tree_init;
w['tech_dialog_active'] = tech_dialog_active;
w['tech_xscale'] = tech_xscale;
w['wikipedia_url'] = wikipedia_url;
w['TECH_UNKNOWN'] = TECH_UNKNOWN;
w['TECH_PREREQS_KNOWN'] = TECH_PREREQS_KNOWN;
w['TECH_KNOWN'] = TECH_KNOWN;
w['AR_ONE'] = AR_ONE;
w['AR_TWO'] = AR_TWO;
w['AR_ROOT'] = AR_ROOT;
w['AR_SIZE'] = AR_SIZE;
w['TF_BONUS_TECH'] = TF_BONUS_TECH;
w['TF_BRIDGE'] = TF_BRIDGE;
w['TF_RAILROAD'] = TF_RAILROAD;
w['TF_POPULATION_POLLUTION_INC'] = TF_POPULATION_POLLUTION_INC;
w['TF_FARMLAND'] = TF_FARMLAND;
w['TF_BUILD_AIRBORNE'] = TF_BUILD_AIRBORNE;
w['TF_LAST'] = TF_LAST;
w['A_NONE'] = A_NONE;
w['A_FIRST'] = A_FIRST;
w['MAX_NUM_ADVANCES'] = MAX_NUM_ADVANCES;
w['A_LAST'] = A_LAST;
w['A_FUTURE'] = A_FUTURE;
w['A_UNSET'] = A_UNSET;
w['A_UNKNOWN'] = A_UNKNOWN;
w['A_LAST_REAL'] = A_LAST_REAL;
w['A_NEVER'] = A_NEVER;
w['tech_canvas'] = tech_canvas;
w['tech_canvas_ctx'] = tech_canvas_ctx;
w['tech_item_width'] = tech_item_width;
w['tech_item_height'] = tech_item_height;
w['maxleft'] = maxleft;
w['clicked_tech_id'] = clicked_tech_id;
w['bulbs_output_updater'] = bulbs_output_updater;

// --- utils ---
import { banned_users, check_text_with_banlist, check_text_with_banlist_exact } from './utils/banlist';
w['check_text_with_banlist'] = check_text_with_banlist;
w['check_text_with_banlist_exact'] = check_text_with_banlist_exact;
w['banned_users'] = banned_users;

import { BitVector } from './utils/bitvector';
w['BitVector'] = BitVector;

import {
  DIVIDE,
  FC_WRAP,
  XOR,
  civclient_benchmark,
  clone,
  getRandomInt,
  getTilesetFileExtension,
  isRightMouseSelectionSupported,
  isSmallScreen,
  isTouchDevice,
  numberWithCommas,
  secondsToHumanTime,
  stringUnqualify,
  supportsMp3,
  toTitleCase,
} from './utils/helpers';
w['clone'] = clone;
w['DIVIDE'] = DIVIDE;
w['FC_WRAP'] = FC_WRAP;
w['XOR'] = XOR;
w['numberWithCommas'] = numberWithCommas;
w['to_title_case'] = toTitleCase;
w['toTitleCase'] = toTitleCase;
w['string_unqualify'] = stringUnqualify;
w['stringUnqualify'] = stringUnqualify;
w['seconds_to_human_time'] = secondsToHumanTime;
w['secondsToHumanTime'] = secondsToHumanTime;
w['get_random_int'] = getRandomInt;
w['getRandomInt'] = getRandomInt;
w['supports_mp3'] = supportsMp3;
w['supportsMp3'] = supportsMp3;
w['is_right_mouse_selection_supported'] = isRightMouseSelectionSupported;
w['isRightMouseSelectionSupported'] = isRightMouseSelectionSupported;
w['get_tileset_file_extention'] = getTilesetFileExtension;
w['getTilesetFileExtension'] = getTilesetFileExtension;
w['is_small_screen'] = isSmallScreen;
w['isSmallScreen'] = isSmallScreen;
w['is_touch_device'] = isTouchDevice;
w['isTouchDevice'] = isTouchDevice;
w['civclient_benchmark'] = civclient_benchmark;

import { orientation_changed } from './utils/mobile';
w['orientation_changed'] = orientation_changed;


import {
  delete_all_savegames,
  delete_savegame,
  game_loaded,
  loadTimerId,
  load_game_check,
  load_game_real,
  load_game_toggle,
  quicksave,
  save_game,
  saved_this_turn,
  scenario_activated,
  scenario_info,
  scenarios,
  set_metamessage_on_loaded_game,
  show_load_game_dialog,
  show_load_game_dialog_cb,
  show_scenario_dialog,
} from './utils/savegame';
w['save_game'] = save_game;
w['quicksave'] = quicksave;
w['show_load_game_dialog'] = show_load_game_dialog;
w['show_load_game_dialog_cb'] = show_load_game_dialog_cb;
w['delete_savegame'] = delete_savegame;
w['delete_all_savegames'] = delete_all_savegames;
w['load_game_check'] = load_game_check;
w['load_game_real'] = load_game_real;
w['set_metamessage_on_loaded_game'] = set_metamessage_on_loaded_game;
w['load_game_toggle'] = load_game_toggle;
w['show_scenario_dialog'] = show_scenario_dialog;
w['saved_this_turn'] = saved_this_turn;
w['game_loaded'] = game_loaded;
w['scenarios'] = scenarios;
w['scenario_info'] = scenario_info;
w['scenario_activated'] = scenario_activated;
w['loadTimerId'] = loadTimerId;

// Total: 1433 registrations
