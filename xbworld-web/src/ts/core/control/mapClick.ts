/**
 * Map click handling, goto mode, paradrop, and tile popup.
 *
 * Extracted from core/control.ts
 */

import { store } from '../../data/store';
import { unit_type, tile_units } from '../../data/unit';
import { indexToTile as index_to_tile, mapPosToTile as map_pos_to_tile } from '../../data/map';
import { tileCity as tile_city } from '../../data/tile';
import { cityTile as city_tile } from '../../data/city';
import { actionByNumber as action_by_number, actionHasResult as action_has_result } from '../../data/actions';
import { utype_can_do_action } from '../../data/unittype';
import { ACTIVITY_IDLE } from '../../data/fcTypes';
import { ACTION_COUNT } from '../../core/constants';
import { send_request } from '../../net/connection';
import { isTouchDevice as is_touch_device } from '../../utils/helpers';
import { clientIsObserver as client_is_observer } from '../../client/clientState';
import { message_log } from '../../core/messages';
import { E_BEGINNER_HELP } from '../../data/eventConstants';
import { canvas_pos_to_tile } from '../../renderer/mapviewCommon';
import { UnitSSDataType } from '../../data/unit';
import * as S from './controlState';
// Circular imports — OK, only used inside functions
import { set_unit_focus_and_redraw, set_unit_focus_and_activate, update_unit_focus, update_active_units_dialog, find_visible_unit, find_a_focus_unit_tile_to_center_on } from './unitFocus';
import { request_unit_do_action, request_unit_act_sel_vs } from './unitCommands';
import { update_mouse_cursor } from './mouse';

const USSDT_QUEUE = UnitSSDataType.QUEUE;

type packet_type_t = Record<string, any>;

declare const $: any;
declare const client: any;
declare const actions: any;
declare const renderer: number;
declare const RENDERER_2DCANVAS: number;
declare function mapstep(tile: any, dir: number): any;
declare function center_tile_mapcanvas_2d(ptile: any): void;
declare function show_dialog_message(title: string, message: string): void;
declare function show_city_dialog(pcity: any): void;
declare function clear_goto_tiles(): void;
declare function unit_move_sound_play(punit: any): void;
declare function tile_get_known(ptile: any): number;
declare const TILE_UNKNOWN: number;
declare const packet_unit_orders: number;
declare const packet_unit_sscs_set: number;
declare const packet_web_goto_path_req: number;
declare const packet_web_info_text_req: number;
declare const ORDER_LAST: number;
declare const ORDER_MOVE: number;
declare const ORDER_ACTION_MOVE: number;
declare const ORDER_FULL_MP: number;
declare const ACTIVITY_LAST: number;
declare const E_BAD_COMMAND: number;
declare const FC_ACTRES_PARADROP: number;
declare const FC_ACTRES_PARADROP_CONQUER: number;
declare const ACTION_AIRLIFT: number;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function order_wants_direction(order: number, act_id: number, ptile: any): boolean {
  const action = actions[act_id];

  if (order == S.goto_last_order && action == null) {
    console.log("Asked to put invalid action " + act_id + " in an order.");
    return false;
  }

  const FC_ORDER_PERFORM_ACTION = (window as any).ORDER_PERFORM_ACTION;
  const FC_ORDER_MOVE = (window as any).ORDER_MOVE;
  const FC_ORDER_ACTION_MOVE = (window as any).ORDER_ACTION_MOVE;

  switch (order) {
    case FC_ORDER_MOVE:
    case FC_ORDER_ACTION_MOVE:
      return true;
    case FC_ORDER_PERFORM_ACTION:
      if (action['min_distance'] > 0) {
        return true;
      }
      if (action['max_distance'] < 1) {
        return false;
      }
      if (tile_city(ptile) != null
        || (tile_units(ptile) as any[]).length != 0) {
        return true;
      }
      return false;
    default:
      return false;
  }
}

export function do_unit_paradrop_to(punit: any, ptile: any): void {
  let act_id: number;
  let paradrop_action: any = null;
  const FC_ACTION_COUNT = ACTION_COUNT;

  for (act_id = 0; act_id < FC_ACTION_COUNT; act_id++) {
    const paction = action_by_number(act_id);

    if (!(action_has_result(paction, FC_ACTRES_PARADROP_CONQUER)
      || action_has_result(paction, FC_ACTRES_PARADROP))) {
      continue;
    }

    if (utype_can_do_action(unit_type(punit), act_id)) {
      if (paradrop_action == null) {
        paradrop_action = paction;
      } else {
        const packet: packet_type_t = {
          "pid": packet_unit_sscs_set,
          "unit_id": punit['id'],
          "type": USSDT_QUEUE,
          "value": ptile['index']
        };
        send_request(JSON.stringify(packet));
        return;
      }
    }
  }

  if (paradrop_action != null) {
    request_unit_do_action(paradrop_action['id'], punit['id'],
      ptile['index']);
  }
}

