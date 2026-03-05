/**
 * Unit focus management — tracking which units are selected / active.
 *
 * Extracted from core/control.ts
 */

import { store } from '../../data/store';
import { cityOwnerPlayerId as city_owner_player_id, cityTile as city_tile } from '../../data/city';
import { unit_type, unit_list_size, unit_list_without } from '../../data/unit';
import { game_find_unit_by_number as _game_find_unit_by_number } from '../../data/game';
import { utype_can_do_action, utype_can_do_action_result, can_player_build_unit_direct } from '../../data/unittype';
import { mapPosToTile as map_pos_to_tile, indexToTile as index_to_tile } from '../../data/map';
import { tileCity as tile_city, tileHasExtra as tile_has_extra } from '../../data/tile';
import { tile_units } from '../../data/unit';
import { tileTerrain as tile_terrain } from '../../data/terrain';
import { playerInventionState as player_invention_state, techIdByName as tech_id_by_name, TECH_UNKNOWN, TECH_KNOWN } from '../../data/tech';
import { clientIsObserver as client_is_observer, clientState as client_state, C_S_RUNNING } from '../../client/clientState';
import { improvement_id_by_name, B_AIRPORT_NAME } from '../../data/improvement';
import { ACTIVITY_IDLE } from '../../data/fcTypes';
import { EXTRA_NONE } from '../../data/extra';
import { IDENTITY_NUMBER_ZERO } from '../../core/constants';
import { ServerSideAgent } from '../../data/unit';
import { isTouchDevice as is_touch_device, stringUnqualify as string_unqualify } from '../../utils/helpers';
import { close_city_dialog } from '../../ui/cityDialog';
import { message_log } from '../../core/messages';
import { E_BEGINNER_HELP } from '../../data/eventConstants';
import { get_what_can_unit_pillage_from } from '../../data/unit';
import * as S from './controlState';
// Circular imports — OK, only used inside functions
import { should_ask_server_for_actions, can_ask_server_for_actions, action_selection_next_in_focus } from './actionSelection';
import { request_new_unit_activity } from './unitCommands';

const FC_ACTIVITY_IDLE = ACTIVITY_IDLE;
const FC_SSA_NONE = ServerSideAgent.NONE;
const FC_IDENTITY_NUMBER_ZERO = IDENTITY_NUMBER_ZERO;
const FC_EXTRA_NONE = EXTRA_NONE;
const FC_B_AIRPORT_NAME = B_AIRPORT_NAME;
const FC_TECH_UNKNOWN = TECH_UNKNOWN;
const FC_TECH_KNOWN = TECH_KNOWN;

declare const $: any;
declare const client: any;
declare const game_info: any;
declare const active_city: any;
declare const observing: boolean;
declare const auto_center_on_unit: boolean;
declare const terrain_control: any;
declare const EXTRA_ROAD: number;
declare const EXTRA_RIVER: number;
declare const EXTRA_RAIL: number;
declare const EXTRA_MAGLEV: number;
declare const EXTRA_MINE: number;
declare const EXTRA_POLLUTION: number;
declare const EXTRA_FALLOUT: number;
declare function center_tile_mapcanvas(tile: any): void;
declare function update_unit_position(ptile: any): void;
declare function get_unit_image_sprite(unit: any): any;
declare function game_find_unit_by_number(id: number): any;
declare const normal_tile_height: number;
declare function tile_units_func(ptile: any): any[];
declare function get_unit_homecity_name(unit: any): string | null;
declare function get_unit_moves_left(unit: any): string;
declare function map_city_tile(city: any): any;

// Action constants accessed as globals
declare const FC_ACTION_FOUND_CITY: number;
declare const FC_ACTION_JOIN_CITY: number;
declare const FC_ACTION_NUKE: number;
declare const FC_ACTION_TRANSFORM_TERRAIN: number;
declare const FC_ACTRES_PARADROP: number;
declare const FC_ACTRES_PARADROP_CONQUER: number;
declare const FC_EXTRA_IRRIGATION: number;
declare const FC_EXTRA_FARMLAND: number;

