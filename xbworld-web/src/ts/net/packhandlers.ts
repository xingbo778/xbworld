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

const w = window as any;

// ============================================================================
// Module-local state (was var in packhand.js)
// ============================================================================
export let terrain_control: any = {};
let roads: any[] = [];
let bases: any[] = [];
let page_msg: any = {};

// Also expose these so legacy JS can access them
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

export function handle_processing_started(_packet: any): void {
  w.client_frozen = true;
}

export function handle_processing_finished(_packet: any): void {
  w.client_frozen = false;
}

export function handle_investigate_started(_packet: any): void { /* no-op */ }
export function handle_investigate_finished(_packet: any): void { /* no-op */ }

export function handle_freeze_hint(_packet: any): void {
  w.client_frozen = true;
}

export function handle_thaw_hint(_packet: any): void {
  w.client_frozen = false;
}

export function handle_freeze_client(_packet: any): void {
  w.client_frozen = true;
}

export function handle_thaw_client(_packet: any): void {
  w.client_frozen = false;
}

// ============================================================================
// Batch 2: Pure data assignment — ruleset handlers
// ============================================================================

export function handle_ruleset_terrain(packet: any): void {
  if (packet['name'] === 'Lake') packet['graphic_str'] = packet['graphic_alt'];
  if (packet['name'] === 'Glacier') packet['graphic_str'] = 'tundra';
  w.terrains[packet['id']] = packet;
}

export function handle_ruleset_resource(packet: any): void {
  w.resources[packet['id']] = packet;
}

export function handle_ruleset_game(packet: any): void {
  w.game_rules = packet;
}

export function handle_ruleset_specialist(packet: any): void {
  w.specialists[packet['id']] = packet;
}

export function handle_ruleset_nation_groups(packet: any): void {
  w.nation_groups = packet['groups'];
}

export function handle_ruleset_nation(packet: any): void {
  w.nations[packet['id']] = packet;
}

export function handle_ruleset_city(packet: any): void {
  w.city_rules[packet['style_id']] = packet;
}

export function handle_ruleset_government(packet: any): void {
  w.governments[packet['id']] = packet;
}

export function handle_ruleset_summary(packet: any): void {
  w.ruleset_summary = packet['text'];
}

export function handle_ruleset_description_part(packet: any): void {
  if (w.ruleset_description == null) {
    w.ruleset_description = packet['text'];
  } else {
    w.ruleset_description += packet['text'];
  }
}

export function handle_ruleset_action(packet: any): void {
  w.actions[packet['id']] = packet;
  packet['enablers'] = [];
}

export function handle_ruleset_goods(packet: any): void {
  w.goods[packet['id']] = packet;
}

export function handle_ruleset_clause(packet: any): void {
  w.clause_infos[packet['type']] = packet;
}

export function handle_game_info(packet: any): void {
  w.game_info = packet;
}

export function handle_calendar_info(packet: any): void {
  w.calendar_info = packet;
}

export function handle_spaceship_info(_packet: any): void {
  // spaceship/spacerace feature removed
}

export function handle_ruleset_effect(packet: any): void {
  if (w.effects[packet['effect_type']] == null) {
    w.effects[packet['effect_type']] = [];
  }
  w.effects[packet['effect_type']].push(packet);
}

export function handle_new_year(packet: any): void {
  w.game_info['year'] = packet['year'];
  w.game_info['fragments'] = packet['fragments'];
  w.game_info['turn'] = packet['turn'];
}

export function handle_timeout_info(packet: any): void {
  w.last_turn_change_time = Math.ceil(packet['last_turn_change_time']);
  w.seconds_to_phasedone = Math.floor(packet['seconds_to_phasedone']);
  w.seconds_to_phasedone_sync = new Date().getTime();
}

export function handle_trade_route_info(packet: any): void {
  if (w.city_trade_routes[packet['city']] == null) {
    w.city_trade_routes[packet['city']] = {};
  }
  w.city_trade_routes[packet['city']][packet['index']] = packet;
}

export function handle_endgame_player(packet: any): void {
  w.endgame_player_info.push(packet);
}

export function handle_unknown_research(packet: any): void {
  delete w.research_data[packet['id']];
}

// ============================================================================
// Batch 3: Ruleset handlers with logic
// ============================================================================

