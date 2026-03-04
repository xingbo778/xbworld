/**
 * Packet handler migrations from packhand.js — COMPLETE replacement.
 *
 * Phase 5: All 135 handle_* functions from packhand.js are now in TypeScript.
 * This file also contains the PacketRouter (packet_hand_table + client_handle_packet).
 *
 * Handler categories:
 *   - Pure data: simple assignment to globals, no side effects
 *   - With UI calls: calls update_*, show_*, swal, etc. via (window as any)
 *   - With jQuery: uses $() — replaced with native DOM
 *
 * Module-local state (previously in packhand.js):
 *   - terrain_control, roads[], bases[], page_msg{}
 */

import { exposeToLegacy } from '../bridge/legacy';

const w = window as any;

// ============================================================================
// Module-local state (was var in packhand.js)
// ============================================================================
let terrain_control: any = {};
let roads: any[] = [];
let bases: any[] = [];
let page_msg: any = {};

// Also expose these so legacy JS can access them
exposeToLegacy('terrain_control', terrain_control);

// Constants (were const in packhand.js)
const auto_attack_actions = [
  w.ACTION_ATTACK, w.ACTION_SUICIDE_ATTACK,
  w.ACTION_NUKE_UNITS, w.ACTION_NUKE_CITY, w.ACTION_NUKE
];
const REQEST_PLAYER_INITIATED = 0;
const REQEST_BACKGROUND_REFRESH = 1;
const REQEST_BACKGROUND_FAST_AUTO_ATTACK = 2;

// ============================================================================
// Batch 1: Freeze/thaw handlers
// ============================================================================

function handle_processing_started(_packet: any): void {
  w.client_frozen = true;
}

function handle_processing_finished(_packet: any): void {
  w.client_frozen = false;
}

function handle_investigate_started(_packet: any): void { /* no-op */ }
function handle_investigate_finished(_packet: any): void { /* no-op */ }

function handle_freeze_hint(_packet: any): void {
  w.client_frozen = true;
}

function handle_thaw_hint(_packet: any): void {
  w.client_frozen = false;
}

function handle_freeze_client(_packet: any): void {
  w.client_frozen = true;
}

function handle_thaw_client(_packet: any): void {
  w.client_frozen = false;
}

// ============================================================================
// Batch 2: Pure data assignment — ruleset handlers
// ============================================================================

function handle_ruleset_terrain(packet: any): void {
  if (packet['name'] === 'Lake') packet['graphic_str'] = packet['graphic_alt'];
  if (packet['name'] === 'Glacier') packet['graphic_str'] = 'tundra';
  w.terrains[packet['id']] = packet;
}

function handle_ruleset_resource(packet: any): void {
  w.resources[packet['id']] = packet;
}

function handle_ruleset_game(packet: any): void {
  w.game_rules = packet;
}

function handle_ruleset_specialist(packet: any): void {
  w.specialists[packet['id']] = packet;
}

function handle_ruleset_nation_groups(packet: any): void {
  w.nation_groups = packet['groups'];
}

function handle_ruleset_nation(packet: any): void {
  w.nations[packet['id']] = packet;
}

function handle_ruleset_city(packet: any): void {
  w.city_rules[packet['style_id']] = packet;
}

function handle_ruleset_government(packet: any): void {
  w.governments[packet['id']] = packet;
}

function handle_ruleset_summary(packet: any): void {
  w.ruleset_summary = packet['text'];
}

function handle_ruleset_description_part(packet: any): void {
  if (w.ruleset_description == null) {
    w.ruleset_description = packet['text'];
  } else {
    w.ruleset_description += packet['text'];
  }
}

function handle_ruleset_action(packet: any): void {
  w.actions[packet['id']] = packet;
  packet['enablers'] = [];
}

function handle_ruleset_goods(packet: any): void {
  w.goods[packet['id']] = packet;
}

function handle_ruleset_clause(packet: any): void {
  w.clause_infos[packet['type']] = packet;
}

function handle_game_info(packet: any): void {
  w.game_info = packet;
}

function handle_calendar_info(packet: any): void {
  w.calendar_info = packet;
}

function handle_spaceship_info(packet: any): void {
  w.spaceship_info[packet['player_num']] = packet;
}

function handle_ruleset_effect(packet: any): void {
  if (w.effects[packet['effect_type']] == null) {
    w.effects[packet['effect_type']] = [];
  }
  w.effects[packet['effect_type']].push(packet);
}

function handle_new_year(packet: any): void {
  w.game_info['year'] = packet['year'];
  w.game_info['fragments'] = packet['fragments'];
  w.game_info['turn'] = packet['turn'];
}

function handle_timeout_info(packet: any): void {
  w.last_turn_change_time = Math.ceil(packet['last_turn_change_time']);
  w.seconds_to_phasedone = Math.floor(packet['seconds_to_phasedone']);
  w.seconds_to_phasedone_sync = new Date().getTime();
}

function handle_trade_route_info(packet: any): void {
  if (w.city_trade_routes[packet['city']] == null) {
    w.city_trade_routes[packet['city']] = {};
  }
  w.city_trade_routes[packet['city']][packet['index']] = packet;
}

function handle_endgame_player(packet: any): void {
  w.endgame_player_info.push(packet);
}

function handle_unknown_research(packet: any): void {
  delete w.research_data[packet['id']];
}

// ============================================================================
// Batch 3: Ruleset handlers with logic
// ============================================================================

function handle_ruleset_unit(packet: any): void {
  if (packet['name'] != null && packet['name'].indexOf('?unit:') === 0) {
    packet['name'] = packet['name'].replace('?unit:', '');
  }
  packet['flags'] = new w.BitVector(packet['flags']);
  w.unit_types[packet['id']] = packet;
}

function handle_web_ruleset_unit_addition(packet: any): void {
  // Convert utype_actions array to BitVector (matches legacy webclient.min.js behaviour)
  if (packet['utype_actions'] != null) {
    packet['utype_actions'] = new w.BitVector(packet['utype_actions']);
  }
  if (w.unit_types[packet['id']] != null) {
    Object.assign(w.unit_types[packet['id']], packet);
  }
}

/**
 * Recreate the old req[] field of ruleset_tech packets.
 * This makes it possible to delay research_reqs support.
 */
function recreate_old_tech_req(packet: any): void {
  packet['req'] = [];
  if (packet['research_reqs']) {
    for (let i = 0; i < packet['research_reqs'].length; i++) {
      const requirement = packet['research_reqs'][i];
      if (requirement.kind === w.VUT_ADVANCE
          && requirement.range === w.REQ_RANGE_PLAYER
          && requirement.present) {
        packet['req'].push(requirement.value);
      }
    }
  }
  // Fill in A_NONE just in case XBWorld assumes its size is 2.
  while (packet['req'].length < 2) {
    packet['req'].push(w.A_NONE ?? 0);
  }
}

function handle_ruleset_tech(packet: any): void {
  if (packet['name'] != null && packet['name'].indexOf('?tech:') === 0) {
    packet['name'] = packet['name'].replace('?tech:', '');
  }
  w.techs[packet['id']] = packet;
  recreate_old_tech_req(packet);
}

function handle_ruleset_tech_class(_packet: any): void { /* TODO */ }
function handle_ruleset_tech_flag(_packet: any): void { /* TODO */ }

function handle_ruleset_terrain_control(packet: any): void {
  terrain_control = packet;
  w.terrain_control = packet;
  w.SINGLE_MOVE = packet['move_fragments'];
}

function handle_ruleset_building(packet: any): void {
  w.improvements[packet['id']] = packet;
}

function handle_ruleset_unit_class(packet: any): void {
  packet['flags'] = new w.BitVector(packet['flags']);
  w.unit_classes[packet['id']] = packet;
}