export function do_map_click(ptile: any, qtype: any, first_time_called: boolean) {
  let punit: any;
  let packet: any;
  let pcity: any;
  if (ptile == null || client_is_observer()) return;

  if (S.current_focus.length > 0 && S.current_focus[0]['tile'] == ptile['index']) {
    if (S.goto_active && !is_touch_device()) {
      deactivate_goto(false);
    }
    if (renderer == RENDERER_2DCANVAS) {
      $("#canvas").contextMenu();
    } else {
      $("#canvas_div").contextMenu();
    }
    return;
  }
  const sunits = tile_units(ptile);
  pcity = tile_city(ptile);

  if (S.goto_active) {
    if (S.current_focus.length > 0) {
      for (let s = 0; s < S.current_focus.length; s++) {
        punit = S.current_focus[s];
        const goto_path = S.goto_request_map[punit['id'] + "," + ptile['x'] + "," + ptile['y']];
        if (goto_path == null) {
          continue;
        }

        const old_tile = index_to_tile(punit['tile']);

        packet = {
          "pid": packet_unit_orders,
          "unit_id": punit['id'],
          "src_tile": old_tile['index'],
          "length": goto_path['length'],
          "repeat": false,
          "vigilant": false,
          "dest_tile": ptile['index']
        };

        const order: any = {
          "order": ORDER_LAST,
          "activity": ACTIVITY_LAST,
          "target": 0,
          "sub_target": 0,
          "action": ACTION_COUNT,
          "dir": -1
        };

        packet['orders'] = [];
        for (let i = 0; i < goto_path['length']; i++) {
          if (goto_path['dir'][i] == -1) {
            order['order'] = ORDER_FULL_MP;
          } else if (i + 1 != goto_path['length']) {
            order['order'] = ORDER_MOVE;
          } else {
            order['order'] = ORDER_ACTION_MOVE;
          }

          order['dir'] = goto_path['dir'][i];
          order['activity'] = ACTIVITY_LAST;
          order['target'] = 0;
          order['sub_target'] = 0;
          order['action'] = ACTION_COUNT;

          packet['orders'][i] = Object.assign({}, order);
        }

        if (S.goto_last_order != ORDER_LAST) {
          let pos: number;

          if (!order_wants_direction(S.goto_last_order, S.goto_last_action,
            ptile)) {
            pos = packet['length'];
            packet['length'] = packet['length'] + 1;
            order['order'] = ORDER_LAST;
            order['dir'] = -1;
            order['activity'] = ACTIVITY_LAST;
            order['target'] = 0;
            order['sub_target'] = 0;
            order['action'] = ACTION_COUNT;
          } else {
            pos = packet['length'] - 1;
          }

          order['order'] = S.goto_last_order;
          order['action'] = S.goto_last_action;
          order['target'] = ptile['index'];

          packet['orders'][pos] = Object.assign({}, order);
        }

        S.setGotoLastOrder(ORDER_LAST);
        S.setGotoLastAction(ACTION_COUNT);

        if (punit['id'] != goto_path['unit_id']) {
          console.log("Error: Tried to order unit " + punit['id']
            + " to move along a path made for unit "
            + goto_path['unit_id']);
          return;
        }
        send_request(JSON.stringify(packet));
        if (punit['movesleft'] > 0) {
          unit_move_sound_play(punit);
        } else if (!S.has_movesleft_warning_been_shown) {
          S.setHasMovesleftWarningBeenShown(true);
          const ptype = unit_type(punit) as any;
          message_log.update({
            event: E_BAD_COMMAND,
            message: (ptype ? ptype['name'] : 'Unit') + " has no moves left. Press turn done for the next turn."
          });
        }

      }
      clear_goto_tiles();

    } else if (is_touch_device()) {
      if (S.current_focus.length > 0) {
        request_goto_path(S.current_focus[0]['id'], ptile['x'], ptile['y']);
        if (first_time_called) {
          setTimeout(function () {
            do_map_click(ptile, qtype, false);
          }, 250);
        }
        return;
      }
    }

    deactivate_goto(true);
    update_unit_focus();

  } else if (S.paradrop_active && S.current_focus.length > 0) {
    punit = S.current_focus[0];
    do_unit_paradrop_to(punit, ptile);
    S.setParadropActive(false);

  } else if (S.airlift_active && S.current_focus.length > 0) {
    punit = S.current_focus[0];
    pcity = tile_city(ptile);
    if (pcity != null) {
      request_unit_do_action(ACTION_AIRLIFT, punit['id'], pcity['id']);
    }
    S.setAirliftActive(false);

  } else if (S.action_tgt_sel_active && S.current_focus.length > 0) {
    request_unit_act_sel_vs(ptile);
    S.setActionTgtSelActive(false);
  } else {
    if (pcity != null) {
      if (store.client.conn.playing != null && pcity['owner'] == store.client.conn.playing.playerno) {
        if (sunits != null && sunits.length > 0
          && sunits[0]['activity'] == ACTIVITY_IDLE) {
          set_unit_focus_and_redraw(sunits[0]);
          if (renderer == RENDERER_2DCANVAS) {
            $("#canvas").contextMenu();
          } else {
            $("#canvas_div").contextMenu();
          }
        } else if (!S.goto_active) {
          show_city_dialog(pcity);
        }
      }
      return;
    }

    if (sunits != null && sunits.length == 0) {
      set_unit_focus_and_redraw(null);

    } else if (sunits != null && sunits.length > 0) {
      if (store.client.conn.playing != null && sunits[0]['owner'] == store.client.conn.playing.playerno) {
        if (sunits.length == 1) {
          const unit = sunits[0];
          set_unit_focus_and_activate(unit);
        } else {
          set_unit_focus_and_redraw(sunits[0]);
          update_active_units_dialog();
        }

        if (is_touch_device()) {
          if (renderer == RENDERER_2DCANVAS) {
            $("#canvas").contextMenu();
          } else {
            $("#canvas_div").contextMenu();
          }
        }
      } else if (pcity == null) {
        S.setCurrentFocus(sunits);
        $("#game_unit_orders_default").hide();
        update_active_units_dialog();
      }
    }
  }

  S.setParadropActive(false);
  S.setAirliftActive(false);
  S.setActionTgtSelActive(false);
}