const FC_EXTRA_ROAD = typeof EXTRA_ROAD !== 'undefined' ? EXTRA_ROAD : 0;
const FC_EXTRA_RIVER = typeof EXTRA_RIVER !== 'undefined' ? EXTRA_RIVER : 1;
const FC_EXTRA_RAIL = typeof EXTRA_RAIL !== 'undefined' ? EXTRA_RAIL : 2;
const FC_EXTRA_MAGLEV = typeof EXTRA_MAGLEV !== 'undefined' ? EXTRA_MAGLEV : 3;
const FC_EXTRA_MINE = typeof EXTRA_MINE !== 'undefined' ? EXTRA_MINE : 4;
const FC_EXTRA_POLLUTION = typeof EXTRA_POLLUTION !== 'undefined' ? EXTRA_POLLUTION : 5;
const FC_EXTRA_FALLOUT = typeof EXTRA_FALLOUT !== 'undefined' ? EXTRA_FALLOUT : 6;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function get_focus_unit_on_tile(ptile: any): any {
  const funits = get_units_in_focus();
  if (funits == null) return null;

  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    if (punit['tile'] == ptile['index']) {
      return punit;
    }
  }
  return null;
}

export function unit_is_in_focus(cunit: any): boolean {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    if (punit['id'] == cunit['id']) {
      return true;
    }
  }
  return false;
}

export function get_units_in_focus(): any[] {
  return S.current_focus;
}

export function unit_focus_urgent(punit: any): void {
  if (punit == null || punit['activity'] == null) {
    console.log("unit_focus_urgent(): not a unit");
    console.log(punit);
    return;
  }

  S.urgent_focus_queue.push(punit);
}

export function control_unit_killed(punit: any): void {
  if (S.urgent_focus_queue != null) {
    S.setUrgentFocusQueue(unit_list_without(S.urgent_focus_queue, punit));
  }

  if (unit_is_in_focus(punit)) {
    if (S.current_focus.length == 1) {
      advance_unit_focus();
    } else {
      S.setCurrentFocus(unit_list_without(S.current_focus, punit));
    }

    update_active_units_dialog();
    update_unit_order_commands();
  }
}

export function update_unit_focus(): void {
  if (active_city != null) return;

  if (C_S_RUNNING != client_state()) return;

  if (!can_ask_server_for_actions()) {
    if (get_units_in_focus().length < 1) {
      console.log("update_unit_focus(): action selection dialog open for"
        + " unit %d but unit not in focus?",
        S.action_selection_in_progress_for);
    } else {
      return;
    }
  }

  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];

    if (punit['movesleft'] > 0
      && !punit['done_moving']
      && punit['ssa_controller'] == FC_SSA_NONE
      && punit['activity'] == FC_ACTIVITY_IDLE) {
      return;
    }
  }

  advance_unit_focus();
}

export function advance_unit_focus(): void {
  let candidate: any = null;
  let i: number;

  if (client_is_observer()) return;

  if (S.urgent_focus_queue.length > 0) {
    const focus_tile = (S.current_focus != null && S.current_focus.length > 0
      ? S.current_focus[0]['tile']
      : -1);

    for (i = 0; i < S.urgent_focus_queue.length; i++) {
      const punit = store.units[S.urgent_focus_queue[i]['id']];

      if ((FC_ACTIVITY_IDLE != punit.activity
        || punit.has_orders)
        && !should_ask_server_for_actions(punit)) {
        S.setUrgentFocusQueue(unit_list_without(S.urgent_focus_queue, punit));
        i--;
      } else if (-1 == focus_tile
        || focus_tile == punit['tile']) {
        candidate = punit;
        break;
      } else if (null == candidate) {
        candidate = punit;
      }
    }

    if (null != candidate) {
      S.setUrgentFocusQueue(unit_list_without(S.urgent_focus_queue, candidate));
    }
  }

  if (candidate == null) {
    candidate = find_best_focus_candidate(false);
  }

  if (candidate == null) {
    candidate = find_best_focus_candidate(true);
  }

  if (candidate != null) {
    set_unit_focus_and_redraw(candidate);
  } else {
    S.setCurrentFocus([]);
    update_active_units_dialog();
    $("#game_unit_orders_default").hide();

    if (game_info['turn'] <= 1) {
      for (const city_id_str in store.cities) {
        const city_id = parseInt(city_id_str);
        const pcity = store.cities[city_id];
        if (city_owner_player_id(pcity) == client.conn.playing.playerno) {
          center_tile_mapcanvas(map_city_tile(pcity));
          break;
        }
      }
    }
    $("#turn_done_button").button("option", "label", "<i class='fa fa-check-circle-o' style='color: green;'aria-hidden='true'></i> Turn Done");
    if (!S.end_turn_info_message_shown) {
      S.setEndTurnInfoMessageShown(true);
      message_log.update({ event: E_BEGINNER_HELP, message: "All units have moved, click the \"Turn Done\" button to end your turn." });
    }
  }
}