function handle_ruleset_disaster(_packet: any): void { /* TODO */ }
function handle_ruleset_trade(_packet: any): void { /* TODO */ }
function handle_rulesets_ready(_packet: any): void { /* TODO */ }
function handle_ruleset_choices(_packet: any): void { /* TODO */ }
function handle_game_load(_packet: any): void { /* TODO */ }
function handle_ruleset_unit_flag(_packet: any): void { /* TODO */ }
function handle_ruleset_unit_class_flag(_packet: any): void { /* TODO */ }
function handle_ruleset_unit_bonus(_packet: any): void { /* TODO */ }
function handle_ruleset_terrain_flag(_packet: any): void { /* TODO */ }
function handle_ruleset_impr_flag(_packet: any): void { /* TODO */ }
function handle_ruleset_government_ruler_title(_packet: any): void { /* TODO */ }

function handle_ruleset_base(packet: any): void {
  for (let i = 0; i < w.ruleset_control['num_extra_types']; i++) {
    if (w.is_extra_caused_by(w.extras[i], w.EC_BASE)
        && w.extras[i]['base'] == null) {
      w.extras[i]['base'] = packet;
      w.extras[w.extras[i]['rule_name']]['base'] = packet;
      return;
    }
  }
  console.log("Didn't find Extra to put Base on");
  console.log(packet);
}

function handle_ruleset_road(packet: any): void {
  for (let i = 0; i < w.ruleset_control['num_extra_types']; i++) {
    if (w.is_extra_caused_by(w.extras[i], w.EC_ROAD)
        && w.extras[i]['road'] == null) {
      w.extras[i]['road'] = packet;
      w.extras[w.extras[i]['rule_name']]['road'] = packet;
      return;
    }
  }
  console.log("Didn't find Extra to put Road on");
  console.log(packet);
}

function handle_ruleset_action_enabler(packet: any): void {
  const paction = w.actions[packet.enabled_action];
  if (paction === undefined) {
    console.log("Unknown action " + packet.action + " for enabler ");
    console.log(packet);
    return;
  }
  paction.enablers.push(packet);
}

function handle_ruleset_extra(packet: any): void {
  packet['causes'] = new w.BitVector(packet['causes']);
  packet['rmcauses'] = new w.BitVector(packet['rmcauses']);
  packet['name'] = w.string_unqualify(packet['name']);
  w.extras[packet['id']] = packet;
  w.extras[packet['rule_name']] = packet;

  if (w.is_extra_caused_by(packet, w.EC_ROAD) && packet['buildable']) {
    roads.push(packet);
  }
  if (w.is_extra_caused_by(packet, w.EC_BASE) && packet['buildable']) {
    bases.push(packet);
  }

  if (packet['rule_name'] === 'Railroad') w['EXTRA_RAIL'] = packet['id'];
  else if (packet['rule_name'] === 'Oil Well') w['EXTRA_OIL_WELL'] = packet['id'];
  else w['EXTRA_' + packet['rule_name'].toUpperCase()] = packet['id'];
}

function handle_ruleset_counter(_packet: any): void { /* TODO */ }
function handle_ruleset_extra_flag(_packet: any): void { /* TODO */ }
function handle_ruleset_nation_sets(_packet: any): void { /* TODO */ }
function handle_ruleset_style(_packet: any): void { /* TODO */ }
function handle_nation_availability(_packet: any): void { /* TODO */ }
function handle_ruleset_music(_packet: any): void { /* TODO */ }
function handle_ruleset_multiplier(_packet: any): void { /* TODO */ }
function handle_ruleset_action_auto(_packet: any): void { /* TODO */ }
function handle_ruleset_achievement(_packet: any): void { /* TODO */ }
function handle_achievement_info(_packet: any): void { /* TODO */ }
function handle_team_name_info(_packet: any): void { /* TODO */ }
function handle_popup_image(_packet: any): void { /* TODO */ }
function handle_worker_task(_packet: any): void { /* TODO */ }
function handle_play_music(_packet: any): void { /* TODO */ }

// ============================================================================
// Batch 4: Handlers with UI calls (call legacy UI functions via window)
// ============================================================================

function handle_server_join_reply(packet: any): void {
  if (packet['you_can_join']) {
    w.client.conn.established = true;
    w.client.conn.id = packet['conn_id'];

    if (w.get_client_page() === w.PAGE_MAIN
        || w.get_client_page() === w.PAGE_NETWORK) {
      w.set_client_page(w.PAGE_START);
    }

    const client_info = {
      'pid': w.packet_client_info,
      'gui': w.GUI_WEB,
      'emerg_version': 0,
      'distribution': ''
    };
    w.send_request(JSON.stringify(client_info));
    w.set_client_state(w.C_S_PREPARING);

    const urlAction = w.$.getUrlVar('action');
    const urlRuleset = w.$.getUrlVar('ruleset');
    if ((urlAction === 'new' || urlAction === 'hack') && urlRuleset != null) {
      w.change_ruleset(urlRuleset);
    }

    if (w.renderer === w.RENDERER_WEBGL && !w.observing) {
      w.send_message('/set wetness 25');
      w.send_message('/set topology=');
      w.send_message('/set wrap=');
      w.send_message('/set steepness 12');
    }

    if (w.autostart) {
      if (w.renderer === w.RENDERER_WEBGL) {
        w.$.blockUI({ message: '<h2>Generating terrain map model...</h2>' });
      }
      if (w.loadTimerId === -1) {
        w.wait_for_text('You are logged in as', w.pregame_start_game);
      } else {
        w.wait_for_text('Load complete', w.pregame_start_game);
      }
    } else if (w.observing) {
      w.wait_for_text('You are logged in as', w.request_observe_game);
    }
  } else {
    w.swal('You were rejected from the game.', (packet['message'] || ''), 'error');
    w.client.conn.id = -1;
    w.set_client_page(w.PAGE_MAIN);
  }
}

function handle_conn_info(packet: any): void {
  let pconn = find_conn_by_id(packet['id']);

  if (packet['used'] === false) {
    if (pconn == null) {
      w.freelog(w.LOG_VERBOSE, 'Server removed unknown connection ' + packet['id']);
      return;
    }
    client_remove_cli_conn(pconn);
    pconn = null;
  } else {
    const pplayer = w.valid_player_by_number(packet['player_num']);
    packet['playing'] = pplayer;

    if (packet['id'] === w.client.conn.id) {
      if (w.client.conn.player_num == null
          || w.client.conn.player_num !== packet['player_num']) {
        w.discard_diplomacy_dialogs();
      }
      w.client.conn = packet;
    }
    conn_list_append(packet);
  }

  if (packet['id'] === w.client.conn.id) {
    if (w.client.conn.playing !== packet['playing']) {
      w.set_client_state(w.C_S_PREPARING);
    }
  }
}

function handle_tile_info(packet: any): void {
  if (w.tiles != null) {
    packet['extras'] = new w.BitVector(packet['extras']);

    if (w.renderer === w.RENDERER_WEBGL) {
      const old_tile = Object.assign({}, w.tiles[packet['tile']]);
      w.webgl_update_tile_known(w.tiles[packet['tile']], packet);
      w.update_tile_extras(Object.assign(old_tile, packet));
    }

    Object.assign(w.tiles[packet['tile']], packet);

    if (typeof w.mark_tile_dirty === 'function') {
      w.mark_tile_dirty(packet['tile']);
    }
  }
}