export function find_active_dialog() {
  const permanent_widgets = ["game_overview_panel", "game_unit_panel", "game_chatbox_panel"];
  const dialogs = $(".ui-dialog");
  for (let i = 0; i < dialogs.length; i++) {
    const dialog = $(dialogs[i]);
    if (dialog.css("display") == "none") {
      continue;
    }
    const children = dialog.children();
    if (children.length >= 2 && permanent_widgets.indexOf(children[1].id) < 0) {
      return dialog;
    }
  }
  return null;
}

export function activate_goto() {
  clear_goto_tiles();
  activate_goto_last(ORDER_LAST, ACTION_COUNT);
}

export function activate_goto_last(last_order: any, last_action: any) {
  S.setGotoActive(true);
  $("#canvas_div").css("cursor", "crosshair");

  S.setGotoLastOrder(last_order);
  S.setGotoLastAction(last_action);

  if (S.current_focus.length > 0) {
    if (S.intro_click_description) {
      if (is_touch_device()) {
        message_log.update({
          event: E_BEGINNER_HELP,
          message: "Carefully drag unit to the tile you want it to go to."
        });
      } else {
        message_log.update({
          event: E_BEGINNER_HELP,
          message: "Click on the tile to send this unit to."
        });
      }
      S.setIntroClickDescription(false);
    }

  } else {
    message_log.update({
      event: E_BEGINNER_HELP,
      message: "First select a unit to move by clicking on it, then click on the"
        + " goto button or the 'G' key, then click on the position to move to."
    });
    deactivate_goto(false);
  }

}

export function deactivate_goto(will_advance_unit_focus: boolean) {
  S.setGotoActive(false);
  $("#canvas_div").css("cursor", "default");
  S.setGotoRequestMap({});
  S.setGotoTurnsRequestMap({});
  clear_goto_tiles();

  S.setGotoLastOrder(ORDER_LAST);
  S.setGotoLastAction(ACTION_COUNT);

  if (will_advance_unit_focus) setTimeout(update_unit_focus, 600);
}