export function update_unit_order_commands(): { [key: string]: any } {
  let i: number;
  let punit: any;
  let ptype: any;
  let pcity: any;
  let ptile: any;
  let unit_actions: { [key: string]: any } = {};
  const funits = get_units_in_focus();
  for (i = 0; i < funits.length; i++) {
    punit = funits[i];
    ptile = index_to_tile(punit['tile']);
    if (ptile == null) continue;
    pcity = tile_city(ptile);

    if (pcity != null) {
      unit_actions["show_city"] = { name: "Show city" };
    }
  }

  for (i = 0; i < funits.length; i++) {
    punit = funits[i];
    ptype = unit_type(punit);
    ptile = index_to_tile(punit['tile']);
    if (ptile == null) continue;
    pcity = tile_city(ptile);

    if (utype_can_do_action(ptype, FC_ACTION_FOUND_CITY)
      && pcity == null) {
      $("#order_build_city").show();
      unit_actions["build"] = { name: "Build city (B)" };
    } else if (utype_can_do_action(ptype, FC_ACTION_JOIN_CITY)
      && pcity != null) {
      $("#order_build_city").show();
      unit_actions["build"] = { name: "Join city (B)" };
    } else {
      $("#order_build_city").hide();
    }

    if (ptype['name'] == "Explorer") {
      unit_actions["explore"] = { name: "Auto explore (X)" };
    }

  }

  unit_actions = $.extend(unit_actions, {
    "goto": { name: "Unit goto (G)" },
    "tile_info": { name: "Tile info" }
  });

  for (i = 0; i < funits.length; i++) {
    punit = funits[i];
    ptype = unit_type(punit);
    ptile = index_to_tile(punit['tile']);
    if (ptile == null) continue;
    pcity = tile_city(ptile);

    if (ptype['name'] == "Settlers" || ptype['name'] == "Workers"
      || ptype['name'] == "Engineers") {

      if (ptype['name'] == "Settlers") unit_actions["autoworkers"] = { name: "Auto settler (A)" };
      if (ptype['name'] == "Workers") unit_actions["autoworkers"] = { name: "Auto workers (A)" };
      if (ptype['name'] == "Engineers") unit_actions["autoworkers"] = { name: "Auto engineers (A)" };

      if (!tile_has_extra(ptile, FC_EXTRA_ROAD)) {
        $("#order_railroad").hide();
        $("#order_maglev").hide();
        if (!(tile_has_extra(ptile, FC_EXTRA_RIVER)
          && player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building') as unknown as number) == FC_TECH_UNKNOWN)) {
          unit_actions["road"] = { name: "Build road (R)" };
          $("#order_road").show();
        } else {
          $("#order_road").hide();
        }
      } else if (!tile_has_extra(ptile, FC_EXTRA_RAIL)
        && player_invention_state(client.conn.playing,
          tech_id_by_name('Railroad') as unknown as number) == FC_TECH_KNOWN
        && tile_has_extra(ptile, FC_EXTRA_ROAD)) {
        $("#order_road").hide();
        $("#order_maglev").hide();
        $("#order_railroad").show();
        unit_actions['railroad'] = { name: "Build railroad (R)" };
      } else if (typeof FC_EXTRA_MAGLEV !== 'undefined'
        && !tile_has_extra(ptile, FC_EXTRA_MAGLEV)
        && player_invention_state(client.conn.playing,
          tech_id_by_name('Superconductors') as unknown as number) == FC_TECH_KNOWN
        && tile_has_extra(ptile, FC_EXTRA_RAIL)) {
        $("#order_road").hide();
        $("#order_railroad").hide();
        $("#order_maglev").show();
        unit_actions['maglev'] = { name: "Build maglev (R)" };
      } else {
        $("#order_road").hide();
        $("#order_railroad").hide();
        $("#order_maglev").hide();
      }

      $("#order_fortify").hide();
      $("#order_sentry").hide();
      $("#order_explore").hide();
      $("#order_auto_workers").show();
      $("#order_clean").show();
      if (!tile_has_extra(ptile, FC_EXTRA_MINE)
        && (tile_terrain(ptile) as any)['mining_time'] > 0) {
        $("#order_mine").show();
        unit_actions["mine"] = { name: "Mine (M)" };
      } else {
        $("#order_mine").hide();
      }

      if (tile_has_extra(ptile, FC_EXTRA_POLLUTION)
        || tile_has_extra(ptile, FC_EXTRA_FALLOUT)) {
        $("#order_clean").show();
        unit_actions["clean"] = { name: "Remove pollution (P)" };
      } else {
        $("#order_clean").hide();
      }

      if ((tile_terrain(ptile) as any)['cultivate_time'] > 0) {
        $("#order_forest_remove").show();
        unit_actions["cultivate"] = { name: "Cultivate (I)" };
      } else {
        $("#order_forest_remove").hide();
      }
      if ((tile_terrain(ptile) as any)['irrigation_time'] > 0) {
        if (!tile_has_extra(ptile, FC_EXTRA_IRRIGATION)) {
          $("#order_irrigate").show();
          $("#order_build_farmland").hide();
          unit_actions["irrigation"] = { name: "Irrigation (I)" };
        } else if (!tile_has_extra(ptile, FC_EXTRA_FARMLAND) && player_invention_state(client.conn.playing, tech_id_by_name('Refrigeration') as unknown as number) == FC_TECH_KNOWN) {
          $("#order_build_farmland").show();
          $("#order_irrigate").hide();
          unit_actions["irrigation"] = { name: "Build farmland (I)" };
        } else {
          $("#order_irrigate").hide();
          $("#order_build_farmland").hide();
        }
      } else {
        $("#order_irrigate").hide();
        $("#order_build_farmland").hide();
      }
      if ((tile_terrain(ptile) as any)['plant_time'] > 0) {
        $("#order_forest_add").show();
        unit_actions["plant"] = { name: "Plant (M)" };
      } else {
        $("#order_forest_add").hide();
      }
      if (player_invention_state(client.conn.playing, tech_id_by_name('Construction') as unknown as number) == FC_TECH_KNOWN) {
        unit_actions["fortress"] = { name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)" };
      }

      if (player_invention_state(client.conn.playing, tech_id_by_name('Radio') as unknown as number) == FC_TECH_KNOWN) {
        unit_actions["airbase"] = { name: string_unqualify(terrain_control['gui_type_base1']) + " (E)" };
      }

    } else {
      $("#order_road").hide();
      $("#order_railroad").hide();
      $("#order_mine").hide();
      $("#order_irrigate").hide();
      $("#order_build_farmland").hide();
      $("#order_fortify").show();
      $("#order_auto_workers").hide();
      $("#order_sentry").show();
      $("#order_explore").show();
      $("#order_clean").hide();
      unit_actions["fortify"] = { name: "Fortify (F)" };
    }

    unit_actions["action_selection"] = { name: "Do... (D)" };

    if (utype_can_do_action(ptype, FC_ACTION_TRANSFORM_TERRAIN)) {
      $("#order_transform").show();
      unit_actions["transform"] = { name: "Transform terrain (O)" };
    } else {
      $("#order_transform").hide();
    }

    if (utype_can_do_action(ptype, FC_ACTION_NUKE)) {
      $("#order_nuke").show();
      unit_actions["nuke"] = { name: "Detonate Nuke At (Shift-N)" };
    } else {
      $("#order_nuke").hide();
    }

    if (utype_can_do_action_result(ptype, FC_ACTRES_PARADROP)
      || utype_can_do_action_result(ptype, FC_ACTRES_PARADROP_CONQUER)) {
      $("#order_paradrop").show();
      unit_actions["paradrop"] = { name: "Paradrop" };
    } else {
      $("#order_paradrop").hide();
    }

    if (!client_is_observer() && client.conn.playing != null
      && get_what_can_unit_pillage_from(punit, ptile).length > 0
      && (pcity == null || city_owner_player_id(pcity) !== client.conn.playing.playerno)) {
      $("#order_pillage").show();
      unit_actions["pillage"] = { name: "Pillage (Shift-P)" };
    } else {
      $("#order_pillage").hide();
    }

    if (pcity == null || punit['homecity'] === 0 || punit['homecity'] === pcity['id']) {
      $("#order_change_homecity").hide();
    } else if (punit['homecity'] != pcity['id']) {
      $("#order_change_homecity").show();
      unit_actions["homecity"] = { name: "Change homecity of unit (H)" };
    }

    if (pcity != null && city_has_building(pcity, improvement_id_by_name(FC_B_AIRPORT_NAME))) {
      unit_actions["airlift"] = { name: "Airlift (Shift-L)" };
    }

    if (pcity != null && ptype != null && store.unitTypes[ptype['obsoleted_by']] != null && can_player_build_unit_direct(client.conn.playing, store.unitTypes[ptype['obsoleted_by']])) {
      unit_actions["upgrade"] = { name: "Upgrade unit (U)" };
    }
    if (ptype != null && ptype['name'] != "Explorer") {
      unit_actions["explore"] = { name: "Auto explore (X)" };
    }

    // Load unit on transport
    if (pcity != null) {
      const units_on_tile = tile_units_func(ptile);
      for (let r = 0; r < units_on_tile.length; r++) {
        const tunit = units_on_tile[r];
        if (tunit['id'] == punit['id']) continue;
        const ntype = unit_type(tunit) as any;
        if (ntype != null && ntype['transport_capacity'] > 0) unit_actions["unit_load"] = { name: "Load on transport (L)" };
      }
    }

    // Unload unit from transport
    const units_on_tile = tile_units_func(ptile);
    if (ptype['transport_capacity'] > 0 && units_on_tile.length >= 2) {
      for (let r = 0; r < units_on_tile.length; r++) {
        const tunit = units_on_tile[r];
        if (tunit['transported']) {
          unit_actions["unit_show_cargo"] = { name: "Activate cargo units" };
          if (pcity != null) unit_actions["unit_unload"] = { name: "Unload units from transport (T)" };
        }
      }
    }

    if (punit.activity != FC_ACTIVITY_IDLE
      || punit.ssa_controller != FC_SSA_NONE
      || punit.has_orders) {
      unit_actions["idle"] = { name: "Cancel orders (Shift-J)" };
    } else {
      unit_actions["noorders"] = { name: "No orders (J)" };
    }
  }

  unit_actions = $.extend(unit_actions, {
    "sentry": { name: "Sentry (S)" },
    "wait": { name: "Wait (W)" },
    "disband": { name: "Disband (Shift-D)" }
  });

  if (is_touch_device()) {
    $(".context-menu-list").css("width", "600px");
    $(".context-menu-item").css("font-size", "220%");
  }
  $(".context-menu-list").css("z-index", 5000);

  return unit_actions;
}

export function init_game_unit_panel(): void {
  if (observing) return;
  S.setUnitpanelActive(true);

  $("#game_unit_panel").attr("title", "Units");
  $("#game_unit_panel").dialog({
    bgiframe: true,
    modal: false,
    width: "370px",
    height: "auto",
    resizable: false,
    closeOnEscape: false,
    dialogClass: 'unit_dialog  no-close',
    position: { my: 'right bottom', at: 'right bottom', of: window, within: $("#tabs-map") },
    appendTo: '#tabs-map',
    close: function(event: any, ui: any) { S.setUnitpanelActive(false); }

  }).dialogExtend({
    "minimizable": true,
    "closable": false,
    "minimize": function(evt: Event, dlg: any) { S.setGameUnitPanelState($("#game_unit_panel").dialogExtend("state")) },
    "restore": function(evt: Event, dlg: any) { S.setGameUnitPanelState($("#game_unit_panel").dialogExtend("state")) },
    "icons": {
      "minimize": "ui-icon-circle-minus",
      "restore": "ui-icon-bullet"
    }
  });

  $("#game_unit_panel").dialog('open');
  $("#game_unit_panel").parent().css("overflow", "hidden");
  if (S.game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");
}

export function find_best_focus_candidate(accept_current: boolean): any {
  let punit: any;
  let i: number;
  if (client_is_observer()) return null;

  const sorted_units: any[] = [];
  for (const unit_id_str in store.units) {
    const unit_id = parseInt(unit_id_str);
    punit = store.units[unit_id];
    if (client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
      sorted_units.push(punit);
    }
  }
  sorted_units.sort(unit_distance_compare);

  for (i = 0; i < sorted_units.length; i++) {
    punit = sorted_units[i];
    if ((!unit_is_in_focus(punit) || accept_current)
      && client.conn.playing != null
      && punit['owner'] == client.conn.playing.playerno
      && ((punit['activity'] == FC_ACTIVITY_IDLE
        && !punit['done_moving']
        && punit['movesleft'] > 0)
        || should_ask_server_for_actions(punit))
      && punit['ssa_controller'] == FC_SSA_NONE
      && S.waiting_units_list.indexOf(punit['id']) < 0
      && !punit['transported']) {
      return punit;
    }
  }

  for (i = 0; i < S.waiting_units_list.length; i++) {
    punit = game_find_unit_by_number(S.waiting_units_list[i]);
    if (punit != null && punit['movesleft'] > 0) {
      S.waiting_units_list.splice(i, 1);
      return punit;
    }
  }

  return null;
}

export function unit_distance_compare(unit_a: any, unit_b: any): number {
  if (unit_a == null || unit_b == null) return 0;
  const ptile_a = index_to_tile(unit_a['tile']);
  const ptile_b = index_to_tile(unit_b['tile']);

  if (ptile_a == null || ptile_b == null) return 0;

  if (ptile_a['x'] == ptile_b['x'] && ptile_a['y'] == ptile_b['y']) {
    return 0;
  } else if (ptile_a['x'] > ptile_b['x'] || ptile_a['y'] > ptile_b['y']) {
    return 1;
  } else {
    return -1;
  }
}

export function set_unit_focus(punit: any): void {
  S.setCurrentFocus([]);
  if (punit == null) {
    S.setCurrentFocus([]);
  } else {
    S.current_focus[0] = punit;
    action_selection_next_in_focus(FC_IDENTITY_NUMBER_ZERO);
  }
  update_active_units_dialog();
  update_unit_order_commands();
}

export function set_unit_focus_and_redraw(punit: any): void {
  S.setCurrentFocus([]);

  if (punit == null) {
    S.setCurrentFocus([]);
  } else {
    S.current_focus[0] = punit;
    action_selection_next_in_focus(FC_IDENTITY_NUMBER_ZERO);
  }

  auto_center_on_focus_unit();
  update_active_units_dialog();
  update_unit_order_commands();
  if (S.current_focus.length > 0 && $("#game_unit_orders_default").length > 0) $("#game_unit_orders_default").show();
}

export function set_unit_focus_and_activate(punit: any): void {
  set_unit_focus_and_redraw(punit);
  request_new_unit_activity(punit, FC_ACTIVITY_IDLE, FC_EXTRA_NONE);
}

export function city_dialog_activate_unit(punit: any): void {
  request_new_unit_activity(punit, FC_ACTIVITY_IDLE, FC_EXTRA_NONE);
  close_city_dialog();
  set_unit_focus_and_redraw(punit);
}

export function auto_center_on_focus_unit(): void {
  if (active_city != null) return;

  const ptile = find_a_focus_unit_tile_to_center_on();

  if (ptile != null && auto_center_on_unit) {
    center_tile_mapcanvas(ptile);
    update_unit_position(ptile);
  }
}

export function find_a_focus_unit_tile_to_center_on(): any {
  const funit = S.current_focus[0];

  if (funit == null) return null;

  return index_to_tile(funit['tile']);
}

export function find_visible_unit(ptile: any): any {
  let i: number;

  if (ptile == null || unit_list_size(tile_units_func(ptile)) == 0) {
    return null;
  }

  const pfocus = get_focus_unit_on_tile(ptile);
  if (pfocus != null) {
    return pfocus;
  }

  if (tile_city(ptile) != null) {
    return null;
  }

  const vunits = tile_units_func(ptile);
  for (i = 0; i < vunits.length; i++) {
    const aunit = vunits[i];
    if (aunit['anim_list'] != null && aunit['anim_list'].length > 0) {
      return aunit;
    }
  }

  for (i = 0; i < vunits.length; i++) {
    const tunit = vunits[i];
    if (!tunit['transported']) {
      return tunit;
    }
  }

  return tile_units_func(ptile)[0];
}

export function get_drawable_unit(ptile: any, citymode: any): any {
  const punit = find_visible_unit(ptile);

  if (punit == null) return null;

  if (!unit_is_in_focus(punit) || S.current_focus.length > 0) {
    return punit;
  } else {
    return null;
  }
}

export function update_active_units_dialog(): void {
  let unit_info_html = "";
  let ptile = null;
  let punits: any[] = [];
  let width = 0;

  if (client_is_observer() || !S.unitpanel_active) return;

  if (S.current_focus.length == 1) {
    ptile = index_to_tile(S.current_focus[0]['tile']);
    punits.push(S.current_focus[0]);
    const tmpunits = tile_units(ptile) || [];

    for (let i = 0; i < tmpunits.length; i++) {
      const kunit = tmpunits[i];
      if (kunit['id'] == S.current_focus[0]['id']) continue;
      punits.push(kunit);
    }
  } else if (S.current_focus.length > 1) {
    punits = S.current_focus;
  }

  for (let i = 0; i < punits.length; i++) {
    const punit = punits[i];
    const sprite = get_unit_image_sprite(punit);
    const active = (S.current_focus.length > 1 || S.current_focus[0]['id'] == punit['id']);

    unit_info_html += "<div id='unit_info_div' class='" + (active ? "current_focus_unit" : "")
      + "'><div id='unit_info_image' onclick='set_unit_focus_and_redraw(units[" + punit['id'] + "])' "
      + " style='background: transparent url("
      + sprite['image-src'] +
      ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
      + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
      + "></div></div>";
    width = sprite['width'];
  }

  if (S.current_focus.length == 1) {
    const aunit = S.current_focus[0];
    const ptype = unit_type(aunit) as any;
    unit_info_html += "<div id='active_unit_info' title='" + (ptype ? ptype['helptext'] : '') + "'>";

    if (store.client.conn.playing != null && S.current_focus[0]['owner'] != store.client.conn.playing.playerno) {
      unit_info_html += "<b>" + store.nations[store.players[S.current_focus[0]['owner']]['nation']]['adjective'] + "</b> ";
    }

    unit_info_html += "<b>" + (ptype ? ptype['name'] : '') + "</b>: ";
    if (get_unit_homecity_name(aunit) != null) {
      unit_info_html += " " + get_unit_homecity_name(aunit) + " ";
    }
    if (store.client.conn.playing != null && S.current_focus[0]['owner'] == store.client.conn.playing.playerno) {
      unit_info_html += "<span>" + get_unit_moves_left(aunit) + "</span> ";
    }
    unit_info_html += "<br><span title='Attack strength'>A:" + (ptype ? ptype['attack_strength'] : 0)
      + "</span> <span title='Defense strength'>D:" + (ptype ? ptype['defense_strength'] : 0)
      + "</span> <span title='Firepower'>F:" + (ptype ? ptype['firepower'] : 0)
      + "</span> <span title='Health points'>H:"
      + aunit['hp'] + "/" + (ptype ? ptype['hp'] : 0) + "</span>";
    if (aunit['veteran'] > 0) {
      unit_info_html += " <span>Veteran: " + aunit['veteran'] + "</span>";
    }
    if (ptype && ptype['transport_capacity'] > 0) {
      unit_info_html += " <span>Transport: " + ptype['transport_capacity'] + "</span>";
    }

    unit_info_html += "</div>";
  } else if (S.current_focus.length >= 1 && store.client.conn.playing != null && S.current_focus[0]['owner'] != store.client.conn.playing.playerno) {
    unit_info_html += "<div id='active_unit_info'>" + S.current_focus.length + " foreign units  (" +
      store.nations[store.players[S.current_focus[0]['owner']]['nation']]['adjective']
      + ")</div> ";
  } else if (S.current_focus.length > 1) {
    unit_info_html += "<div id='active_unit_info'>" + S.current_focus.length + " units selected.</div> ";
  }

  $("#game_unit_info").html(unit_info_html);

  if (S.current_focus.length > 0) {
    let newwidth = 32 + punits.length * (width + 10);
    if (newwidth < 140) newwidth = 140;
    const newheight = 75 + normal_tile_height;
    $("#game_unit_panel").parent().show();
    $("#game_unit_panel").parent().width(newwidth);
    $("#game_unit_panel").parent().height(newheight);
    $("#game_unit_panel").parent().css("left", ($(window).width() - newwidth) + "px");
    $("#game_unit_panel").parent().css("top", ($(window).height() - newheight - 30) + "px");
    $("#game_unit_panel").parent().css("background", "rgba(50,50,40,0.5)");
    if (S.game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");
  } else {
    $("#game_unit_panel").parent().hide();
  }
  $("#active_unit_info").tooltip();
}

// Declared globally (from legacy JS)
declare function city_has_building(city: any, improvement_id: number): boolean;