function handle_chat_msg(packet: any): void {
  let message = packet['message'];
  const conn_id = packet['conn_id'];
  const event = packet['event'];
  const ptile = packet['tile'];

  if (message == null) return;
  if (event == null || event < 0 || event >= w.E_UNDEFINED) {
    console.log('Undefined message event type');
    console.log(packet);
    packet['event'] = w.E_UNDEFINED;
  }

  if (w.connections[conn_id] != null) {
    if (!w.is_longturn()) {
      message = '<b>' + w.connections[conn_id]['username'] + ':</b>' + message;
    }
  } else if (packet['event'] === w.E_SCRIPT) {
    const regxp = /\n/gi;
    message = message.replace(regxp, '<br>\n');
    w.show_dialog_message('Message for you:', message);
    return;
  } else {
    if (message.indexOf('/metamessage') !== -1) return;
    if (message.indexOf('Metaserver message string') !== -1) return;

    if (ptile != null && ptile > 0) {
      message = "<span class='chatbox_text_tileinfo' "
          + "onclick='center_tile_id(" + ptile + ");'>" + message + '</span>';
    }
    if (w.is_speech_supported()) w.speak(message);
  }

  packet['message'] = message;
  w.add_chatbox_text(packet);
}

function handle_early_chat_msg(packet: any): void {
  handle_chat_msg(packet);
}

function handle_city_info(packet: any): void {
  if (typeof w.mark_tile_dirty === 'function' && packet['tile'] != null) {
    w.mark_tile_dirty(packet['tile']);
  }

  packet['name'] = decodeURIComponent(packet['name']);
  packet['improvements'] = new w.BitVector(packet['improvements']);
  packet['city_options'] = new w.BitVector(packet['city_options']);
  packet['unhappy'] = w.city_unhappy(packet);

  if (w.cities[packet['id']] == null) {
    const pcity = packet;
    w.cities[packet['id']] = packet;
    if (w.C_S_RUNNING === w.client_state() && !w.observing && w.benchmark_start === 0
        && !w.client_is_observer() && packet['owner'] === w.client.conn.playing.playerno) {
      w.show_city_dialog_by_id(packet['id']);
    }
  } else {
    Object.assign(w.cities[packet['id']], packet);
  }

  const pcity = w.cities[packet['id']];
  // shield_stock / production changes tracked for animation
  pcity['shield_stock_changed'] = false;
  pcity['production_changed'] = false;
}

function handle_city_nationalities(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
}

function handle_city_rally_point(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
}

function handle_web_city_info_addition(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
  // Trigger UI update after city info is complete
  if (typeof w.update_city_info_dialog === 'function') {
    w.update_city_info_dialog();
  }
}

function handle_city_short_info(packet: any): void {
  if (typeof w.mark_tile_dirty === 'function' && packet['tile'] != null) {
    w.mark_tile_dirty(packet['tile']);
  }

  packet['name'] = decodeURIComponent(packet['name']);
  packet['improvements'] = new w.BitVector(packet['improvements']);

  if (w.cities[packet['id']] == null) {
    w.cities[packet['id']] = packet;
  } else {
    Object.assign(w.cities[packet['id']], packet);
  }
}

function handle_city_update_counters(packet: any): void {
  if (w.cities[packet['id']] != null) {
    w.cities[packet['id']]['counters'] = packet['counters'];
  }
}

function handle_city_update_counter(_packet: any): void { /* TODO */ }

function handle_player_info(packet: any): void {
  // Decode the nation name
  if (packet['name'] != null) {
    packet['name'] = decodeURIComponent(packet['name']);
  }

  w.players[packet['playerno']] = Object.assign(
    w.players[packet['playerno']] || {},
    packet
  );

  // Convert bitfield arrays to BitVector so legacy JS can call .isSet().
  // The server sends these as plain arrays; without conversion, nation.js
  // (and control.js / hotseat.js) crash with "flags.isSet is not a function".
  const p = w.players[packet['playerno']];
  if (p['flags'] != null && !(p['flags'] instanceof w.BitVector)) {
    p['flags'] = new w.BitVector(p['flags']);
  }
  if (p['gives_shared_vision'] != null && !(p['gives_shared_vision'] instanceof w.BitVector)) {
    p['gives_shared_vision'] = new w.BitVector(p['gives_shared_vision']);
  }

  if (w.client.conn.playing != null
      && packet['playerno'] === w.client.conn.playing['playerno']) {
    w.client.conn.playing = w.players[packet['playerno']];
  }
}

function handle_web_player_info_addition(packet: any): void {
  Object.assign(w.players[packet['playerno']], packet);

  if (w.client.conn.playing != null) {
    if (packet['playerno'] === w.client.conn.playing['playerno']) {
      w.client.conn.playing = w.players[packet['playerno']];
      w.update_game_status_panel();
      w.update_net_income();
    }
  }
  w.update_player_info_pregame();

  if (w.is_tech_tree_init && w.tech_dialog_active) w.update_tech_screen();

  w.assign_nation_color(w.players[packet['playerno']]['nation']);
}

function handle_player_remove(packet: any): void {
  delete w.players[packet['playerno']];
  w.update_player_info_pregame();
}

function handle_conn_ping(packet: any): void {
  w.ping_last = new Date().getTime();
  const pong_packet = { 'pid': w.packet_conn_pong };
  w.send_request(JSON.stringify(pong_packet));
}

function handle_set_topology(_packet: any): void { /* TODO */ }

function handle_map_info(packet: any): void {
  w.map = packet;
  w.map_init_topology(false);
  w.map_allocate();
  w.mapdeco_init();

  if (w.renderer === w.RENDERER_WEBGL) {
    w.mapview_model_width = Math.floor(w.MAPVIEW_ASPECT_FACTOR * w.map['xsize']);
    w.mapview_model_height = Math.floor(w.MAPVIEW_ASPECT_FACTOR * w.map['ysize']);
  }
}

function handle_authentication_req(packet: any): void {
  w.show_auth_dialog(packet);
}

function handle_server_shutdown(_packet: any): void { /* TODO */ }

function handle_nuke_tile_info(packet: any): void {
  const ptile = w.index_to_tile(packet['tile']);
  if (w.renderer === w.RENDERER_WEBGL) {
    w.render_nuclear_explosion(ptile);
  } else {
    ptile['nuke'] = 60;
  }
  w.play_sound('LrgExpl.ogg');
}

function handle_city_remove(packet: any): void {
  w.remove_city(packet['city_id']);
}

function handle_connect_msg(packet: any): void {
  w.add_chatbox_text(packet);
}

function handle_server_info(packet: any): void {
  if (packet['emerg_version'] > 0) {
    console.log('Server has version %d.%d.%d.%d%s',
      packet.major_version, packet.minor_version, packet.patch_version,
      packet.emerg_version, packet.version_label);
  } else {
    console.log('Server has version %d.%d.%d%s',
      packet.major_version, packet.minor_version, packet.patch_version,
      packet.version_label);
  }
}

function handle_city_name_suggestion_info(packet: any): void {
  packet['name'] = decodeURIComponent(packet['name']);
  w.city_name_dialog(packet['name'], packet['unit_id']);
}

function handle_city_sabotage_list(packet: any): void {
  if (packet['request_kind'] !== REQEST_PLAYER_INITIATED) {
    console.log('handle_city_sabotage_list(): was asked to not disturb the player. Unimplemented.');
  }
  w.popup_sabotage_dialog(
    w.game_find_unit_by_number(packet['actor_id']),
    w.game_find_city_by_number(packet['city_id']),
    new w.BitVector(packet['improvements']),
    packet['act_id']
  );
}

function handle_player_attribute_chunk(_packet: any): void { /* no-op */ }

function handle_unit_remove(packet: any): void {
  const punit = w.game_find_unit_by_number(packet['unit_id']);
  if (punit == null) return;

  if (typeof w.mark_tile_dirty === 'function' && punit['tile'] != null) {
    w.mark_tile_dirty(punit['tile']);
  }

  if (w.action_selection_in_progress_for === punit.id) {
    w.action_selection_close();
    w.action_selection_next_in_focus(punit.id);
  }

  w.clear_tile_unit(punit);
  w.client_remove_unit(punit);

  if (w.renderer === w.RENDERER_WEBGL) {
    w.update_unit_position(w.index_to_tile(punit['tile']));
  }
}