export function send_end_turn() {
  if (store.gameInfo == null) return;

  const packet_player_phase_done = (window as any).packet_player_phase_done;
  $("#turn_done_button").button("option", "disabled", true);
  if (!is_touch_device()) $("#turn_done_button").tooltip({ disabled: true });
  const packet = { "pid": packet_player_phase_done, "turn": store.gameInfo['turn'] };
  send_request(JSON.stringify(packet));
  const update_turn_change_timer = (window as any).update_turn_change_timer;
  if (update_turn_change_timer) update_turn_change_timer();

  const is_longturn = (window as any).is_longturn;
  if (is_longturn && is_longturn()) {
    show_dialog_message("Turn done!",
      "Your turn in this Freeciv-web: One Turn per Day game is now over. In this game one turn is played every day. " +
      "To play your next turn in this game, go to " + window.location.host + " and click <b>Games</b> in the menu, then <b>Multiplayer</b> " +
      "and there you will find this Freeciv-web: One Turn per Day game in the list. You can also bookmark this page.<br>" +
      "See you again soon!");
  }
}

export function request_goto_path(unit_id: number, dst_x: number, dst_y: number) {
  if (S.goto_request_map[unit_id + "," + dst_x + "," + dst_y] == null) {
    S.goto_request_map[unit_id + "," + dst_x + "," + dst_y] = true;

    const packet = {
      "pid": packet_web_goto_path_req, "unit_id": unit_id,
      "goal": map_pos_to_tile(dst_x, dst_y)['index']
    };
    send_request(JSON.stringify(packet));
    S.setCurrentGotoTurns(null as any);
    $("#unit_text_details").html("Choose unit goto");
    setTimeout(update_mouse_cursor, 700);
  } else {
    update_goto_path(S.goto_request_map[unit_id + "," + dst_x + "," + dst_y]);
  }
}

export function check_request_goto_path() {
  if (S.goto_active && S.current_focus.length > 0
    && S.prev_mouse_x == S.mouse_x && S.prev_mouse_y == S.mouse_y) {
    let ptile: any;
    clear_goto_tiles();
    ptile = canvas_pos_to_tile(S.mouse_x, S.mouse_y);
    if (ptile != null) {
      for (let i = 0; i < S.current_focus.length; i++) {
        request_goto_path(S.current_focus[i]['id'], ptile['x'], ptile['y']);
      }
    }
  }
  S.setPrevMouseX(S.mouse_x);
  S.setPrevMouseY(S.mouse_y);
}

export function update_goto_path(goto_packet: any) {
  const punit = store.units[goto_packet['unit_id']];
  if (punit == null) return;
  const t0 = index_to_tile(punit['tile']);
  let ptile = t0;
  const goaltile = index_to_tile(goto_packet['dest']);

  for (let i = 0; i < goto_packet['dir'].length; i++) {
    if (ptile == null) break;
    const dir = goto_packet['dir'][i];

    if (dir == -1) {
      continue;
    }

    ptile['goto_dir'] = dir;
    ptile = mapstep(ptile, dir);
  }

  S.setCurrentGotoTurns(goto_packet['turns']);

  S.goto_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']] = goto_packet;
  S.goto_turns_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']]
    = S.current_goto_turns;

  if (S.current_goto_turns != undefined) {
    $("#active_unit_info").html("Turns for goto: " + S.current_goto_turns);
  }
  update_mouse_cursor();
}

export function center_tile_mapcanvas(ptile: any) {
  center_tile_mapcanvas_2d(ptile);
}

export function popit() {
  let ptile: any;

  ptile = canvas_pos_to_tile(S.mouse_x, S.mouse_y);

  if (ptile == null) return;

  popit_req(ptile);
}

export function popit_req(ptile: any) {
  if (ptile == null) return;

  if (tile_get_known(ptile) == TILE_UNKNOWN) {
    show_dialog_message("Tile info", "Location: x:" + ptile['x'] + " y:" + ptile['y']);
    return;
  }

  let punit_id = 0;
  const punit = find_visible_unit(ptile);
  if (punit != null) punit_id = punit['id'];

  let focus_unit_id = 0;
  if (S.current_focus.length > 0) {
    focus_unit_id = S.current_focus[0]['id'];
  }

  const packet = {
    "pid": packet_web_info_text_req, "visible_unit": punit_id,
    "loc": ptile['index'], "focus_unit": focus_unit_id
  };
  send_request(JSON.stringify(packet));
}

export function center_on_any_city() {
  for (const city_id in store.cities) {
    const pcity = store.cities[city_id];
    center_tile_mapcanvas(city_tile(pcity));
    return;
  }
}