export function handle_ruleset_unit(packet: any): void {
  if (packet['name'] != null && packet['name'].indexOf('?unit:') === 0) {
    packet['name'] = packet['name'].replace('?unit:', '');
  }
  packet['flags'] = new w.BitVector(packet['flags']);
  w.unit_types[packet['id']] = packet;
}

export function handle_web_ruleset_unit_addition(packet: any): void {
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
export function recreate_old_tech_req(packet: any): void {
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

export function handle_ruleset_tech(packet: any): void {
  if (packet['name'] != null && packet['name'].indexOf('?tech:') === 0) {
    packet['name'] = packet['name'].replace('?tech:', '');
  }
  w.techs[packet['id']] = packet;
  recreate_old_tech_req(packet);
}

export function handle_ruleset_tech_class(_packet: any): void { /* TODO */ }
export function handle_ruleset_tech_flag(_packet: any): void { /* TODO */ }

export function handle_ruleset_terrain_control(packet: any): void {
  terrain_control = packet;
  w.terrain_control = packet;
  w.SINGLE_MOVE = packet['move_fragments'];
}

export function handle_ruleset_building(packet: any): void {
  w.improvements[packet['id']] = packet;
}

export function handle_ruleset_unit_class(packet: any): void {
  packet['flags'] = new w.BitVector(packet['flags']);
  w.unit_classes[packet['id']] = packet;
}

export function handle_ruleset_disaster(_packet: any): void { /* TODO */ }
export function handle_ruleset_trade(_packet: any): void { /* TODO */ }
export function handle_rulesets_ready(_packet: any): void { /* TODO */ }
export function handle_ruleset_choices(_packet: any): void { /* TODO */ }
export function handle_game_load(_packet: any): void { /* TODO */ }
export function handle_ruleset_unit_flag(_packet: any): void { /* TODO */ }
export function handle_ruleset_unit_class_flag(_packet: any): void { /* TODO */ }
export function handle_ruleset_unit_bonus(_packet: any): void { /* TODO */ }
export function handle_ruleset_terrain_flag(_packet: any): void { /* TODO */ }
export function handle_ruleset_impr_flag(_packet: any): void { /* TODO */ }
export function handle_ruleset_government_ruler_title(_packet: any): void { /* TODO */ }

export function handle_ruleset_base(packet: any): void {
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

export function handle_ruleset_road(packet: any): void {
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

export function handle_ruleset_action_enabler(packet: any): void {
  const paction = w.actions[packet.enabled_action];
  if (paction === undefined) {
    console.log("Unknown action " + packet.action + " for enabler ");
    console.log(packet);
    return;
  }
  paction.enablers.push(packet);
}

export function handle_ruleset_extra(packet: any): void {
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

export function handle_ruleset_counter(_packet: any): void { /* TODO */ }
export function handle_ruleset_extra_flag(_packet: any): void { /* TODO */ }
export function handle_ruleset_nation_sets(_packet: any): void { /* TODO */ }
export function handle_ruleset_style(_packet: any): void { /* TODO */ }
export function handle_nation_availability(_packet: any): void { /* TODO */ }
export function handle_ruleset_music(_packet: any): void { /* TODO */ }
export function handle_ruleset_multiplier(_packet: any): void { /* TODO */ }
export function handle_ruleset_action_auto(_packet: any): void { /* TODO */ }
export function handle_ruleset_achievement(_packet: any): void { /* TODO */ }
export function handle_achievement_info(_packet: any): void { /* TODO */ }
export function handle_team_name_info(_packet: any): void { /* TODO */ }
export function handle_popup_image(_packet: any): void { /* TODO */ }
export function handle_worker_task(_packet: any): void { /* TODO */ }
export function handle_play_music(_packet: any): void { /* TODO */ }

// ============================================================================
// Batch 4: Handlers with UI calls (call legacy UI functions via window)
// ============================================================================

export function handle_server_join_reply(packet: any): void {
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

    if (w.autostart) {
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

export function handle_conn_info(packet: any): void {
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

export function handle_tile_info(packet: any): void {
  if (w.tiles != null) {
    packet['extras'] = new w.BitVector(packet['extras']);

    Object.assign(w.tiles[packet['tile']], packet);

    if (typeof w.mark_tile_dirty === 'function') {
      w.mark_tile_dirty(packet['tile']);
    }
  }
}

export function handle_chat_msg(packet: any): void {
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

export function handle_early_chat_msg(packet: any): void {
  handle_chat_msg(packet);
}

export function handle_city_info(packet: any): void {
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

export function handle_city_nationalities(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
}

export function handle_city_rally_point(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
}

export function handle_web_city_info_addition(packet: any): void {
  if (w.cities[packet['id']] != null) {
    Object.assign(w.cities[packet['id']], packet);
  }
  // Trigger UI update after city info is complete
  if (typeof w.update_city_info_dialog === 'function') {
    w.update_city_info_dialog();
  }
}

export function handle_city_short_info(packet: any): void {
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

export function handle_city_update_counters(packet: any): void {
  if (w.cities[packet['id']] != null) {
    w.cities[packet['id']]['counters'] = packet['counters'];
  }
}

export function handle_city_update_counter(_packet: any): void { /* TODO */ }

export function handle_player_info(packet: any): void {
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

export function handle_web_player_info_addition(packet: any): void {
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

export function handle_player_remove(packet: any): void {
  delete w.players[packet['playerno']];
  w.update_player_info_pregame();
}

export function handle_conn_ping(packet: any): void {
  w.ping_last = new Date().getTime();
  const pong_packet = { 'pid': w.packet_conn_pong };
  w.send_request(JSON.stringify(pong_packet));
}

export function handle_set_topology(_packet: any): void { /* TODO */ }

export function handle_map_info(packet: any): void {
  w.map = packet;
  w.map_init_topology(false);
  w.map_allocate();
  w.mapdeco_init();

}

export function handle_authentication_req(packet: any): void {
  w.show_auth_dialog(packet);
}

export function handle_server_shutdown(_packet: any): void { /* TODO */ }

export function handle_nuke_tile_info(packet: any): void {
  const ptile = w.index_to_tile(packet['tile']);
  ptile['nuke'] = 60;
  w.play_sound('LrgExpl.ogg');
}

export function handle_city_remove(packet: any): void {
  w.remove_city(packet['city_id']);
}

export function handle_connect_msg(packet: any): void {
  w.add_chatbox_text(packet);
}

export function handle_server_info(packet: any): void {
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

export function handle_city_name_suggestion_info(packet: any): void {
  packet['name'] = decodeURIComponent(packet['name']);
  w.city_name_dialog(packet['name'], packet['unit_id']);
}

export function handle_city_sabotage_list(packet: any): void {
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

export function handle_player_attribute_chunk(_packet: any): void { /* no-op */ }

export function handle_unit_remove(packet: any): void {
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
}

export function handle_unit_info(packet: any): void {
  if (typeof w.mark_tile_dirty === 'function' && packet['tile'] != null) {
    w.mark_tile_dirty(packet['tile']);
    const old_unit = w.units[packet['id']];
    if (old_unit != null && old_unit['tile'] !== packet['tile']) {
      w.mark_tile_dirty(old_unit['tile']);
    }
  }
  handle_unit_packet_common(packet);
}

export function handle_unit_short_info(packet: any): void {
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
export function action_decision_handle(punit: any): void {
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
export function action_decision_maybe_auto(
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
export function update_client_state(value: any): void {
  w.set_client_state(value);
}

export function handle_unit_packet_common(packet_unit: any): void {
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

}

export function handle_unit_combat_info(packet: any): void {
  const attacker = w.units[packet['attacker_unit_id']];
  const defender = w.units[packet['defender_unit_id']];
  const attacker_hp = packet['attacker_hp'];
  const defender_hp = packet['defender_hp'];

  if (attacker_hp === 0 && w.is_unit_visible(attacker)) {
    w.explosion_anim_map[attacker['tile']] = 25;
  }
  if (defender_hp === 0 && w.is_unit_visible(defender)) {
    w.explosion_anim_map[defender['tile']] = 25;
  }
}

export function handle_unit_action_answer(packet: any): void {
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

export function handle_unit_actions(packet: any): void {
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

export function handle_diplomacy_init_meeting(packet: any): void {
  w.diplomacy_clause_map[packet['counterpart']] = [];
  w.show_diplomacy_dialog(packet['counterpart']);
  w.show_diplomacy_clauses(packet['counterpart']);
}

export function handle_diplomacy_cancel_meeting(packet: any): void {
  w.cancel_meeting(packet['counterpart']);
}

export function handle_diplomacy_create_clause(packet: any): void {
  const counterpart_id = packet['counterpart'];
  if (w.diplomacy_clause_map[counterpart_id] == null) {
    w.diplomacy_clause_map[counterpart_id] = [];
  }
  w.diplomacy_clause_map[counterpart_id].push(packet);
  w.show_diplomacy_clauses(counterpart_id);
}

export function handle_diplomacy_remove_clause(packet: any): void {
  w.remove_clause(packet);
}

export function handle_diplomacy_accept_treaty(packet: any): void {
  w.accept_treaty(packet['counterpart'],
                  packet['I_accepted'],
                  packet['other_accepted']);
}

export function handle_page_msg(packet: any): void {
  page_msg['headline'] = packet['headline'];
  page_msg['caption'] = packet['caption'];
  page_msg['event'] = packet['event'];
  page_msg['missing_parts'] = packet['parts'];
  page_msg['message'] = '';
}

export function handle_page_msg_part(packet: any): void {
  page_msg['message'] = page_msg['message'] + packet['lines'];
  page_msg['missing_parts']--;

  if (page_msg['missing_parts'] === 0) {
    const regxp = /\n/gi;
    page_msg['message'] = page_msg['message'].replace(regxp, '<br>\n');
    w.show_dialog_message(page_msg['headline'], page_msg['message']);
    page_msg = {};
  }
}

export function handle_conn_ping_info(packet: any): void {
  if (w.debug_active) {
    w.conn_ping_info = packet;
    w.debug_ping_list.push(packet['ping_time'][0] * 1000);
  }
}

export function handle_end_phase(_packet: any): void {
  w.chatbox_clip_messages();
}

export function handle_start_phase(_packet: any): void {
  w.set_client_state(w.C_S_RUNNING);
  w.set_phase_start();
  w.saved_this_turn = false;
}

export function handle_ruleset_control(packet: any): void {
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

export function handle_endgame_report(_packet: any): void {
  w.set_client_state(w.C_S_OVER);
}

export function handle_scenario_info(packet: any): void {
  w.scenario_info = packet;
}

export function handle_scenario_description(packet: any): void {
  w.scenario_info['description'] = packet['description'];
  w.update_game_info_pregame();
}

export function handle_single_want_hack_reply(packet: any): void {
  if (typeof w.handle_single_want_hack_reply_orig === 'function') {
    w.handle_single_want_hack_reply_orig(packet);
  }
}

export function handle_vote_new(_packet: any): void { /* TODO */ }
export function handle_vote_update(_packet: any): void { /* TODO */ }
export function handle_vote_remove(_packet: any): void { /* TODO */ }
export function handle_vote_resolve(_packet: any): void { /* TODO */ }
export function handle_edit_startpos(_packet: any): void { /* no-op */ }
export function handle_edit_startpos_full(_packet: any): void { /* no-op */ }
export function handle_edit_object_created(_packet: any): void { /* no-op */ }

export function handle_server_setting_const(packet: any): void {
  w.server_settings[packet['id']] = packet;
  w.server_settings[packet['name']] = packet;
}

export function handle_server_setting_int(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

export function handle_server_setting_enum(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

export function handle_server_setting_bitwise(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

export function handle_server_setting_bool(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

export function handle_server_setting_str(packet: any): void {
  Object.assign(w.server_settings[packet['id']], packet);
}

export function handle_server_setting_control(_packet: any): void { /* TODO */ }

export function handle_player_diplstate(packet: any): void {
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

export function handle_web_goto_path(packet: any): void {
  if (w.goto_active) {
    w.update_goto_path(packet);
  }
}

export function handle_research_info(packet: any): void {
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

export function handle_begin_turn(_packet: any): void {
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

export function handle_end_turn(_packet: any): void {
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
export const packet_hand_table: Record<number, (packet: any) => void> = {
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
export function client_handle_packet(packets: any[]): void {
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
export function register_packet_handler(pid: number, handler: (packet: any) => void): void {
  packet_hand_table[pid] = handler;
}

// ============================================================================
// Expose ALL handlers and dispatch to Legacy
// ============================================================================

// Freeze/thaw
// Ruleset data
// Game state
// Server/connection
// Map/tile
// City
// Player
// Unit
// Diplomacy
// Chat/message
// Turn/phase
// Research
// Endgame/scenario
// Vote/edit
// Goto
// Action decision helpers
// Packet dispatch
// Connection management (migrated from connection.js)
export function find_conn_by_id(id: number): any {
  return w.connections[id];
}

export function client_remove_cli_conn(connection: any): void {
  delete w.connections[connection['id']];
}

export function conn_list_append(connection: any): void {
  w.connections[connection['id']] = connection;
}

// Module-local state exposed for legacy access