function handle_unit_info(packet: any): void {
  if (typeof w.mark_tile_dirty === 'function' && packet['tile'] != null) {
    w.mark_tile_dirty(packet['tile']);
    const old_unit = w.units[packet['id']];
    if (old_unit != null && old_unit['tile'] !== packet['tile']) {
      w.mark_tile_dirty(old_unit['tile']);
    }
  }
  handle_unit_packet_common(packet);
}

function handle_unit_short_info(packet: any): void {
  if (typeof w.mark_tile_dirty === 'function' && packet['tile'] != null) {
    w.mark_tile_dirty(packet['tile']);
    const old_unit = w.units[packet['id']];
    if (old_unit != null && old_unit['tile'] !== packet['tile']) {
      w.mark_tile_dirty(old_unit['tile']);
    }
  }
  handle_unit_packet_common(packet);
}

/**
 * Handle action decision for a unit — check auto-attack actions first,
 * then fall back to requesting player decision.
 */
function action_decision_handle(punit: any): void {
  for (let a = 0; a < auto_attack_actions.length; a++) {
    const action = auto_attack_actions[a];
    if (w.utype_can_do_action(w.unit_type(punit), action) && w.auto_attack) {
      const packet = {
        'pid':             w.packet_unit_get_actions,
        'actor_unit_id':   punit['id'],
        'target_unit_id':  w.IDENTITY_NUMBER_ZERO,
        'target_tile_id':  punit['action_decision_tile'],
        'target_extra_id': w.EXTRA_NONE,
        'request_kind':    REQEST_BACKGROUND_FAST_AUTO_ATTACK,
      };
      w.send_request(JSON.stringify(packet));
      return;
    }
  }
  w.action_decision_request(punit);
}

/**
 * Do an auto action or request that the player makes a decision
 * for the specified unit.
 */
function action_decision_maybe_auto(
  actor_unit: any, action_probabilities: any,
  target_tile: any, target_extra: any,
  target_unit: any, _target_city: any
): void {
  for (let a = 0; a < auto_attack_actions.length; a++) {
    const action = auto_attack_actions[a];
    if (w.action_prob_possible(action_probabilities[action]) && w.auto_attack) {
      let target = target_tile['index'];
      if (action === w.ACTION_NUKE_CITY) {
        const tc = w.tile_city(target_tile);
        if (!tc) continue;
        target = tc['id'];
      }
      w.request_unit_do_action(action, actor_unit['id'], target);
      return;
    }
  }
  w.action_decision_request(actor_unit);
}

/**
 * Simple wrapper: update_client_state -> set_client_state.
 */
function update_client_state(value: any): void {
  w.set_client_state(value);
}

function handle_unit_packet_common(packet_unit: any): void {
  const punit = w.player_find_unit_by_id(
    w.unit_owner(packet_unit), packet_unit['id']
  );

  // Clear old tile reference before updating
  if (typeof w.clear_tile_unit === 'function') {
    w.clear_tile_unit(punit);
  }

  if (punit == null && w.game_find_unit_by_number(packet_unit['id']) != null) {
    // Unit changed owner — delete old and recreate
    w.handle_unit_remove(packet_unit['id']);
  }

  let old_tile: any = null;
  if (punit != null) old_tile = w.index_to_tile(punit['tile']);

  if (w.units[packet_unit['id']] == null) {
    // New unit
    if (w.should_ask_server_for_actions(packet_unit)) {
      action_decision_handle(packet_unit);
    }
    packet_unit['anim_list'] = [];
    w.units[packet_unit['id']] = packet_unit;
    w.units[packet_unit['id']]['facing'] = 6;
  } else {
    // Existing unit update
    if ((punit['action_decision_want'] !== packet_unit['action_decision_want']
         || punit['action_decision_tile'] !== packet_unit['action_decision_tile'])
        && w.should_ask_server_for_actions(packet_unit)) {
      action_decision_handle(packet_unit);
    }
    if (typeof w.update_unit_anim_list === 'function') {
      w.update_unit_anim_list(w.units[packet_unit['id']], packet_unit);
    }
    Object.assign(w.units[packet_unit['id']], packet_unit);
    // Also update current_focus references
    if (w.current_focus != null) {
      for (let i = 0; i < w.current_focus.length; i++) {
        if (w.current_focus[i]['id'] === packet_unit['id']) {
          Object.assign(w.current_focus[i], packet_unit);
        }
      }
    }
  }

  w.update_tile_unit(w.units[packet_unit['id']]);

  if (w.current_focus != null && w.current_focus.length > 0
      && w.current_focus[0]['id'] === packet_unit['id']) {
    w.update_active_units_dialog();
    w.update_unit_order_commands();

    if (w.current_focus[0]['done_moving'] !== packet_unit['done_moving']) {
      w.update_unit_focus();
    }
  }

  if (w.renderer === w.RENDERER_WEBGL) {
    if (punit != null) w.update_unit_position(old_tile);
    w.update_unit_position(w.index_to_tile(w.units[packet_unit['id']]['tile']));
  }
}

function handle_unit_combat_info(packet: any): void {
  const attacker = w.units[packet['attacker_unit_id']];
  const defender = w.units[packet['defender_unit_id']];
  const attacker_hp = packet['attacker_hp'];
  const defender_hp = packet['defender_hp'];

  if (w.renderer === w.RENDERER_WEBGL) {
    if (attacker_hp === 0) w.animate_explosion_on_tile(attacker['tile'], 0);
    if (defender_hp === 0) w.animate_explosion_on_tile(defender['tile'], 0);
  } else {
    if (attacker_hp === 0 && w.is_unit_visible(attacker)) {
      w.explosion_anim_map[attacker['tile']] = 25;
    }
    if (defender_hp === 0 && w.is_unit_visible(defender)) {
      w.explosion_anim_map[defender['tile']] = 25;
    }
  }
}

function handle_unit_action_answer(packet: any): void {
  const diplomat_id = packet['actor_id'];
  const target_id = packet['target_id'];
  const cost = packet['cost'];
  const action_type = packet['action_type'];

  const target_city = w.game_find_city_by_number(target_id);
  const target_unit = w.game_find_unit_by_number(target_id);
  const actor_unit = w.game_find_unit_by_number(diplomat_id);

  if (actor_unit == null) {
    console.log('Bad actor unit (' + diplomat_id + ') in unit action answer.');
    w.act_sel_queue_done(diplomat_id);
    return;
  }

  if (packet['request_kind'] !== REQEST_PLAYER_INITIATED) {
    console.log('handle_unit_action_answer(): was asked to not disturb the player. Unimplemented.');
  }

  if (action_type === w.ACTION_SPY_BRIBE_UNIT) {
    if (target_unit == null) {
      console.log('Bad target unit (' + target_id + ') in unit action answer.');
      w.act_sel_queue_done(diplomat_id);
    } else {
      w.popup_bribe_dialog(actor_unit, target_unit, cost, action_type);
    }
    return;
  } else if (action_type === w.ACTION_SPY_INCITE_CITY
             || action_type === w.ACTION_SPY_INCITE_CITY_ESC) {
    if (target_city == null) {
      console.log('Bad target city (' + target_id + ') in unit action answer.');
      w.act_sel_queue_done(diplomat_id);
    } else {
      w.popup_incite_dialog(actor_unit, target_city, cost, action_type);
    }
    return;
  } else if (action_type === w.ACTION_UPGRADE_UNIT) {
    if (target_city == null) {
      console.log('Bad target city (' + target_id + ') in unit action answer.');
      w.act_sel_queue_done(diplomat_id);
    } else {
      w.popup_unit_upgrade_dlg(actor_unit, target_city, cost, action_type);
    }
    return;
  } else if (action_type === w.ACTION_COUNT) {
    console.log('unit_action_answer: Server refused to respond.');
  } else {
    console.log('unit_action_answer: Invalid answer.');
  }
  w.act_sel_queue_done(diplomat_id);
}

function handle_unit_actions(packet: any): void {
  const actor_unit_id = packet['actor_unit_id'];
  const target_unit_id = packet['target_unit_id'];
  const target_city_id = packet['target_city_id'];
  const target_tile_id = packet['target_tile_id'];
  const target_extra_id = packet['target_extra_id'];
  const action_probabilities = packet['action_probabilities'];

  const pdiplomat = w.game_find_unit_by_number(actor_unit_id);
  const target_unit = w.game_find_unit_by_number(target_unit_id);
  const target_city = w.game_find_city_by_number(target_city_id);
  const ptile = w.index_to_tile(target_tile_id);
  const target_extra = w.extra_by_number(target_extra_id);

  let hasActions = false;

  if (pdiplomat != null && ptile != null) {
    action_probabilities.forEach(function(prob: any) {
      if (w.action_prob_possible(prob)) {
        hasActions = true;
      }
    });
  }

  switch (packet['request_kind']) {
  case REQEST_PLAYER_INITIATED:
    if (hasActions) {
      w.popup_action_selection(pdiplomat, action_probabilities,
                               ptile, target_extra, target_unit, target_city);
    } else {
      w.action_selection_no_longer_in_progress(actor_unit_id);
      w.action_decision_clear_want(actor_unit_id);
      w.action_selection_next_in_focus(actor_unit_id);
    }
    break;
  case REQEST_BACKGROUND_REFRESH:
    w.action_selection_refresh(pdiplomat,
                               target_city, target_unit, ptile,
                               target_extra,
                               action_probabilities);
    break;
  case REQEST_BACKGROUND_FAST_AUTO_ATTACK:
    w.action_decision_maybe_auto(pdiplomat, action_probabilities,
                                 ptile, target_extra,
                                 target_unit, target_city);
    break;
  default:
    console.log('handle_unit_actions(): unrecognized request_kind %d',
                packet['request_kind']);
    break;
  }
}

function handle_diplomacy_init_meeting(packet: any): void {
  if (w.is_hotseat() && packet['initiated_from'] !== w.client.conn.playing['playerno']) return;
  w.diplomacy_clause_map[packet['counterpart']] = [];
  w.show_diplomacy_dialog(packet['counterpart']);
  w.show_diplomacy_clauses(packet['counterpart']);
}

function handle_diplomacy_cancel_meeting(packet: any): void {
  w.cancel_meeting(packet['counterpart']);
}

function handle_diplomacy_create_clause(packet: any): void {
  const counterpart_id = packet['counterpart'];
  if (w.diplomacy_clause_map[counterpart_id] == null) {
    w.diplomacy_clause_map[counterpart_id] = [];
  }
  w.diplomacy_clause_map[counterpart_id].push(packet);
  w.show_diplomacy_clauses(counterpart_id);
}

function handle_diplomacy_remove_clause(packet: any): void {
  w.remove_clause(packet);
}

function handle_diplomacy_accept_treaty(packet: any): void {
  w.accept_treaty(packet['counterpart'],
                  packet['I_accepted'],
                  packet['other_accepted']);
}

function handle_page_msg(packet: any): void {
  page_msg['headline'] = packet['headline'];
  page_msg['caption'] = packet['caption'];
  page_msg['event'] = packet['event'];
  page_msg['missing_parts'] = packet['parts'];
  page_msg['message'] = '';
}

function handle_page_msg_part(packet: any): void {
  page_msg['message'] = page_msg['message'] + packet['lines'];
  page_msg['missing_parts']--;

  if (page_msg['missing_parts'] === 0) {
    const regxp = /\n/gi;
    page_msg['message'] = page_msg['message'].replace(regxp, '<br>\n');
    w.show_dialog_message(page_msg['headline'], page_msg['message']);
    page_msg = {};
  }
}

function handle_conn_ping_info(packet: any): void {
  if (w.debug_active) {
    w.conn_ping_info = packet;
    w.debug_ping_list.push(packet['ping_time'][0] * 1000);
  }
}

function handle_end_phase(_packet: any): void {
  w.chatbox_clip_messages();
  if (w.is_pbem()) {
    w.pbem_end_phase();
  }
  if (w.is_hotseat()) {
    w.hotseat_next_player();
  }
}

function handle_start_phase(_packet: any): void {
  w.set_client_state(w.C_S_RUNNING);
  w.set_phase_start();
  w.saved_this_turn = false;
  w.add_replay_frame();
}

function handle_ruleset_control(packet: any): void {
  w.ruleset_control = packet;
  w.set_client_state(w.C_S_PREPARING);

  w.effects = {};
  w.ruleset_summary = null;
  w.ruleset_description = null;
  w.game_rules = null;
  w.nation_groups = [];
  w.nations = {};
  w.specialists = {};
  w.techs = {};
  w.governments = {};
  terrain_control = {};
  w.terrain_control = {};
  w.SINGLE_MOVE = undefined;
  w.unit_types = {};
  w.unit_classes = {};
  w.city_rules = {};
  w.terrains = {};
  w.resources = {};
  w.goods = {};
  w.actions = {};

  w.improvements_init();

  for (const extra in w.extras) {
    const ename = w.extras[extra]['rule_name'];
    if (ename === 'Railroad') delete w['EXTRA_RAIL'];
    else if (ename === 'Oil Well') delete w['EXTRA_OIL_WELL'];
    else delete w['EXTRA_' + ename.toUpperCase()];
  }
  w.extras = {};
  roads = [];
  bases = [];

  w.clause_infos = {};
}

function handle_endgame_report(_packet: any): void {
  w.set_client_state(w.C_S_OVER);
}

function handle_scenario_info(packet: any): void {
  w.scenario_info = packet;
}

function handle_scenario_description(packet: any): void {
  w.scenario_info['description'] = packet['description'];
  w.update_game_info_pregame();
}

function handle_single_want_hack_reply(packet: any): void {
  if (typeof w.handle_single_want_hack_reply_orig === 'function') {
    w.handle_single_want_hack_reply_orig(packet);
  }
}

function handle_vote_new(_packet: any): void { /* TODO */ }
function handle_vote_update(_packet: any): void { /* TODO */ }
function handle_vote_remove(_packet: any): void { /* TODO */ }
function handle_vote_resolve(_packet: any): void { /* TODO */ }
function handle_edit_startpos(_packet: any): void { /* no-op */ }
function handle_edit_startpos_full(_packet: any): void { /* no-op */ }
function handle_edit_object_created(_packet: any): void { /* no-op */ }

function handle_server_setting_const(packet: any): void {
  w.server_settings[packet['id']] = packet;
  w.server_settings[packet['name']] = packet;
}

function handle_server_setting_int(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

function handle_server_setting_enum(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

function handle_server_setting_bitwise(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

function handle_server_setting_bool(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

function handle_server_setting_str(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

function handle_server_setting_control(_packet: any): void { /* TODO */ }

function handle_player_diplstate(packet: any): void {
  let need_players_dialog_update = false;

  if (w.client == null || w.client.conn.playing == null) return;

  if (packet['plr2'] === w.client.conn.playing['playerno']) {
    const ds = w.players[packet['plr1']].diplstates;
    if (ds != undefined && ds[packet['plr2']] != undefined
        && ds[packet['plr2']]['state'] !== packet['type']) {
      need_players_dialog_update = true;
    }
  }

  if (packet['type'] === w.DS_WAR && packet['plr2'] === w.client.conn.playing['playerno']
      && w.diplstates[packet['plr1']] !== w.DS_WAR && w.diplstates[packet['plr1']] !== w.DS_NO_CONTACT) {
    w.alert_war(packet['plr1']);
  } else if (packet['type'] === w.DS_WAR && packet['plr1'] === w.client.conn.playing['playerno']
      && w.diplstates[packet['plr2']] !== w.DS_WAR && w.diplstates[packet['plr2']] !== w.DS_NO_CONTACT) {
    w.alert_war(packet['plr2']);
  }

  if (packet['plr1'] === w.client.conn.playing['playerno']) {
    w.diplstates[packet['plr2']] = packet['type'];
  } else if (packet['plr2'] === w.client.conn.playing['playerno']) {
    w.diplstates[packet['plr1']] = packet['type'];
  }

  if (w.players[packet['plr1']].diplstates === undefined) {
    w.players[packet['plr1']].diplstates = [];
  }
  w.players[packet['plr1']].diplstates[packet['plr2']] = {
    state: packet['type'],
    turns_left: packet['turns_left'],
    contact_turns_left: packet['contact_turns_left']
  };

  if (need_players_dialog_update
      && w.action_selection_actor_unit() !== w.IDENTITY_NUMBER_ZERO) {
    let tgt_tile: any;
    let tgt_unit: any;
    let tgt_city: any;

    if ((w.action_selection_target_unit() !== w.IDENTITY_NUMBER_ZERO
         && ((tgt_unit = w.game_find_unit_by_number(w.action_selection_target_unit())))
         && tgt_unit['owner'] === packet['plr1'])
        || (w.action_selection_target_city() !== w.IDENTITY_NUMBER_ZERO
            && ((tgt_city = w.game_find_city_by_number(w.action_selection_target_city())))
            && tgt_city['owner'] === packet['plr1'])
        || ((tgt_tile = w.index_to_tile(w.action_selection_target_tile()))
            && w.tile_owner(tgt_tile) === packet['plr1'])) {
      const refresh_packet = {
        'pid': w.packet_unit_get_actions,
        'actor_unit_id': w.action_selection_actor_unit(),
        'target_unit_id': w.action_selection_target_unit(),
        'target_tile_id': w.action_selection_target_tile(),
        'target_extra_id': w.action_selection_target_extra(),
        'request_kind': REQEST_BACKGROUND_REFRESH,
      };
      w.send_request(JSON.stringify(refresh_packet));
    }
  }
}

function handle_web_goto_path(packet: any): void {
  if (w.goto_active) {
    w.update_goto_path(packet);
  }
}

function handle_research_info(packet: any): void {
  let old_inventions: any = null;
  if (w.research_data[packet['id']] != null) {
    old_inventions = w.research_data[packet['id']]['inventions'];
  }

  w.research_data[packet['id']] = packet;

  if (w.game_info['team_pooled_research']) {
    for (const player_id in w.players) {
      const pplayer = w.players[player_id];
      if (pplayer['team'] === packet['id']) {
        Object.assign(pplayer, packet);
        delete pplayer['id'];
      }
    }
  } else {
    const pplayer = w.players[packet['id']];
    Object.assign(pplayer, packet);
    delete pplayer['id'];
  }

  if (!w.client_is_observer() && old_inventions != null
      && w.client.conn.playing != null
      && w.client.conn.playing['playerno'] === packet['id']) {
    for (let i = 0; i < packet['inventions'].length; i++) {
      if (packet['inventions'][i] !== old_inventions[i]
          && packet['inventions'][i] === w.TECH_KNOWN) {
        w.queue_tech_gained_dialog(i);
        break;
      }
    }
  }

  if (w.is_tech_tree_init && w.tech_dialog_active) w.update_tech_screen();
  w.bulbs_output_updater.update();
}

// ============================================================================
// Batch 5: jQuery handlers — replaced with native DOM
// ============================================================================

function handle_begin_turn(_packet: any): void {
  if (typeof w.mark_all_dirty === 'function') w.mark_all_dirty();

  if (!w.observing) {
    const btn = document.getElementById('turn_done_button') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Turn Done';
    }
    // Also try jQuery in case button widget is initialized
    try { w.$('#turn_done_button').button('option', 'disabled', false); } catch (_e) { /* ok */ }
    try { w.$('#turn_done_button').button('option', 'label', 'Turn Done'); } catch (_e) { /* ok */ }
  }
  w.waiting_units_list = [];
  w.update_unit_focus();
  w.update_active_units_dialog();
  w.update_game_status_panel();

  const funits = w.get_units_in_focus();
  if (funits != null && funits.length === 0) {
    w.auto_center_on_focus_unit();
  }

  if (w.is_tech_tree_init && w.tech_dialog_active) w.update_tech_screen();
}

function handle_end_turn(_packet: any): void {
  w.reset_unit_anim_list();
  if (!w.observing) {
    const btn = document.getElementById('turn_done_button') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try { w.$('#turn_done_button').button('option', 'disabled', true); } catch (_e) { /* ok */ }
  }
}

// ============================================================================
// handle_web_info_text_message is defined in 2dcanvas/mapctrl.js
// We do NOT migrate it here — it stays in the rendering layer (Phase 8)
// ============================================================================

// ============================================================================
// Packet Router — replaces packhand_glue.js
// ============================================================================

/**
 * Maps server packet IDs to their handler functions.
 * This replaces the packet_hand_table from packhand_glue.js.
 */
const packet_hand_table: Record<number, (packet: any) => void> = {
  0:   handle_processing_started,
  1:   handle_processing_finished,
  21:  handle_investigate_started,
  22:  handle_investigate_finished,
  5:   handle_server_join_reply,
  6:   handle_authentication_req,
  8:   handle_server_shutdown,
  12:  handle_endgame_report,
  223: handle_endgame_player,
  15:  handle_tile_info,
  16:  handle_game_info,
  255: handle_calendar_info,
  244: handle_timeout_info,
  17:  handle_map_info,
  18:  handle_nuke_tile_info,
  19:  handle_team_name_info,
  238: handle_achievement_info,
  25:  handle_chat_msg,
  28:  handle_early_chat_msg,
  27:  handle_connect_msg,
  29:  handle_server_info,
  30:  handle_city_remove,
  31:  handle_city_info,
  46:  handle_city_nationalities,
  514: handle_city_update_counters,
  32:  handle_city_short_info,
  249: handle_trade_route_info,
  44:  handle_city_name_suggestion_info,
  45:  handle_city_sabotage_list,
  138: handle_city_rally_point,
  241: handle_worker_task,
  50:  handle_player_remove,
  51:  handle_player_info,
  58:  handle_player_attribute_chunk,
  59:  handle_player_diplstate,
  60:  handle_research_info,
  66:  handle_unknown_research,
  62:  handle_unit_remove,
  63:  handle_unit_info,
  64:  handle_unit_short_info,
  65:  handle_unit_combat_info,
  85:  handle_unit_action_answer,
  90:  handle_unit_actions,
  96:  handle_diplomacy_init_meeting,
  98:  handle_diplomacy_cancel_meeting,
  100: handle_diplomacy_create_clause,
  102: handle_diplomacy_remove_clause,
  104: handle_diplomacy_accept_treaty,
  110: handle_page_msg,
  250: handle_page_msg_part,
  115: handle_conn_info,
  116: handle_conn_ping_info,
  88:  handle_conn_ping,
  125: handle_end_phase,
  126: handle_start_phase,
  127: handle_new_year,
  128: handle_begin_turn,
  129: handle_end_turn,
  130: handle_freeze_client,
  131: handle_thaw_client,
  137: handle_spaceship_info,
  140: handle_ruleset_unit,
  228: handle_ruleset_unit_bonus,
  229: handle_ruleset_unit_flag,
  230: handle_ruleset_unit_class_flag,
  141: handle_ruleset_game,
  142: handle_ruleset_specialist,
  143: handle_ruleset_government_ruler_title,
  144: handle_ruleset_tech,
  9:   handle_ruleset_tech_class,
  234: handle_ruleset_tech_flag,
  145: handle_ruleset_government,
  146: handle_ruleset_terrain_control,
  225: handle_rulesets_ready,
  236: handle_ruleset_nation_sets,
  147: handle_ruleset_nation_groups,
  148: handle_ruleset_nation,
  237: handle_nation_availability,
  239: handle_ruleset_style,
  149: handle_ruleset_city,
  150: handle_ruleset_building,
  20:  handle_ruleset_impr_flag,
  151: handle_ruleset_terrain,
  231: handle_ruleset_terrain_flag,
  152: handle_ruleset_unit_class,
  232: handle_ruleset_extra,
  226: handle_ruleset_extra_flag,
  153: handle_ruleset_base,
  220: handle_ruleset_road,
  248: handle_ruleset_goods,
  224: handle_ruleset_disaster,
  233: handle_ruleset_achievement,
  227: handle_ruleset_trade,
  246: handle_ruleset_action,
  235: handle_ruleset_action_enabler,
  252: handle_ruleset_action_auto,
  513: handle_ruleset_counter,
  240: handle_ruleset_music,
  243: handle_ruleset_multiplier,
  512: handle_ruleset_clause,
  155: handle_ruleset_control,
  251: handle_ruleset_summary,
  247: handle_ruleset_description_part,
  161: handle_single_want_hack_reply,
  162: handle_ruleset_choices,
  163: handle_game_load,
  164: handle_server_setting_control,
  165: handle_server_setting_const,
  166: handle_server_setting_bool,
  167: handle_server_setting_int,
  168: handle_server_setting_str,
  169: handle_server_setting_enum,
  170: handle_server_setting_bitwise,
  253: handle_set_topology,
  175: handle_ruleset_effect,
  177: handle_ruleset_resource,
  180: handle_scenario_info,
  13:  handle_scenario_description,
  185: handle_vote_new,
  186: handle_vote_update,
  187: handle_vote_remove,
  188: handle_vote_resolve,
  204: handle_edit_startpos,
  205: handle_edit_startpos_full,
  219: handle_edit_object_created,
  245: handle_play_music,
  515: handle_popup_image,
  256: handle_web_city_info_addition,
  259: handle_web_player_info_addition,
  260: handle_web_ruleset_unit_addition,
  288: handle_web_goto_path,
  // 290: handle_web_info_text_message — defined in 2dcanvas/mapctrl.js
};

// Register handle_web_info_text_message from legacy mapctrl.js (loaded before TS bundle)
if (typeof w.handle_web_info_text_message === 'function') {
  packet_hand_table[290] = w.handle_web_info_text_message;
}

/**
 * Main packet dispatch function.
 * Called by the WebSocket onmessage handler.
 */
function client_handle_packet(packets: any[]): void {
  if (packets == null) return;
  try {
    for (let i = 0; i < packets.length; i++) {
      if (packets[i] != null) {
        const handler = packet_hand_table[packets[i].pid];
        if (handler) {
          handler(packets[i]);
        } else {
          console.warn('No handler for packet pid=' + packets[i].pid);
        }
      }
    }
    if (packets.length > 0) {
      if (w.debug_active) w.clinet_debug_collect();
      if (w.renderer === w.RENDERER_2DCANVAS) w.update_map_canvas_check();
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Register an additional handler at runtime.
 * Used by 2dcanvas/mapctrl.js to register handle_web_info_text_message.
 */
function register_packet_handler(pid: number, handler: (packet: any) => void): void {
  packet_hand_table[pid] = handler;
}

// ============================================================================
// Expose ALL handlers and dispatch to Legacy
// ============================================================================

// Freeze/thaw
exposeToLegacy('handle_processing_started', handle_processing_started);
exposeToLegacy('handle_processing_finished', handle_processing_finished);
exposeToLegacy('handle_investigate_started', handle_investigate_started);
exposeToLegacy('handle_investigate_finished', handle_investigate_finished);
exposeToLegacy('handle_freeze_hint', handle_freeze_hint);
exposeToLegacy('handle_thaw_hint', handle_thaw_hint);
exposeToLegacy('handle_freeze_client', handle_freeze_client);
exposeToLegacy('handle_thaw_client', handle_thaw_client);

// Ruleset data
exposeToLegacy('handle_ruleset_terrain', handle_ruleset_terrain);
exposeToLegacy('handle_ruleset_resource', handle_ruleset_resource);
exposeToLegacy('handle_ruleset_game', handle_ruleset_game);
exposeToLegacy('handle_ruleset_specialist', handle_ruleset_specialist);
exposeToLegacy('handle_ruleset_nation_groups', handle_ruleset_nation_groups);
exposeToLegacy('handle_ruleset_nation', handle_ruleset_nation);
exposeToLegacy('handle_ruleset_city', handle_ruleset_city);
exposeToLegacy('handle_ruleset_government', handle_ruleset_government);
exposeToLegacy('handle_ruleset_summary', handle_ruleset_summary);
exposeToLegacy('handle_ruleset_description_part', handle_ruleset_description_part);
exposeToLegacy('handle_ruleset_action', handle_ruleset_action);
exposeToLegacy('handle_ruleset_goods', handle_ruleset_goods);
exposeToLegacy('handle_ruleset_clause', handle_ruleset_clause);
exposeToLegacy('handle_ruleset_effect', handle_ruleset_effect);
exposeToLegacy('handle_ruleset_unit', handle_ruleset_unit);
exposeToLegacy('handle_web_ruleset_unit_addition', handle_web_ruleset_unit_addition);
exposeToLegacy('handle_ruleset_tech', handle_ruleset_tech);
exposeToLegacy('handle_ruleset_tech_class', handle_ruleset_tech_class);
exposeToLegacy('handle_ruleset_tech_flag', handle_ruleset_tech_flag);
exposeToLegacy('handle_ruleset_terrain_control', handle_ruleset_terrain_control);
exposeToLegacy('handle_ruleset_building', handle_ruleset_building);
exposeToLegacy('handle_ruleset_unit_class', handle_ruleset_unit_class);
exposeToLegacy('handle_ruleset_disaster', handle_ruleset_disaster);
exposeToLegacy('handle_ruleset_trade', handle_ruleset_trade);
exposeToLegacy('handle_rulesets_ready', handle_rulesets_ready);
exposeToLegacy('handle_ruleset_choices', handle_ruleset_choices);
exposeToLegacy('handle_game_load', handle_game_load);
exposeToLegacy('handle_ruleset_unit_flag', handle_ruleset_unit_flag);
exposeToLegacy('handle_ruleset_unit_class_flag', handle_ruleset_unit_class_flag);
exposeToLegacy('handle_ruleset_unit_bonus', handle_ruleset_unit_bonus);
exposeToLegacy('handle_ruleset_terrain_flag', handle_ruleset_terrain_flag);
exposeToLegacy('handle_ruleset_impr_flag', handle_ruleset_impr_flag);
exposeToLegacy('handle_ruleset_government_ruler_title', handle_ruleset_government_ruler_title);
exposeToLegacy('handle_ruleset_base', handle_ruleset_base);
exposeToLegacy('handle_ruleset_road', handle_ruleset_road);
exposeToLegacy('handle_ruleset_action_enabler', handle_ruleset_action_enabler);
exposeToLegacy('handle_ruleset_extra', handle_ruleset_extra);
exposeToLegacy('handle_ruleset_counter', handle_ruleset_counter);
exposeToLegacy('handle_ruleset_extra_flag', handle_ruleset_extra_flag);
exposeToLegacy('handle_ruleset_nation_sets', handle_ruleset_nation_sets);
exposeToLegacy('handle_ruleset_style', handle_ruleset_style);
exposeToLegacy('handle_nation_availability', handle_nation_availability);
exposeToLegacy('handle_ruleset_music', handle_ruleset_music);
exposeToLegacy('handle_ruleset_multiplier', handle_ruleset_multiplier);
exposeToLegacy('handle_ruleset_action_auto', handle_ruleset_action_auto);
exposeToLegacy('handle_ruleset_achievement', handle_ruleset_achievement);
exposeToLegacy('handle_achievement_info', handle_achievement_info);
exposeToLegacy('handle_team_name_info', handle_team_name_info);
exposeToLegacy('handle_popup_image', handle_popup_image);
exposeToLegacy('handle_worker_task', handle_worker_task);
exposeToLegacy('handle_play_music', handle_play_music);
exposeToLegacy('handle_ruleset_control', handle_ruleset_control);

// Game state
exposeToLegacy('handle_game_info', handle_game_info);
exposeToLegacy('handle_calendar_info', handle_calendar_info);
exposeToLegacy('handle_spaceship_info', handle_spaceship_info);
exposeToLegacy('handle_new_year', handle_new_year);
exposeToLegacy('handle_timeout_info', handle_timeout_info);
exposeToLegacy('handle_trade_route_info', handle_trade_route_info);
exposeToLegacy('handle_endgame_player', handle_endgame_player);
exposeToLegacy('handle_unknown_research', handle_unknown_research);

// Server/connection
exposeToLegacy('handle_server_join_reply', handle_server_join_reply);
exposeToLegacy('handle_conn_info', handle_conn_info);
exposeToLegacy('handle_authentication_req', handle_authentication_req);
exposeToLegacy('handle_server_shutdown', handle_server_shutdown);
exposeToLegacy('handle_server_info', handle_server_info);
exposeToLegacy('handle_conn_ping', handle_conn_ping);
exposeToLegacy('handle_conn_ping_info', handle_conn_ping_info);
exposeToLegacy('handle_connect_msg', handle_connect_msg);
exposeToLegacy('handle_set_topology', handle_set_topology);
exposeToLegacy('handle_server_setting_const', handle_server_setting_const);
exposeToLegacy('handle_server_setting_int', handle_server_setting_int);
exposeToLegacy('handle_server_setting_enum', handle_server_setting_enum);
exposeToLegacy('handle_server_setting_bitwise', handle_server_setting_bitwise);
exposeToLegacy('handle_server_setting_bool', handle_server_setting_bool);
exposeToLegacy('handle_server_setting_str', handle_server_setting_str);
exposeToLegacy('handle_server_setting_control', handle_server_setting_control);

// Map/tile
exposeToLegacy('handle_tile_info', handle_tile_info);
exposeToLegacy('handle_map_info', handle_map_info);
exposeToLegacy('handle_nuke_tile_info', handle_nuke_tile_info);

// City
exposeToLegacy('handle_city_info', handle_city_info);
exposeToLegacy('handle_city_nationalities', handle_city_nationalities);
exposeToLegacy('handle_city_rally_point', handle_city_rally_point);
exposeToLegacy('handle_web_city_info_addition', handle_web_city_info_addition);
exposeToLegacy('handle_city_short_info', handle_city_short_info);
exposeToLegacy('handle_city_update_counters', handle_city_update_counters);
exposeToLegacy('handle_city_update_counter', handle_city_update_counter);
exposeToLegacy('handle_city_remove', handle_city_remove);
exposeToLegacy('handle_city_name_suggestion_info', handle_city_name_suggestion_info);
exposeToLegacy('handle_city_sabotage_list', handle_city_sabotage_list);

// Player
exposeToLegacy('handle_player_info', handle_player_info);
exposeToLegacy('handle_web_player_info_addition', handle_web_player_info_addition);
exposeToLegacy('handle_player_remove', handle_player_remove);
exposeToLegacy('handle_player_attribute_chunk', handle_player_attribute_chunk);
exposeToLegacy('handle_player_diplstate', handle_player_diplstate);

// Unit
exposeToLegacy('handle_unit_remove', handle_unit_remove);
exposeToLegacy('handle_unit_info', handle_unit_info);
exposeToLegacy('handle_unit_short_info', handle_unit_short_info);
exposeToLegacy('handle_unit_combat_info', handle_unit_combat_info);
exposeToLegacy('handle_unit_action_answer', handle_unit_action_answer);
exposeToLegacy('handle_unit_actions', handle_unit_actions);

// Diplomacy
exposeToLegacy('handle_diplomacy_init_meeting', handle_diplomacy_init_meeting);
exposeToLegacy('handle_diplomacy_cancel_meeting', handle_diplomacy_cancel_meeting);
exposeToLegacy('handle_diplomacy_create_clause', handle_diplomacy_create_clause);
exposeToLegacy('handle_diplomacy_remove_clause', handle_diplomacy_remove_clause);
exposeToLegacy('handle_diplomacy_accept_treaty', handle_diplomacy_accept_treaty);

// Chat/message
exposeToLegacy('handle_chat_msg', handle_chat_msg);
exposeToLegacy('handle_early_chat_msg', handle_early_chat_msg);
exposeToLegacy('handle_page_msg', handle_page_msg);
exposeToLegacy('handle_page_msg_part', handle_page_msg_part);

// Turn/phase
exposeToLegacy('handle_begin_turn', handle_begin_turn);
exposeToLegacy('handle_end_turn', handle_end_turn);
exposeToLegacy('handle_start_phase', handle_start_phase);
exposeToLegacy('handle_end_phase', handle_end_phase);

// Research
exposeToLegacy('handle_research_info', handle_research_info);

// Endgame/scenario
exposeToLegacy('handle_endgame_report', handle_endgame_report);
exposeToLegacy('handle_scenario_info', handle_scenario_info);
exposeToLegacy('handle_scenario_description', handle_scenario_description);
exposeToLegacy('handle_single_want_hack_reply', handle_single_want_hack_reply);

// Vote/edit
exposeToLegacy('handle_vote_new', handle_vote_new);
exposeToLegacy('handle_vote_update', handle_vote_update);
exposeToLegacy('handle_vote_remove', handle_vote_remove);
exposeToLegacy('handle_vote_resolve', handle_vote_resolve);
exposeToLegacy('handle_edit_startpos', handle_edit_startpos);
exposeToLegacy('handle_edit_startpos_full', handle_edit_startpos_full);
exposeToLegacy('handle_edit_object_created', handle_edit_object_created);

// Goto
exposeToLegacy('handle_web_goto_path', handle_web_goto_path);

// Action decision helpers
exposeToLegacy('action_decision_handle', action_decision_handle);
exposeToLegacy('action_decision_maybe_auto', action_decision_maybe_auto);
exposeToLegacy('update_client_state', update_client_state);
exposeToLegacy('recreate_old_tech_req', recreate_old_tech_req);

// Packet dispatch
exposeToLegacy('packet_hand_table', packet_hand_table);
exposeToLegacy('client_handle_packet', client_handle_packet);
exposeToLegacy('register_packet_handler', register_packet_handler);

// Connection management (migrated from connection.js)
function find_conn_by_id(id: number): any {
  return w.connections[id];
}

function client_remove_cli_conn(connection: any): void {
  delete w.connections[connection['id']];
}

function conn_list_append(connection: any): void {
  w.connections[connection['id']] = connection;
}

exposeToLegacy('find_conn_by_id', find_conn_by_id);
exposeToLegacy('client_remove_cli_conn', client_remove_cli_conn);
exposeToLegacy('conn_list_append', conn_list_append);

// Module-local state exposed for legacy access
exposeToLegacy('terrain_control', terrain_control);
