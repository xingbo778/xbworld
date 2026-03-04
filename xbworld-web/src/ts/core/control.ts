import { store } from '../data/store';
import { cityOwnerPlayerId as city_owner_player_id, cityTile as city_tile, cityHasBuilding as city_has_building } from '../data/city';
import { unit_type, unit_list_size, unit_list_without, get_what_can_unit_pillage_from } from '../data/unit';
import { game_find_city_by_number as find_city_by_number, game_find_unit_by_number as find_unit_by_number } from '../data/game';
import { utype_can_do_action, utype_can_do_action_result, can_player_build_unit_direct } from '../data/unittype';
import { DiplState, PlayerFlag } from '../data/player';
import { mapPosToTile as map_pos_to_tile, indexToTile as index_to_tile } from '../data/map';
import { tileCity as tile_city, tileHasExtra as tile_has_extra } from '../data/tile';
import { tile_units } from '../data/unit';
import { tileTerrain as tile_terrain } from '../data/terrain';
import { playerInventionState as player_invention_state, techIdByName as tech_id_by_name, TECH_UNKNOWN, TECH_KNOWN } from '../data/tech';
import { isLongturn as is_longturn } from '../client/clientCore';
import { clientIsObserver as client_is_observer } from '../client/clientState';
import { improvement_id_by_name, B_AIRPORT_NAME } from '../data/improvement';
import { ACTIVITY_IDLE, ACT_DEC_ACTIVE, ACT_DEC_PASSIVE, ACT_DEC_NOTHING } from '../data/fcTypes';
import { EXTRA_NONE } from '../data/extra';
import { ACTION_COUNT, IDENTITY_NUMBER_ZERO } from '../core/constants';
import { Order, ServerSideAgent, UnitSSDataType } from '../data/unit';
import { actionByNumber as action_by_number, actionHasResult as action_has_result } from '../data/actions';
import { E_LOG_ERROR, E_BEGINNER_HELP } from '../data/eventConstants';
import { send_request, send_message, network_stop } from '../net/connection';
import { packet_unit_get_actions, packet_unit_sscs_set } from '../net/packetConstants';
import { clientState as client_state, C_S_RUNNING } from '../client/clientState';
import { update_city_screen, close_city_dialog } from '../ui/cityDialog';
import { update_tech_screen } from '../ui/techDialog';
import { init_civ_dialog } from '../ui/governmentDialog';
import { init_options_dialog } from '../ui/options';
import { show_help } from '../ui/helpdata';
import { show_load_game_dialog } from '../utils/savegame';
import { pregame_start_game, pregame_settings, pick_nation } from '../core/pregame';
import { show_intelligence_report_dialog } from '../ui/intelDialog';
import { view_game_scores } from '../ui/scorelog';
import { updateNationScreen as update_nation_screen, showSendPrivateMessageDialog as show_send_private_message_dialog, nationMeetClicked as nation_meet_clicked, centerOnPlayer as center_on_player, cancelTreatyClicked as cancel_treaty_clicked, withdrawVisionClicked as withdraw_vision_clicked, takePlayerClicked as take_player_clicked, toggleAiClicked as toggle_ai_clicked, handleNationTableSelect as handle_nation_table_select } from '../data/nation';
import { globalEvents } from '../core/events';
import { logNormal, logError } from '../core/log';
import { message_log, max_chat_message_length } from '../core/messages';
import { isTouchDevice as is_touch_device, isSmallScreen as is_small_screen, stringUnqualify as string_unqualify } from '../utils/helpers';
import { overview_clicked } from '../core/overview';

// Aliases for FC_ prefixed constants used throughout this file
const FC_ACTION_COUNT = ACTION_COUNT;
const FC_EXTRA_NONE = EXTRA_NONE;
const FC_ACTIVITY_IDLE = ACTIVITY_IDLE;
const FC_SSA_NONE = ServerSideAgent.NONE;
const FC_ACT_DEC_ACTIVE = ACT_DEC_ACTIVE;
const FC_ACT_DEC_PASSIVE = ACT_DEC_PASSIVE;
const FC_ACT_DEC_NOTHING = ACT_DEC_NOTHING;
const FC_IDENTITY_NUMBER_ZERO = IDENTITY_NUMBER_ZERO;
const FC_ORDER_PERFORM_ACTION = Order.PERFORM_ACTION;
const FC_ORDER_MOVE = Order.MOVE;
const FC_ORDER_ACTION_MOVE = Order.ACTION_MOVE;
const FC_DS_ALLIANCE = DiplState.DS_ALLIANCE;
const FC_PLRF_AI = PlayerFlag.PLRF_AI;
const FC_TECH_UNKNOWN = TECH_UNKNOWN;
const FC_TECH_KNOWN = TECH_KNOWN;
const FC_B_AIRPORT_NAME = B_AIRPORT_NAME;
const REQEST_PLAYER_INITIATED = 0;
const sendRequest = send_request;
const sendMessage = send_message;

// Declare globals for runtime variables
declare const game_info: any;
declare const players: any;
declare const nations: any;
declare const diplstates: any;
declare const actions: any;
declare const terrain_control: any;
declare const EXTRA_ROAD: number;
declare const EXTRA_RIVER: number;
declare const EXTRA_RAIL: number;
declare const EXTRA_MAGLEV: number;
declare const EXTRA_MINE: number;
declare const EXTRA_POLLUTION: number;
declare const EXTRA_FALLOUT: number;
const FC_EXTRA_ROAD = typeof EXTRA_ROAD !== 'undefined' ? EXTRA_ROAD : 0;
const FC_EXTRA_RIVER = typeof EXTRA_RIVER !== 'undefined' ? EXTRA_RIVER : 1;
const FC_EXTRA_RAIL = typeof EXTRA_RAIL !== 'undefined' ? EXTRA_RAIL : 2;
const FC_EXTRA_MAGLEV = typeof EXTRA_MAGLEV !== 'undefined' ? EXTRA_MAGLEV : 3;
const FC_EXTRA_MINE = typeof EXTRA_MINE !== 'undefined' ? EXTRA_MINE : 4;
const FC_EXTRA_POLLUTION = typeof EXTRA_POLLUTION !== 'undefined' ? EXTRA_POLLUTION : 5;
const FC_EXTRA_FALLOUT = typeof EXTRA_FALLOUT !== 'undefined' ? EXTRA_FALLOUT : 6;

type packet_type_t = Record<string, any>;
const USSDT_UNQUEUE = UnitSSDataType.UNQUEUE;
const USSDT_QUEUE = UnitSSDataType.QUEUE;
import { mapview_slide, canvas_pos_to_tile } from '../renderer/mapviewCommon';
import { mapview_window_resized } from '../renderer/mapview';
import { orientation_changed } from '../utils/mobile';
import { update_tech_dialog_cursor, tech_dialog_active, tech_mapview_mouse_click } from '../ui/techDialog';
declare const mapview: any;
declare const mapview_canvas: any;
declare const center_tile_mapcanvas: any;
declare const update_unit_position: any;
import { RENDERER_2DCANVAS, RENDERER_WEBGL } from '../core/constants';
import { mapctrl_init_2d } from '../renderer/mapctrl';
declare const webgl_canvas_pos_to_map_pos: any;
declare const webgl_canvas_pos_to_tile: any;
declare const camera_look_at: any;
declare let camera_current_x: number;
declare let camera_current_y: number;
declare let camera_current_z: number;
declare const webgl_clear_unit_focus: any;
declare const init_webgl_mapctrl: any;
import { request_new_unit_activity, request_unit_do_action } from '../renderer/mapctrl';

declare const $: any;
declare const client: any;
declare const sprites: any;
declare const active_city: any;
declare const city_canvas: any;
declare const map_select_check: any;
declare const map_select_x: any;
declare const map_select_y: any;
declare const map_select_check_started: any;
declare let map_select_active: any;
declare const observing: boolean;
declare const popup_actor_arrival: boolean;
declare const auto_center_on_unit: boolean;

export let mouse_x: number;
export let mouse_y: number;
export let prev_mouse_x: number;
export let prev_mouse_y: number;
export let keyboard_input: boolean = true;
export let unitpanel_active: boolean = false;
export let allow_right_click: boolean = false;
export let mapview_mouse_movement: boolean = false;

export let roads: any[] = [];
export let bases: any[] = [];

export let current_focus: any[] = [];

/* The priority unit(s) for unit_focus_advance(). */
export let urgent_focus_queue: any[] = [];

export let goto_active: boolean = false;
export let paradrop_active: boolean = false;
export let airlift_active: boolean = false;
export let action_tgt_sel_active: boolean = false;

/* Will be set when the goto is activated. */
export let goto_last_order: number = -1;
export let goto_last_action: number = -1;

/* Selecting unit from a stack without popup. */
export const SELECT_POPUP: number = 0;
export const SELECT_SEA: number = 1;
export const SELECT_LAND: number = 2;
export const SELECT_APPEND: number = 3;

export let intro_click_description: boolean = true;
export let resize_enabled: boolean = true;
export let goto_request_map: { [key: string]: any } = {};
export let goto_turns_request_map: { [key: string]: any } = {};
export let current_goto_turns: number = 0;
export let waiting_units_list: any[] = [];
export let show_citybar: boolean = true;
export let context_menu_active: boolean = true;
export let has_movesleft_warning_been_shown: boolean = false;
export let game_unit_panel_state: any = null;

export let chat_send_to: number = -1;
export const CHAT_ICON_EVERYBODY: string = String.fromCharCode(62075);
export const CHAT_ICON_ALLIES: string = String.fromCharCode(61746);
export let end_turn_info_message_shown: boolean = false;

/* The ID of the unit that currently is in the action selection process.
 *
 * The action selection process begins when the client asks the server what
 * actions a unit can take. It ends when the last follow up question is
 * answered.
 */
export let action_selection_in_progress_for: number = FC_IDENTITY_NUMBER_ZERO;
export let is_more_user_input_needed: boolean = false;
export function set_is_more_user_input_needed(val: boolean): void { is_more_user_input_needed = val; }

/****************************************************************************
...
****************************************************************************/
export function control_init(): void {
  urgent_focus_queue = [];

  if (RENDERER_2DCANVAS) { // Assuming RENDERER_2DCANVAS is a global constant
    mapctrl_init_2d();
  } else {
    init_webgl_mapctrl();
  }

  $(document).keydown(global_keyboard_listener);
  $(window).resize(mapview_window_resized);
  $(window).bind('orientationchange resize', orientation_changed);

  $("#turn_done_button").click(send_end_turn);
  if (!is_touch_device()) $("#turn_done_button").tooltip();

  $("#freeciv_logo").click(function(event: Event) {
    window.open('/', '_new');
  });


  $("#game_text_input").keydown(function(event: JQuery.KeyDownEvent) {
    return check_text_input(event, $("#game_text_input"));
  });
  $("#game_text_input").focus(function(event: JQuery.FocusEvent) {
    keyboard_input = false;
    resize_enabled = false;
  });

  $("#game_text_input").blur(function(event: JQuery.BlurEvent) {
    keyboard_input = true;
    resize_enabled = true;
  });

  $("#chat_direction").click(function(event: JQuery.ClickEvent) {
    chat_context_change();
  });

  $("#pregame_text_input").keydown(function(event: JQuery.KeyDownEvent) {
    return check_text_input(event, $("#pregame_text_input"));
  });

  $("#pregame_text_input").blur(function(event: JQuery.BlurEvent) {
    keyboard_input = true;
    if ((this as HTMLInputElement).value == '') {
      (this as HTMLInputElement).value = '>';
    }
  });

  $("#pregame_text_input").focus(function(event: JQuery.FocusEvent) {
    keyboard_input = false;
    if ((this as HTMLInputElement).value == '>') (this as HTMLInputElement).value = '';
  });

  $("#start_game_button").click(function(event: Jquery.ClickEvent) {
    pregame_start_game();
  });

  $("#load_game_button").click(function(event: Jquery.ClickEvent) {
    show_load_game_dialog();
  });

  $("#pick_nation_button").click(function(event: Jquery.ClickEvent) {
    pick_nation(null);
  });

  $("#pregame_settings_button").click(function(event: Jquery.ClickEvent) {
    pregame_settings();
  });

  $("#tech_canvas").click(function(event: Jquery.ClickEvent) {
    tech_mapview_mouse_click(event);
  });

  /* disable text-selection, as this gives wrong mouse cursor
   * during drag to goto units. */
  document.onselectstart = function() { return false; };

  /* disable right clicks. */
  window.addEventListener('contextmenu', function(e: MouseEvent) {
    if (e.target != null && ((e.target as HTMLElement).id == 'game_text_input' || (e.target as HTMLElement).id == 'overview_map' || (e.target as HTMLElement).id == 'replay_result' || ((e.target as HTMLElement).parentElement != null && (e.target as HTMLElement).parentElement!.id == 'game_message_area'))) return;
    if (!allow_right_click) e.preventDefault();
  }, false);

  const context_options: any = {
    selector: (RENDERER_2DCANVAS) ? '#canvas' : '#canvas_div',
    zIndex: 5000,
    autoHide: true,
    callback: function(key: string, options: any) {
      handle_context_menu_callback(key);
    },
    build: function($trigger: JQuery, e: Event) {
      if (!context_menu_active) {
        context_menu_active = true;
        return false;
      }
      const unit_actions = update_unit_order_commands();
      return {
        callback: function(key: string, options: any) {
          handle_context_menu_callback(key);
        },
        items: unit_actions
      };
    }
  };

  if (!is_touch_device()) {
    context_options['position'] = function(opt: any, x: number, y: number) {
      if (is_touch_device()) return;
      let new_top = mouse_y + $("#canvas_div").offset().top;
      if (RENDERER_2DCANVAS) new_top = mouse_y + $("#canvas").offset().top;
      opt.$menu.css({ top: new_top, left: mouse_x });
    };
  }

  $.contextMenu(context_options);

  $(window).on('unload', function() {
    network_stop();
  });

  /* Click callbacks for main tabs. */
  $("#map_tab").click(function(event: JQuery.ClickEvent) {
    setTimeout(set_default_mapview_active, 5);
  });


  $("#civ_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    init_civ_dialog();
  });

  $("#tech_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    update_tech_screen();
  });

  $("#players_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    update_nation_screen();
  });

  $("#cities_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    update_city_screen();
  });

  $("#opt_tab").click(function(event: JQuery.ClickEvent) {
    $("#tabs-hel").hide();
    init_options_dialog();
    set_default_mapview_inactive();
  });

  $("#chat_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    $("#tabs-chat").show();

  });


  $("#hel_tab").click(function(event: JQuery.ClickEvent) {
    set_default_mapview_inactive();
    show_help();
  });

  if (!is_touch_device()) {
    $("#game_unit_orders_default").tooltip();
  }

  $("#overview_map").click(function(e: JQuery.ClickEvent) {
    const x = e.pageX - $(this).offset().left;
    const y = e.pageY - $(this).offset().top;
    overview_clicked(x, y);
  });

  $("#send_message_button").click(function(e: JQuery.ClickEvent) {
    show_send_private_message_dialog();
  });

  $("#intelligence_report_button").click(function(e: JQuery.ClickEvent) {
    show_intelligence_report_dialog();
  });

  $('#meet_player_button').click(nation_meet_clicked);
  $('#view_player_button').click(center_on_player);
  $('#cancel_treaty_button').click(cancel_treaty_clicked);
  $('#withdraw_vision_button').click(withdraw_vision_clicked);
  $('#take_player_button').click(take_player_clicked);
  $('#toggle_ai_button').click(toggle_ai_clicked);
  $('#game_scores_button').click(view_game_scores);
  $('#nations_list').on('click', 'tbody tr', handle_nation_table_select);

  /* prevents keyboard input from changing tabs. */
  $('#tabs>ul>li').off('keydown');
  $('#tabs>div').off('keydown');
}

/****************************************************************************
  Called when the mouse is moved.
****************************************************************************/
export function mouse_moved_cb(e: MouseEvent): void {
  if (mapview_slide != null && mapview_slide['active']) return;

  mouse_x = 0;
  mouse_y = 0;
  if (!e) {
    e = window.event as MouseEvent;
  }
  if (e.pageX || e.pageY) {
    mouse_x = e.pageX;
    mouse_y = e.pageY;
  } else {
    if (e.clientX || e.clientY) {
      mouse_x = e.clientX;
      mouse_y = e.clientY;
    }
  }
  if (RENDERER_2DCANVAS && active_city == null && mapview_canvas != null
    && $("#canvas").length) {
    mouse_x = mouse_x - $("#canvas").offset().left;
    mouse_y = mouse_y - $("#canvas").offset().top;

    if (mapview_mouse_movement && !goto_active) {
      // move the mapview using mouse movement.
      const diff_x = (touch_start_x - mouse_x) * 2;
      const diff_y = (touch_start_y - mouse_y) * 2;

      mapview['gui_x0'] += diff_x;
      mapview['gui_y0'] += diff_y;
      touch_start_x = mouse_x;
      touch_start_y = mouse_y;
      update_mouse_cursor();
    }
  } else if (RENDERER_WEBGL && active_city == null && $("#canvas_div").length) {
    mouse_x = mouse_x - $("#canvas_div").offset().left;
    mouse_y = mouse_y - $("#canvas_div").offset().top;

    if (mapview_mouse_movement && !goto_active) {
      // move the mapview using mouse movement.
      const spos = webgl_canvas_pos_to_map_pos(touch_start_x, touch_start_y);
      const epos = webgl_canvas_pos_to_map_pos(mouse_x, mouse_y);
      if (spos != null && epos != null) {
        camera_look_at(camera_current_x + spos['x'] - epos['x'], camera_current_y, camera_current_z + spos['y'] - epos['y']);
      }

      touch_start_x = mouse_x;
      touch_start_y = mouse_y;
      update_mouse_cursor();
    }
  } else if (active_city != null && city_canvas != null
    && $("#city_canvas").length) {
    mouse_x = mouse_x - $("#city_canvas").offset().left;
    mouse_y = mouse_y - $("#city_canvas").offset().top;
  }

  if (client.conn.playing == null) return;

  if (C_S_RUNNING == client_state()) {
    update_mouse_cursor();
  }

  /* determine if Right-click-and-drag to select multiple units should be activated,
     only if more than an area of 45 pixels has been selected and more than 200ms has past.
     See mapview_mouse_click and mapview_mouse_down. */
  if (map_select_check && Math.abs(mouse_x - map_select_x) > 45
    && Math.abs(mouse_y - map_select_y) > 45
    && (new Date().getTime() - map_select_check_started) > 200) {
    map_select_active = true;
  }
}

/****************************************************************************
...
****************************************************************************/
export function update_mouse_cursor(): void {
  if (tech_dialog_active && !is_touch_device()) {
    update_tech_dialog_cursor();
    return;
  }

  let ptile: any;
  if (RENDERER_2DCANVAS) {
    ptile = canvas_pos_to_tile(mouse_x, mouse_y);
  } else {
    ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
  }

  if (ptile == null) return;

  const punit = find_visible_unit(ptile);
  const pcity = tile_city(ptile);

  if (mapview_mouse_movement && !goto_active) {
    /* show move map cursor */
    $("#canvas_div").css("cursor", "move");
  } else if (goto_active && current_goto_turns != null) {
    /* show goto cursor */
    $("#canvas_div").css("cursor", "crosshair");
  } else if (goto_active && current_goto_turns == null) {
    /* show invalid goto cursor*/
    $("#canvas_div").css("cursor", "not-allowed");
  } else if (pcity != null && client.conn.playing != null && city_owner_player_id(pcity) == client.conn.playing.playerno) {
    /* select city cursor*/
    $("#canvas_div").css("cursor", "pointer");
  } else if (punit != null && client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
    /* move unit cursor */
    $("#canvas_div").css("cursor", "pointer");
  } else {
    $("#canvas_div").css("cursor", "default");
  }
}

/****************************************************************************
  Set the chatbox messages context to the next item on the list if it is
  small. Otherwise, show a dialog for the user to select one.
****************************************************************************/
export function chat_context_change(): void {
  const recipients = chat_context_get_recipients();
  if (recipients.length < 4) {
    chat_context_set_next(recipients);
  } else {
    chat_context_dialog_show(recipients);
  }
}

/****************************************************************************
  Get ordered list of possible alive human chatbox messages recipients.
****************************************************************************/
export function chat_context_get_recipients(): any[] {
  let allies = false;
  const pm: any[] = [];

  pm.push({ id: null, flag: null, description: 'Everybody' });

  let self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  for (const player_id_str in players) {
    const player_id = parseInt(player_id_str);
    if (player_id == self) continue;

    const pplayer = players[player_id];
    if (pplayer['flags'].isSet(FC_PLRF_AI)) continue;
    if (!pplayer['is_alive']) continue;
    if (is_longturn() && pplayer['name'].indexOf("New Available Player") != -1) continue;

    const nation = nations[pplayer['nation']];
    if (nation == null) continue;

    // TODO: add connection state, to list connected players first
    pm.push({
      id: player_id,
      description: pplayer['name'] + " of the " + nation['adjective'],
      flag: sprites["f." + nation['graphic_str']]
    });

    if (diplstates[player_id] == FC_DS_ALLIANCE) {
      allies = true;
    }
  }

  if (allies && self >= 0) {
    pm.push({ id: self, flag: null, description: 'Allies' });
  }

  pm.sort(function(a: any, b: any) {
    if (a.id == null) return -1;
    if (b.id == null) return 1;
    if (a.id == self) return -1;
    if (b.id == self) return 1;
    if (a.description < b.description) return -1;
    if (a.description > b.description) return 1;
    return 0;
  });

  return pm;
}

/****************************************************************************
  Switch chatbox messages recipients.
****************************************************************************/
export function chat_context_set_next(recipients: any[]): void {
  let next = 0;
  while (next < recipients.length && recipients[next].id != chat_send_to) {
    next++;
  }
  next++;
  if (next >= recipients.length) {
    next = 0;
  }

  set_chat_direction(recipients[next].id);
}

/****************************************************************************
  Show a dialog for the user to select the default recipient of
  chatbox messages.
****************************************************************************/
export function chat_context_dialog_show(recipients: any[]): void {
  const dlg = $("#chat_context_dialog");
  if (dlg.length > 0) {
    dlg.dialog('close');
    dlg.remove();
  }
  $("<div id='chat_context_dialog' title='Choose chat recipient'></div>")
    .appendTo("div#game_page");

  let self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  const tbody_el = document.createElement('tbody');

  const add_row = function(id: number | null, flag: any, description: string): CanvasRenderingContext2D {
    let flag_canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, row: HTMLTableRowElement, cell: HTMLTableCellElement;
    row = document.createElement('tr');
    cell = document.createElement('td');
    flag_canvas = document.createElement('canvas');
    flag_canvas.width = 29;
    flag_canvas.height = 20;
    ctx = flag_canvas.getContext("2d")!;
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
    cell.appendChild(flag_canvas);
    row.appendChild(cell);
    cell = document.createElement('td');
    cell.appendChild(document.createTextNode(description));
    row.appendChild(cell);
    if (id != null) {
      $(row).data("chatSendTo", id);
    }
    tbody_el.appendChild(row);
    return ctx;
  };

  for (let i = 0; i < recipients.length; i++) {
    if (recipients[i].id != chat_send_to) {
      const ctx = add_row(recipients[i].id, recipients[i].flag,
        recipients[i].description);

      if (recipients[i].id == null || recipients[i].id == self) {
        ctx.font = "18px FontAwesome";
        ctx.fillStyle = "rgba(32, 32, 32, 1)";
        if (recipients[i].id == null) {
          ctx.fillText(CHAT_ICON_EVERYBODY, 5, 15);
        } else {
          ctx.fillText(CHAT_ICON_ALLIES, 8, 16);
        }
      }
    }
  }

  const table = document.createElement('table');
  table.appendChild(tbody_el);
  $(table).on('click', 'tbody tr', handle_chat_direction_chosen);
  $(table).appendTo("#chat_context_dialog");

  $("#chat_context_dialog").dialog({
    bgiframe: true,
    modal: false,
    maxHeight: 0.9 * $(window).height()
  }).dialogExtend({
    minimizable: true,
    closable: true,
    icons: {
      minimize: "ui-icon-circle-minus",
      restore: "ui-icon-bullet"
    }
  });

  $("#chat_context_dialog").dialog('open');
}

/****************************************************************************
  Handle a choice in the chat context dialog.
****************************************************************************/
export function handle_chat_direction_chosen(ev: JQuery.ClickEvent): void {
  const new_send_to = $(this).data("chatSendTo");
  $("#chat_context_dialog").dialog('close');
  if (new_send_to == null) {
    set_chat_direction(null);
  } else {
    set_chat_direction(parseFloat(new_send_to));
  }
}

/****************************************************************************
  Set the context for the chatbox.
****************************************************************************/
export function set_chat_direction(player_id: number | null): void {

  if (player_id == chat_send_to) return;

  let player_name: string;
  const icon = $("#chat_direction");
  if (icon.length <= 0) return;
  const ctx = (icon[0] as HTMLCanvasElement).getContext("2d")!;

  if (player_id == null || player_id < 0) {
    player_id = null;
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_EVERYBODY, 7, 15);
    player_name = 'everybody';
  } else if (client.conn.playing != null
    && player_id == client.conn.playing['playerno']) {
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_ALLIES, 10, 16);
    player_name = 'allies';
  } else {
    const pplayer = players[player_id];
    if (pplayer == null) return;
    player_name = pplayer['name']
      + " of the " + nations[pplayer['nation']]['adjective'];
    ctx.clearRect(0, 0, 29, 20);
    const flag = sprites["f." + nations[pplayer['nation']]['graphic_str']];
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
  }

  icon.attr("title", "Sending messages to " + player_name);
  chat_send_to = player_id;
  $("#game_text_input").focus();
}

/****************************************************************************
  Common replacements and encoding for messages.
  They are going to be injected as html. " and ' are changed to appease
  the server message_escape.patch until it is removed.
****************************************************************************/
export function encode_message_text(message: string): string {
  message = message.replace(/^\s+|\s+$/g, "");
  message = message.replace(/&/g, "&amp;");
  message = message.replace(/'/g, "&apos;");
  message = message.replace(/"/g, "&quot;");
  message = message.replace(/</g, "&lt;");
  message = message.replace(/>/g, "&gt;");
  return encodeURIComponent(message);
}

/****************************************************************************
  Tell whether this is a simple message to the choir.
****************************************************************************/
export function is_unprefixed_message(message: string | null): boolean {
  if (message === null) return false;
  if (message.length === 0) return true;

  /* Commands, messages to allies and explicit send to everybody */
  const first = message.charAt(0);
  if (first === '/' || first === '.' || first === ':') return false;

  /* Private messages */
  let quoted_pos = -1;
  if (first === '"' || first === "'") {
    quoted_pos = message.indexOf(first, 1);
  }
  const private_mark = message.indexOf(':', quoted_pos);
  if (private_mark < 0) return true;
  const space_pos = message.indexOf(' ', quoted_pos);
  return (space_pos !== -1 && (space_pos < private_mark));
}

/****************************************************************************
...
****************************************************************************/
export function check_text_input(event: JQuery.KeyDownEvent, chatboxtextarea: JQuery<HTMLElement>): boolean | undefined {

  if (event.keyCode == 13 && event.shiftKey == 0) {
    let message = chatboxtextarea.val() as string;

    if (chat_send_to != null && chat_send_to >= 0
      && is_unprefixed_message(message)) {
      if (client.conn.playing != null
        && chat_send_to == client.conn.playing['playerno']) {
        message = ". " + encode_message_text(message);
      } else {
        const pplayer = players[chat_send_to];
        if (pplayer == null) {
          // Change to public chat, don't send the message,
          // keep it in the chatline and hope the user notices
          set_chat_direction(null);
          return;
        }
        let player_name = pplayer['name'];
        /* TODO:
           - Spaces before ':' not good for longturn yet
           - Encoding characters in the name also does not work
           - Sending a ' or " cuts the message
           So we send the name unencoded, cut until the first "special" character
           and hope that is unique enough to recognize the player. It usually is.
         */
        const badchars = [' ', '"', "'"];
        for (const c of badchars) {
          const i = player_name.indexOf(c);
          if (i > 0) {
            player_name = player_name.substring(0, i);
          }
        }
        message = player_name + encode_message_text(": " + message);
      }
    } else {
      message = encode_message_text(message);
    }

    chatboxtextarea.val('');
    if (!is_touch_device()) chatboxtextarea.focus();
    keyboard_input = true;

    if (message.length >= 4 && message === message.toUpperCase()) {
      return; //disallow all uppercase messages.
    }

    if (is_longturn() && C_S_RUNNING == client_state()
      && message != null && message.indexOf(encode_message_text("/set")) != -1) {
      return; // disallow changing settings in a running LongTurn game.
    }

    if (message.length >= max_chat_message_length) {
      message_log.update({
        event: E_LOG_ERROR,
        message: "Error! The message is too long. Limit: " + max_chat_message_length
      });
      return;
    }

    sendMessage(message);
    return false;
  }
}



/**********************************************************************//**
  Returns TRUE iff the client should ask the server about what actions a
  unit can perform.
**************************************************************************/
export function should_ask_server_for_actions(punit: any): boolean {
  return (punit['action_decision_want'] === FC_ACT_DEC_ACTIVE
    /* The player is interested in getting a pop up for a mere
     * arrival. */
    || (punit['action_decision_want'] === FC_ACT_DEC_PASSIVE
      && popup_actor_arrival));
}

/**********************************************************************//**
  Returns TRUE iff it is OK to ask the server about what actions a unit
  can perform.
**************************************************************************/
export function can_ask_server_for_actions(): boolean {
  /* OK as long as no other unit already asked and aren't done yet. */
  return action_selection_in_progress_for === FC_IDENTITY_NUMBER_ZERO;
}

/**********************************************************************//**
  Ask the server about what actions punit may be able to perform against
  it's stored target tile.

  The server's reply will pop up the action selection dialog unless no
  alternatives exists.
**************************************************************************/
export function ask_server_for_actions(punit: any): boolean {
  let ptile: any;

  if (observing || punit == null) {
    return false;
  }

  /* Only one action selection dialog at a time is supported. */
  if (action_selection_in_progress_for != FC_IDENTITY_NUMBER_ZERO
    && action_selection_in_progress_for != punit.id) {
    console.log("Unit %d started action selection before unit %d was done",
      action_selection_in_progress_for, punit.id);
  }
  action_selection_in_progress_for = punit.id;

  ptile = index_to_tile(punit['action_decision_tile']);

  if (ptile != null) {
    /* Ask the server about what actions punit can do. The server's
     * reply will pop up an action selection dialog for it. */

    const packet: packet_type_t = {
      "pid": packet_unit_get_actions,
      "actor_unit_id": punit['id'],
      "target_unit_id": FC_IDENTITY_NUMBER_ZERO,
      "target_tile_id": punit['action_decision_tile'],
      "target_extra_id": FC_EXTRA_NONE,
      "request_kind": REQEST_PLAYER_INITIATED,
    };
    sendRequest(JSON.stringify(packet));
  }
  return true;
}

/**********************************************************************//**
  The action selection process is no longer in progres for the specified
  unit. It is safe to let another unit enter action selection.
**************************************************************************/
export function action_selection_no_longer_in_progress(old_actor_id: number): void {
  /* IDENTITY_NUMBER_ZERO is accepted for cases where the unit is gone
   * without a trace. */
  if (old_actor_id != action_selection_in_progress_for
    && old_actor_id != FC_IDENTITY_NUMBER_ZERO
    && action_selection_in_progress_for != FC_IDENTITY_NUMBER_ZERO) {
    console.log("Decision taken for %d but selection is for %d.",
      old_actor_id, action_selection_in_progress_for);
  }

  /* Stop objecting to allowing the next unit to ask. */
  action_selection_in_progress_for = FC_IDENTITY_NUMBER_ZERO;

  /* Stop assuming the answer to a follow up question will arrive. */
  is_more_user_input_needed = false;
}

/**********************************************************************//**
  Have the server record that a decision no longer is wanted for the
  specified unit.
**************************************************************************/
export function action_decision_clear_want(old_actor_id: number): void {
  const old = game_find_unit_by_number(old_actor_id);

  if (old != null && old['action_decision_want'] !== FC_ACT_DEC_NOTHING) {
    /* Have the server record that a decision no longer is wanted. */
    const unqueue: packet_type_t = {
      "pid": packet_unit_sscs_set,
      "unit_id": old_actor_id,
      "type": USSDT_UNQUEUE,
      "value": FC_IDENTITY_NUMBER_ZERO
    };
    sendRequest(JSON.stringify(unqueue));
  }
}

/**********************************************************************//**
  Move on to the next unit in focus that needs an action decision.
**************************************************************************/
export function action_selection_next_in_focus(old_actor_id: number): void {
  /* Go to the next unit in focus that needs a decision. */
  for (let i = 0; i < current_focus.length; i++) {
    const funit = current_focus[i];
    if (old_actor_id != funit['id']
      && should_ask_server_for_actions(funit)) {
      ask_server_for_actions(funit);
      return;
    }
  }
}

/**********************************************************************//**
  Request that the player makes a decision for the specified unit.
**************************************************************************/
export function action_decision_request(actor_unit: any): void {
  if (actor_unit == null) {
    console.log("action_decision_request(): No actor unit");
    return;
  }

  if (!unit_is_in_focus(actor_unit)) {
    /* Getting feed back may be urgent. A unit standing next to an enemy
     * could be killed while waiting. */
    unit_focus_urgent(actor_unit);
  } else if (can_client_issue_orders()
    && can_ask_server_for_actions()) {
    /* No need to wait. The actor unit is in focus. No other actor unit
     * is currently asking about action selection. */
    ask_server_for_actions(actor_unit);
  }
}

/****************************************************************************
  Return TRUE iff a unit on this tile is in focus.
****************************************************************************/
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


/****************************************************************************
  Return TRUE iff this unit is in focus.
  TODO: not implemented yet.
****************************************************************************/
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

/****************************************************************************
  Returns a list of units in focus.
****************************************************************************/
export function get_units_in_focus(): any[] {
  return current_focus;
}

/**********************************************************************//**
  Store a priority focus unit.
**************************************************************************/
export function unit_focus_urgent(punit: any): void {
  if (punit == null || punit['activity'] == null) {
    console.log("unit_focus_urgent(): not a unit");
    console.log(punit);
    return;
  }

  urgent_focus_queue.push(punit);
}

/**********************************************************************//**
  Called when a unit is killed; this removes it from the control lists.
**************************************************************************/
export function control_unit_killed(punit: any): void {
  if (urgent_focus_queue != null) {
    urgent_focus_queue = unit_list_without(urgent_focus_queue, punit);
  }

  if (unit_is_in_focus(punit)) {
    if (current_focus.length == 1) {
      /* If the unit in focus is removed, then advance the unit focus. */
      advance_unit_focus();
    } else {
      current_focus = unit_list_without(current_focus, punit);
    }

    update_active_units_dialog();
    update_unit_order_commands();
  }
}

/**************************************************************************
  If there is no unit currently in focus, or if the current unit in
  focus should not be in focus, then get a new focus unit.
  We let GOTO-ing units stay in focus, so that if they have moves left
  at the end of the goto, then they are still in focus.
**************************************************************************/
export function update_unit_focus(): void {
  if (active_city != null) return; /* don't change focus while city dialog is active.*/

  if (C_S_RUNNING != client_state()) return;

  if (!can_ask_server_for_actions()) {
    if (get_units_in_focus().length < 1) {
      console.log("update_unit_focus(): action selection dialog open for"
        + " unit %d but unit not in focus?",
        action_selection_in_progress_for);
    } else {
      /* An actor unit is asking the player what to do. Don't steal his
       * focus. */
      return;
    }
  }

  /* Iterate zero times for no units in focus,
   * otherwise quit for any of the conditions. */
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];

    if (punit['movesleft'] > 0
      && punit['done_moving'] == false
      && punit['ssa_controller'] == FC_SSA_NONE
      && punit['activity'] == FC_ACTIVITY_IDLE) {
      return;
    }

  }

  advance_unit_focus();
}

/**************************************************************************
  This function may be called from packhand.c, via update_unit_focus(),
  as a result of packets indicating change in activity for a unit. Also
  called when user press the "Wait" command.

  FIXME: Add feature to focus only units of a certain category.
**************************************************************************/
export function advance_unit_focus(): void {
  let candidate: any = null;
  let i: number;

  if (client_is_observer()) return;

  if (urgent_focus_queue.length > 0) {
    const focus_tile = (current_focus != null && current_focus.length > 0
      ? current_focus[0]['tile']
      : -1);

    for (i = 0; i < urgent_focus_queue.length; i++) {
      const punit = store.units[urgent_focus_queue[i]['id']];

      if ((FC_ACTIVITY_IDLE != punit.activity
        || punit.has_orders)
        /* This isn't an action decision needed because of an
         * ORDER_ACTION_MOVE located in the middle of an order. */
        && !should_ask_server_for_actions(punit)) {
        /* We have assigned new orders to this unit since, remove it. */
        urgent_focus_queue = unit_list_without(urgent_focus_queue, punit);
        i--;
      } else if (-1 == focus_tile
        || focus_tile == punit['tile']) {
        /* Use the first one found */
        candidate = punit;
        break;
      } else if (null == candidate) {
        candidate = punit;
      }
    }

    if (null != candidate) {
      urgent_focus_queue = unit_list_without(urgent_focus_queue, candidate);
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
    /* Couldn't center on a unit, then try to center on a city... */
    current_focus = []; /* Reset focus units. */
    if (RENDERER_WEBGL) webgl_clear_unit_focus();
    update_active_units_dialog();
    $("#game_unit_orders_default").hide();

    /* find a city to focus on if new game. consider removing this.  */
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
    if (!end_turn_info_message_shown) {
      end_turn_info_message_shown = true;
      message_log.update({ event: E_BEGINNER_HELP, message: "All units have moved, click the \"Turn Done\" button to end your turn." });
    }
  }
}

/**************************************************************************
  Enables and disables the correct units commands for the unit in focus.
**************************************************************************/
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
          && player_invention_state(client.conn.playing, tech_id_by_name('Bridge Building')) == FC_TECH_UNKNOWN)) {
          unit_actions["road"] = { name: "Build road (R)" };
          $("#order_road").show();
        } else {
          $("#order_road").hide();
        }
      } else if (!tile_has_extra(ptile, FC_EXTRA_RAIL)
        && player_invention_state(client.conn.playing,
          tech_id_by_name('Railroad')) == FC_TECH_KNOWN
        && tile_has_extra(ptile, FC_EXTRA_ROAD)) {
        $("#order_road").hide();
        $("#order_maglev").hide();
        $("#order_railroad").show();
        unit_actions['railroad'] = { name: "Build railroad (R)" };
      } else if (typeof FC_EXTRA_MAGLEV !== 'undefined'
        && !tile_has_extra(ptile, FC_EXTRA_MAGLEV)
        && player_invention_state(client.conn.playing,
          tech_id_by_name('Superconductors')) == FC_TECH_KNOWN
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
        && tile_terrain(ptile)['mining_time'] > 0) {
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

      if (tile_terrain(ptile)['cultivate_time'] > 0) {
        $("#order_forest_remove").show();
        unit_actions["cultivate"] = { name: "Cultivate (I)" };
      } else {
        $("#order_forest_remove").hide();
      }
      if (tile_terrain(ptile)['irrigation_time'] > 0) {
        if (!tile_has_extra(ptile, FC_EXTRA_IRRIGATION)) {
          $("#order_irrigate").show();
          $("#order_build_farmland").hide();
          unit_actions["irrigation"] = { name: "Irrigation (I)" };
        } else if (!tile_has_extra(ptile, FC_EXTRA_FARMLAND) && player_invention_state(client.conn.playing, tech_id_by_name('Refrigeration')) == FC_TECH_KNOWN) {
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
      if (tile_terrain(ptile)['plant_time'] > 0) {
        $("#order_forest_add").show();
        unit_actions["plant"] = { name: "Plant (M)" };
      } else {
        $("#order_forest_add").hide();
      }
      if (player_invention_state(client.conn.playing, tech_id_by_name('Construction')) == FC_TECH_KNOWN) {
        unit_actions["fortress"] = { name: string_unqualify(terrain_control['gui_type_base0']) + " (Shift-F)" };
      }

      if (player_invention_state(client.conn.playing, tech_id_by_name('Radio')) == FC_TECH_KNOWN) {
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

    /* Practically all unit types can currently perform some action. */
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

    if (pcity != null && ptype != null && store.unit_types[ptype['obsoleted_by']] != null && can_player_build_unit_direct(client.conn.playing, store.unit_types[ptype['obsoleted_by']])) {
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
        const ntype = unit_type(tunit);
        if (ntype['transport_capacity'] > 0) unit_actions["unit_load"] = { name: "Load on transport (L)" };
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


/**************************************************************************
...
**************************************************************************/
export function init_game_unit_panel(): void {
  if (observing) return;
  unitpanel_active = true;

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
    close: function(event: JQuery.TriggeredEvent, ui: JQuery.UI.DialogUIParams) { unitpanel_active = false; }

  }).dialogExtend({
    "minimizable": true,
    "closable": false,
    "minimize": function(evt: Event, dlg: any) { game_unit_panel_state = $("#game_unit_panel").dialogExtend("state") },
    "restore": function(evt: Event, dlg: any) { game_unit_panel_state = $("#game_unit_panel").dialogExtend("state") },
    "icons": {
      "minimize": "ui-icon-circle-minus",
      "restore": "ui-icon-bullet"
    }
  });

  $("#game_unit_panel").dialog('open');
  $("#game_unit_panel").parent().css("overflow", "hidden");
  if (game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");
}

/**************************************************************************
  Find the nearest available unit for focus, excluding any current unit
  in focus unless "accept_current" is TRUE. If the current focus unit
  is the only possible unit, or if there is no possible unit, returns NULL.
**************************************************************************/
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
        && punit['done_moving'] == false
        && punit['movesleft'] > 0)
        || should_ask_server_for_actions(punit))
      && punit['ssa_controller'] == FC_SSA_NONE
      && waiting_units_list.indexOf(punit['id']) < 0
      && punit['transported'] == false) {
      return punit;
    }
  }

  /* check waiting units for focus candidates */
  for (i = 0; i < waiting_units_list.length; i++) {
    punit = game_find_unit_by_number(waiting_units_list[i]);
    if (punit != null && punit['movesleft'] > 0) {
      waiting_units_list.splice(i, 1);
      return punit;
    }
  }

  return null;
}

/**************************************************************************
...
**************************************************************************/
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

/**************************************************************************
  Sets the focus unit directly. The unit given will be given the
  focus; if NULL the focus will be cleared.

  This function is called for several reasons. Sometimes a fast-focus
  happens immediately as a result of a client action. Other times it
  happens because of a server-sent packet that wakes up a unit.
**************************************************************************/
export function set_unit_focus(punit: any): void {
  current_focus = [];
  if (punit == null) {
    current_focus = [];
  } else {
    current_focus[0] = punit;
    action_selection_next_in_focus(FC_IDENTITY_NUMBER_ZERO);
    if (RENDERER_WEBGL) update_unit_position(index_to_tile(punit['tile']));
  }
  update_active_units_dialog();
  update_unit_order_commands();
}

/**************************************************************************
  See set_unit_focus()
**************************************************************************/
export function set_unit_focus_and_redraw(punit: any): void {
  current_focus = [];

  if (punit == null) {
    current_focus = [];
    if (RENDERER_WEBGL) webgl_clear_unit_focus();
  } else {
    current_focus[0] = punit;
    action_selection_next_in_focus(FC_IDENTITY_NUMBER_ZERO);
    if (RENDERER_WEBGL) update_unit_position(index_to_tile(punit['tile']));
  }

  auto_center_on_focus_unit();
  update_active_units_dialog();
  update_unit_order_commands();
  if (current_focus.length > 0 && $("#game_unit_orders_default").length > 0) $("#game_unit_orders_default").show();
}

/**************************************************************************
 ...
**************************************************************************/
export function set_unit_focus_and_activate(punit: any): void {
  set_unit_focus_and_redraw(punit);
  request_new_unit_activity(punit, FC_ACTIVITY_IDLE, FC_EXTRA_NONE);
}

/**************************************************************************
  See set_unit_focus_and_redraw()
**************************************************************************/
export function city_dialog_activate_unit(punit: any): void {
  request_new_unit_activity(punit, FC_ACTIVITY_IDLE, FC_EXTRA_NONE);
  close_city_dialog();
  set_unit_focus_and_redraw(punit);
}

/**************************************************************************
  Center on the focus unit, if off-screen and auto_center_on_unit is true.
**************************************************************************/
export function auto_center_on_focus_unit(): void {
  if (active_city != null) return; /* don't change focus while city dialog is active.*/

  const ptile = find_a_focus_unit_tile_to_center_on();

  if (ptile != null && auto_center_on_unit) {
    center_tile_mapcanvas(ptile);
    update_unit_position(ptile);
  }
}

/****************************************************************************
  Finds a single focus unit that we can center on. May return NULL.
****************************************************************************/
export function find_a_focus_unit_tile_to_center_on(): any {
  const funit = current_focus[0];

  if (funit == null) return null;

  return index_to_tile(funit['tile']);
}

/**************************************************************************
  Return a pointer to a visible unit, if there is one.
**************************************************************************/
export function find_visible_unit(ptile: any): any {
  let i: number;

  /* If no units here, return nothing. */
  if (ptile == null || unit_list_size(tile_units_func(ptile)) == 0) {
    return null;
  }

  /* If the unit in focus is at this tile, show that on top */
  const pfocus = get_focus_unit_on_tile(ptile);
  if (pfocus != null) {
    return pfocus;
  }

  /* If a city is here, return nothing (unit hidden by city). */
  if (tile_city(ptile) != null) {
    return null;
  }

  /* TODO: add missing C logic here.*/
  const vunits = tile_units_func(ptile);
  for (i = 0; i < vunits.length; i++) {
    const aunit = vunits[i];
    if (aunit['anim_list'] != null && aunit['anim_list'].length > 0) {
      return aunit;
    }
  }

  for (i = 0; i < vunits.length; i++) {
    const tunit = vunits[i];
    if (tunit['transported'] == false) {
      return tunit;
    }
  }

  return tile_units_func(ptile)[0];
}

/**********************************************************************
  TODO: not complete yet
***********************************************************************/
export function get_drawable_unit(ptile: any, citymode: any): any {
  const punit = find_visible_unit(ptile);

  if (punit == null) return null;

  /*if (citymode != null && unit_owner(punit) == city_owner(citymode))
    return null;*/

  if (!unit_is_in_focus(punit) || current_focus.length > 0) {
    return punit;
  } else {
    return null;
  }
}

/**************************************************************************
  Returns true if the order preferably should be performed from an
  adjacent tile.
**************************************************************************/
export function order_wants_direction(order: number, act_id: number, ptile: any): boolean {
  const action = actions[act_id];

  if (order == FC_ORDER_PERFORM_ACTION && action == null) {
    /* Bad action id or action rule data not received and stored
     * properly. */
    console.log("Asked to put invalid action " + act_id + " in an order.");
    return false;
  }

  switch (order) {
    case FC_ORDER_MOVE:
    case FC_ORDER_ACTION_MOVE:
      /* Not only is it legal. It is mandatory. A move is always done in a
       * direction. */
      return true;
    case FC_ORDER_PERFORM_ACTION:
      if (action['min_distance'] > 0) {
        /* Always illegal to do to a target on the actor's own tile. */
        return true;
      }

      if (action['max_distance'] < 1) {
        /* Always illegal to perform to a target on a neighbor tile. */
        return false;
      }

      /* FIXME: allied units and cities shouldn't always make actions be
       * performed from the neighbor tile. */
      if (tile_city(ptile) != null
        || tile_units_func(ptile).length != 0) {
        /* Won't be able to move to the target tile to perform the action on
         * top of it. */
        return true;
      }

      return false;
    default:
      return false;
  }
}

/**********************************************************************//**
  Paradrop to a location.
**************************************************************************/
export function do_unit_paradrop_to(punit: any, ptile: any): void {
  let act_id: number;
  let paradrop_action: any = null;

  for (act_id = 0; act_id < FC_ACTION_COUNT; act_id++) {
    const paction = action_by_number(act_id);

    if (!(action_has_result(paction, FC_ACTRES_PARADROP_CONQUER)
      || action_has_result(paction, FC_ACTRES_PARADROP))) {
      /* Not relevant. */
      continue;
    }

    if (utype_can_do_action(unit_type(punit), act_id)) {
      if (paradrop_action == null) {
        /* This is the first possible paradrop action. */
        paradrop_action = paction;
      } else {
        /* More than one paradrop action may be possible. The user must
         * choose. Have the server record that an action decision is wanted
         * for this unit so the dialog will be brought up. */
        const packet: packet_type_t = {
          "pid": packet_unit_sscs_set,
          "unit_id": punit['id'],
          "type": USSDT_QUEUE,
          "value": ptile['index']
        };
        sendRequest(JSON.stringify(packet));
        return;
      }
    }
  }

  if (paradrop_action != null) {
    request_unit_do_action(paradrop_action['id'], punit['id'],
      ptile['index']);
  }
}

// Forward declarations for functions defined in other parts of the module
declare function global_keyboard_listener(event: JQuery.KeyDownEvent): void;
declare function send_end_turn(): void;
declare function set_default_mapview_active(): void;
declare function set_default_mapview_inactive(): void;
declare function handle_context_menu_callback(key: string): void;
declare function can_client_issue_orders(): boolean;
declare let touch_start_x: number;
declare let touch_start_y: number;

// === Part 2 ===
// Part 2 continues - variables and functions are in the same module scope

export function do_map_click(ptile: any, qtype: any, first_time_called: boolean) {
  let punit: any;
  let packet: any;
  let pcity: any;
  if (ptile == null || client_is_observer()) return;

  if (current_focus.length > 0 && current_focus[0]['tile'] == ptile['index']) {
    /* clicked on unit at the same tile, then deactivate goto and show context menu. */
    if (goto_active && !isTouchDevice()) {
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

  if (goto_active) {
    if (current_focus.length > 0) {
      // Send goto order for all units in focus.
      for (let s = 0; s < current_focus.length; s++) {
        punit = current_focus[s];
        // Get the path the server sent using PACKET_WEB_GOTO_PATH.
        const goto_path = goto_request_map[punit['id'] + "," + ptile['x'] + "," + ptile['y']];
        if (goto_path == null) {
          continue;
        }

        /* The tile the unit currently is standing on. */
        const old_tile = index_to_tile(punit['tile']);

        /* Create an order to move along the path. */
        packet = {
          "pid": packet_unit_orders,
          "unit_id": punit['id'],
          "src_tile": old_tile['index'],
          "length": goto_path['length'],
          "repeat": false,
          "vigilant": false,

          /* Each individual order is added later. */

          "dest_tile": ptile['index']
        };

        const order = {
          "order": ORDER_LAST,
          "activity": ACTIVITY_LAST,
          "target": 0,
          "sub_target": 0,
          "action": ACTION_COUNT,
          "dir": -1
        };

        /* Add each individual order. */
        packet['orders'] = [];
        for (let i = 0; i < goto_path['length']; i++) {
          /* TODO: Have the server send the full orders in stead of just the
           * dir part. Use that data in stead. */

          if (goto_path['dir'][i] == -1) {
            /* Assume that this means refuel. */
            order['order'] = ORDER_FULL_MP;
          } else if (i + 1 != goto_path['length']) {
            /* Don't try to do an action in the middle of the path. */
            order['order'] = ORDER_MOVE;
          } else {
            /* It is OK to end the path in an action. */
            order['order'] = ORDER_ACTION_MOVE;
          }

          order['dir'] = goto_path['dir'][i];
          order['activity'] = ACTIVITY_LAST;
          order['target'] = 0;
          order['sub_target'] = 0;
          order['action'] = ACTION_COUNT;

          packet['orders'][i] = Object.assign({}, order);
        }

        if (goto_last_order != ORDER_LAST) {
          /* The final order is specified. */
          let pos: number;

          /* Should the final order be performed from the final tile or
           * from the tile before it? In some cases both are legal. */
          if (!order_wants_direction(goto_last_order, goto_last_action,
            ptile)) {
            /* Append the final order. */
            pos = packet['length'];

            /* Increase orders length */
            packet['length'] = packet['length'] + 1;

            /* Initialize the order to "empty" values. */
            order['order'] = ORDER_LAST;
            order['dir'] = -1;
            order['activity'] = ACTIVITY_LAST;
            order['target'] = 0;
            order['sub_target'] = 0;
            order['action'] = ACTION_COUNT;

          } else {
            /* Replace the existing last order with the final order */
            pos = packet['length'] - 1;
          }

          /* Set the final order. */
          order['order'] = goto_last_order;

          /* Perform the final action. */
          order['action'] = goto_last_action;
          order['target'] = ptile['index'];

          packet['orders'][pos] = Object.assign({}, order);
        }

        /* The last order has now been used. Clear it. */
        goto_last_order = ORDER_LAST;
        goto_last_action = ACTION_COUNT;

        if (punit['id'] != goto_path['unit_id']) {
          /* Shouldn't happen. Maybe an old path wasn't cleared out. */
          console.log("Error: Tried to order unit " + punit['id']
            + " to move along a path made for unit "
            + goto_path['unit_id']);
          return;
        }
        /* Send the order to move using the orders system. */
        sendRequest(JSON.stringify(packet));
        if (punit['movesleft'] > 0) {
          unit_move_sound_play(punit);
        } else if (!has_movesleft_warning_been_shown) {
          has_movesleft_warning_been_shown = true;
          const ptype = unit_type(punit);
          message_log.update({
            event: E_BAD_COMMAND,
            message: ptype['name'] + " has no moves left. Press turn done for the next turn."
          });
        }

      }
      clear_goto_tiles();

    } else if (isTouchDevice()) {
      /* this is to handle the case where a mobile touch device user chooses
      GOTO from the context menu or clicks the goto icon. Then the goto path
      has to be requested first, and then do_map_click will be called again
      to issue the unit order based on the goto path. */
      if (current_focus.length > 0) {
        request_goto_path(current_focus[0]['id'], ptile['x'], ptile['y']);
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

  } else if (paradrop_active && current_focus.length > 0) {
    punit = current_focus[0];
    do_unit_paradrop_to(punit, ptile);
    paradrop_active = false;

  } else if (airlift_active && current_focus.length > 0) {
    punit = current_focus[0];
    pcity = tile_city(ptile);
    if (pcity != null) {
      request_unit_do_action(ACTION_AIRLIFT, punit['id'], pcity['id']);
    }
    airlift_active = false;

  } else if (action_tgt_sel_active && current_focus.length > 0) {
    request_unit_act_sel_vs(ptile);
    action_tgt_sel_active = false;
  } else {
    if (pcity != null) {
      if (pcity['owner'] == store.client.conn.playing.playerno) {
        if (sunits != null && sunits.length > 0
          && sunits[0]['activity'] == ACTIVITY_IDLE) {
          set_unit_focus_and_redraw(sunits[0]);
          if (renderer == RENDERER_2DCANVAS) {
            $("#canvas").contextMenu();
          } else {
            $("#canvas_div").contextMenu();
          }
        } else if (!goto_active) {
          show_city_dialog(pcity);
        }
      }
      return;
    }

    if (sunits != null && sunits.length == 0) {
      /* Clicked on a tile with no units. */
      set_unit_focus_and_redraw(null);

    } else if (sunits != null && sunits.length > 0) {
      if (sunits[0]['owner'] == store.client.conn.playing.playerno) {
        if (sunits.length == 1) {
          /* A single unit has been clicked with the mouse. */
          const unit = sunits[0];
          set_unit_focus_and_activate(unit);
        } else {
          /* more than one unit is on the selected tile. */
          set_unit_focus_and_redraw(sunits[0]);
          update_active_units_dialog();
        }

        if (isTouchDevice()) {
          if (renderer == RENDERER_2DCANVAS) {
            $("#canvas").contextMenu();
          } else {
            $("#canvas_div").contextMenu();
          }
        }
      } else if (pcity == null) {
        // Clicked on a tile with units owned by other players.
        current_focus = sunits;
        $("#game_unit_orders_default").hide();
        update_active_units_dialog();
      }
    }
  }

  paradrop_active = false;
  airlift_active = false;
  action_tgt_sel_active = false;
}


/**************************************************************************
  Returns a possibly active dialog.
  Helper function to know if the map keyhandler may apply.
**************************************************************************/
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

/**************************************************************************
  Callback to handle keyboard events
**************************************************************************/
export function global_keyboard_listener(ev: KeyboardEvent) {
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;

  if (C_S_RUNNING != client_state()) return;

  if (!ev) ev = window.event as KeyboardEvent;
  const keyboard_key = String.fromCharCode(ev.keyCode);

  if (0 === $("#tabs").tabs("option", "active")) {
    // The Map tab is active
    if (find_active_dialog() == null) {
      map_handle_key(keyboard_key, ev.keyCode, ev['ctrlKey'], ev['altKey'], ev['shiftKey'], ev);
    }
  }
  civclient_handle_key(keyboard_key, ev.keyCode, ev['ctrlKey'], ev['altKey'], ev['shiftKey'], ev);

  if (renderer == RENDERER_2DCANVAS) $("#canvas").contextMenu('hide');
}

/**************************************************************************
  Handles global keybindings.
**************************************************************************/
export function
  civclient_handle_key(keyboard_key: string, key_code: number, ctrl: boolean, alt: boolean, shift: boolean, the_event: KeyboardEvent) {
  switch (keyboard_key) {
    case 'S':
      if (ctrl) {
        the_event.preventDefault();
        quicksave();
      }
      break;

    case 'Q':
      if (alt) civclient_benchmark(0);
      break;

    case 'D':
      if ((!shift) && (alt || ctrl)) {
        show_debug_info();
      }
      break;

    default:
      if (key_code == 13 && shift && C_S_RUNNING == client_state()) {
        send_end_turn();
      }
  }
}

/**************************************************************************
  Handles map keybindings.
**************************************************************************/
export function
  map_handle_key(keyboard_key: string, key_code: number, ctrl: boolean, alt: boolean, shift: boolean, the_event: KeyboardEvent) {
  switch (keyboard_key) {
    case 'B':
      request_unit_build_city();
      break;

    case 'G':
      if (current_focus.length > 0) {
        activate_goto();
      }
      break;

    case 'H':
      key_unit_homecity();
      break;

    case 'X':
      key_unit_auto_explore();
      break;

    case 'A':
      key_unit_auto_work();
      break;

    case 'L':
      if (shift) {
        key_unit_airlift();
      } else {
        key_unit_load();
      }
      break;

    case 'W':
      key_unit_wait();
      break;

    case 'J':
      if (shift) {
        key_unit_idle();
      } else {
        key_unit_noorders();
      }
      break;

    case 'R':
      key_unit_road();
      break;

    case 'E':
      if (shift) {
        key_unit_airbase();
      }
      break;

    case 'F':
      if (shift) {
        key_unit_fortress();
      } else {
        key_unit_fortify();
      }
      break;

    case 'I':
      if (shift) {
        key_unit_cultivate();
      } else {
        key_unit_irrigate();
      }
      break;

    case 'U':
      key_unit_upgrade();
      break;

    case 'S':
      if (!ctrl) {
        key_unit_sentry();
      }
      break;

    case 'P':
      if (shift) {
        key_unit_pillage();
      } else {
        key_unit_clean();
      }
      break;

    case 'M':
      if (shift) {
        key_unit_plant();
      } else {
        key_unit_mine();
      }
      break;

    case 'O':
      key_unit_transform();
      break;

    case 'T':
      key_unit_unload();
      break;

    case 'C':
      if (ctrl) {
        show_citybar = !show_citybar;
      } else if (current_focus.length > 0) {
        auto_center_on_focus_unit();
      }
      break;

    case 'N':
      if (shift) {
        key_unit_nuke();
      }
      break;

    case 'D':
      if (shift) {
        key_unit_disband();
      } else if (!(alt || ctrl)) {
        key_unit_action_select();
      }
      break;

  }

  switch (key_code) {
    case 35: //1
    case 97:
      key_unit_move(DIR8_SOUTH);
      break;

    case 40: // 2
    case 98:
      key_unit_move(DIR8_SOUTHEAST);
      break;

    case 34: // 3
    case 99:
      key_unit_move(DIR8_EAST);
      break;

    case 37: // 4
    case 100:
      key_unit_move(DIR8_SOUTHWEST);
      break;

    case 39: // 6
    case 102:
      key_unit_move(DIR8_NORTHEAST);
      break;

    case 36: // 7
    case 103:
      key_unit_move(DIR8_WEST);
      break;

    case 38: // 8
    case 104:
      key_unit_move(DIR8_NORTHWEST);
      break;

    case 33: // 9
    case 105:
      key_unit_move(DIR8_NORTH);
      break;

    case 27:
      //Esc

      deactivate_goto(false);

      /* Abort started multiple unit selection. */
      map_select_active = false;
      map_select_check = false;
      mapview_mouse_movement = false;

      /* Abort any context menu blocking. */
      context_menu_active = true;
      if (renderer == RENDERER_2DCANVAS) {
        $("#canvas").contextMenu(true);
      } else {
        $("#canvas_div").contextMenu(true);
      }

      /* Abort target tile selection. */
      paradrop_active = false;
      airlift_active = false;
      action_tgt_sel_active = false;
      break;

    case 32: // Space, will clear selection and goto.
      current_focus = [];
      if (renderer == RENDERER_WEBGL) webgl_clear_unit_focus();
      goto_active = false;
      $("#canvas_div").css("cursor", "default");
      goto_request_map = {};
      goto_turns_request_map = {};
      clear_goto_tiles();
      update_active_units_dialog();

      break;

    case 107:
      //zoom in
      if (renderer == RENDERER_WEBGL) {
        let new_camera_dy = camera_dy - 60;
        let new_camera_dx = camera_dx - 45;
        let new_camera_dz = camera_dz - 45;
        if (new_camera_dy < 250 || new_camera_dy > 1300) {
          return;
        } else {
          camera_dx = new_camera_dx;
          camera_dy = new_camera_dy;
          camera_dz = new_camera_dz;
        }
        camera_look_at(camera_current_x, camera_current_y, camera_current_z);
      }
      break;

    case 109:
      //zoom out
      if (renderer == RENDERER_WEBGL) {
        let new_camera_dy = camera_dy + 60;
        let new_camera_dx = camera_dx + 45;
        let new_camera_dz = camera_dz + 45;
        if (new_camera_dy < 250 || new_camera_dy > 1300) {
          return;
        } else {
          camera_dx = new_camera_dx;
          camera_dy = new_camera_dy;
          camera_dz = new_camera_dz;
        }
        camera_look_at(camera_current_x, camera_current_y, camera_current_z);
      }
      break;

  }

}

/**************************************************************************
  Handles everything when the user clicked on the context menu
**************************************************************************/
export function handle_context_menu_callback(key: string) {
  switch (key) {
    case "build":
      request_unit_build_city();
      break;

    case "tile_info":
      const ptile = find_a_focus_unit_tile_to_center_on();
      if (ptile != null) popit_req(ptile);
      break;

    case "goto":
      activate_goto();
      break;

    case "explore":
      key_unit_auto_explore();
      break;

    case "fortify":
      key_unit_fortify();
      break;

    case "road":
    case "railroad":
    case "maglev":
      key_unit_road();
      break;

    case "plant":
      key_unit_plant();
      break;

    case "mine":
      key_unit_mine();
      break;

    case "autoworkers":
      key_unit_auto_work();
      break;

    case "clean":
      key_unit_clean();
      break;

    case "cultivate":
      key_unit_cultivate();
      break;

    case "irrigation":
      key_unit_irrigate();
      break;

    case "fortress":
      key_unit_fortress();
      break;

    case "airbase":
      key_unit_airbase();
      break;

    case "transform":
      key_unit_transform();
      break;

    case "nuke":
      key_unit_nuke();
      break;

    case "paradrop":
      key_unit_paradrop();
      break;

    case "pillage":
      key_unit_pillage();
      break;

    case "homecity":
      key_unit_homecity();
      break;

    case "airlift":
      key_unit_airlift();
      break;

    case "sentry":
      key_unit_sentry();
      break;

    case "wait":
      key_unit_wait();
      break;

    case "noorders":
      key_unit_noorders();
      break;

    case "idle":
      key_unit_idle();
      break;

    case "upgrade":
      key_unit_upgrade();
      break;

    case "disband":
      key_unit_disband();
      break;

    case "unit_load":
      key_unit_load();
      break;

    case "unit_unload":
      key_unit_unload();
      break;

    case "unit_show_cargo":
      key_unit_show_cargo();
      break;

    case "action_selection":
      key_unit_action_select();
      break;

    case "show_city":
      const stile = find_a_focus_unit_tile_to_center_on();
      if (stile != null) {
        show_city_dialog(tile_city(stile));
      }
      break;
  }
  if (key != "goto" && isTouchDevice()) {
    deactivate_goto(false);
  }
}

/**************************************************************************
  Activate a regular goto.
**************************************************************************/
export function activate_goto() {
  clear_goto_tiles();
  activate_goto_last(ORDER_LAST, ACTION_COUNT);
}

/**************************************************************************
  Activate a goto and specify what to do once there.
**************************************************************************/
export function activate_goto_last(last_order: any, last_action: any) {
  goto_active = true;
  $("#canvas_div").css("cursor", "crosshair");

  /* Set what the unit should do on arrival. */
  goto_last_order = last_order;
  goto_last_action = last_action;

  if (current_focus.length > 0) {
    if (intro_click_description) {
      if (isTouchDevice()) {
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
      intro_click_description = false;
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

/**************************************************************************
 ...
**************************************************************************/
export function deactivate_goto(will_advance_unit_focus: boolean) {
  goto_active = false;
  $("#canvas_div").css("cursor", "default");
  goto_request_map = {};
  goto_turns_request_map = {};
  clear_goto_tiles();

  /* Clear the order this action would have performed. */
  goto_last_order = ORDER_LAST;
  goto_last_action = ACTION_COUNT;

  // update focus to next unit after 600ms.
  if (will_advance_unit_focus) setTimeout(update_unit_focus, 600);

}

/**************************************************************************
  Ends the current turn.
**************************************************************************/
export function send_end_turn() {
  if (store.game_info == null) return;

  $("#turn_done_button").button("option", "disabled", true);
  if (!isTouchDevice()) $("#turn_done_button").tooltip({ disabled: true });
  const packet = { "pid": packet_player_phase_done, "turn": store.game_info['turn'] };
  sendRequest(JSON.stringify(packet));
  update_turn_change_timer();

  if (is_pbem()) {
    setTimeout(pbem_end_phase, 2000);
  }
  if (is_longturn()) {
    show_dialog_message("Turn done!",
      "Your turn in this Freeciv-web: One Turn per Day game is now over. In this game one turn is played every day. " +
      "To play your next turn in this game, go to " + window.location.host + " and click <b>Games</b> in the menu, then <b>Multiplayer</b> " +
      "and there you will find this Freeciv-web: One Turn per Day game in the list. You can also bookmark this page.<br>" +
      "See you again soon!");
  }
}


/**************************************************************************
  Tell the units in focus to auto explore.
**************************************************************************/
export function key_unit_auto_explore() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    request_unit_ssa_set(funits[i], SSA_AUTOEXPLORE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to load on a transport.
**************************************************************************/
export function key_unit_load() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    let transporter_unit_id = 0;

    let has_transport_unit = false;
    const units_on_tile = tile_units(ptile);
    for (let r = 0; r < units_on_tile.length; r++) {
      const tunit = units_on_tile[r];
      if (tunit['id'] == punit['id']) continue;
      const ntype = unit_type(tunit);
      if (ntype['transport_capacity'] > 0) {
        has_transport_unit = true;
        transporter_unit_id = tunit['id'];
      }
    }

    if (has_transport_unit && transporter_unit_id > 0 && punit['tile'] > 0) {
      request_unit_do_action(ACTION_TRANSPORT_BOARD, punit['id'],
        transporter_unit_id);
    }
  }
  setTimeout(advance_unit_focus, 700);
}

/**************************************************************************
  Unload all units from transport
**************************************************************************/
export function key_unit_unload() {
  const funits = get_units_in_focus();
  let units_on_tile: any[] = [];
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    units_on_tile = tile_units(ptile);
  }

  for (let i = 0; i < units_on_tile.length; i++) {
    const punit = units_on_tile[i];

    if (punit['transported'] && punit['transported_by'] > 0
      && punit['owner'] == store.client.conn.playing.playerno) {
      request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
      request_unit_do_action(ACTION_TRANSPORT_DEBOARD, punit['id'],
        punit['transported_by']);
    } else {
      request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
      request_unit_do_action(ACTION_TRANSPORT_UNLOAD,
        punit['transported_by'],
        punit['id']);
    }
  }
  setTimeout(advance_unit_focus, 700);
}

/**************************************************************************
  Focus a unit transported by this transport unit
**************************************************************************/
export function key_unit_show_cargo() {
  const funits = get_units_in_focus();
  let units_on_tile: any[] = [];
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    units_on_tile = tile_units(ptile);
  }

  current_focus = [];
  for (let i = 0; i < units_on_tile.length; i++) {
    const punit = units_on_tile[i];
    if (punit['transported'] && punit['transported_by'] > 0) {
      current_focus.push(punit);
    }
  }
  update_active_units_dialog();
  update_unit_order_commands();
}

/**************************************************************************
  Tell the unit to wait (focus to next unit with moves left)
**************************************************************************/
export function key_unit_wait() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    waiting_units_list.push(punit['id']);
  }
  advance_unit_focus();
}

/**************************************************************************
  Tell the unit to have no orders this turn, set unit to done moving.
**************************************************************************/
export function key_unit_noorders() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    punit['done_moving'] = true;
  }

  advance_unit_focus();
}

/**************************************************************************
  Tell the units to stop what they are doing.
**************************************************************************/
export function key_unit_idle() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_IDLE, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to sentry.
**************************************************************************/
export function key_unit_sentry() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_SENTRY, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to fortify.
**************************************************************************/
export function key_unit_fortify() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_FORTIFYING, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to build base.
**************************************************************************/
export function key_unit_fortress() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);

    for (let b = 0; b < bases.length; b++) {
      if (bases[b]['base']['gui_type'] == BASE_GUI_FORTRESS
        && !tile_has_extra(ptile, bases[b])) {
        request_new_unit_activity(punit, ACTIVITY_BASE, bases[b]['id']);
      }
    }
  }

  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to build airbase.
**************************************************************************/
export function key_unit_airbase() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);

    for (let b = 0; b < bases.length; b++) {
      if (bases[b]['base']['gui_type'] == BASE_GUI_AIRBASE
        && !tile_has_extra(ptile, bases[b])) {
        request_new_unit_activity(punit, ACTIVITY_BASE, bases[b]['id']);
      }
    }
  }

  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to irrigate.
**************************************************************************/
export function key_unit_irrigate() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_IRRIGATE, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to cultivate.
**************************************************************************/
export function key_unit_cultivate() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_CULTIVATE, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units to clean pollution.
**************************************************************************/
export function key_unit_clean() {
  const funits = get_units_in_focus();

  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];

    request_new_unit_activity(punit, ACTIVITY_CLEAN, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}


/**************************************************************************
  Start a goto that will end in the unit(s) detonating in a nuclear
  exlosion.
**************************************************************************/
export function key_unit_nuke() {
  /* The last order of the goto is the nuclear detonation. */
  activate_goto_last(ORDER_PERFORM_ACTION, ACTION_NUKE);
}

/**************************************************************************
  Tell the units to upgrade.
**************************************************************************/
export function key_unit_upgrade() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const pcity = tile_city(index_to_tile(punit['tile']));
    const target_id = (pcity != null) ? pcity['id'] : 0;
    request_unit_do_action(ACTION_UPGRADE_UNIT, punit['id'], target_id);
  }
  update_unit_focus();
}

/**************************************************************************
  Tell the units to paradrop.
**************************************************************************/
export function key_unit_paradrop() {
  paradrop_active = true;
  message_log.update({
    event: E_BEGINNER_HELP,
    message: "Click on the tile to send this paratrooper to."
  });
}

/**************************************************************************
  Tell the units to airlift.
**************************************************************************/
export function key_unit_airlift() {
  airlift_active = true;
  message_log.update({
    event: E_BEGINNER_HELP,
    message: "Click on the city to airlift this unit to."
  });
}

/**************************************************************************
  Tell the units to transform the terrain.
**************************************************************************/
export function key_unit_transform() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_TRANSFORM, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to pillage.
**************************************************************************/
export function key_unit_pillage() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const tgt = get_what_can_unit_pillage_from(punit, null);
    if (tgt.length > 0) {
      if (tgt.length == 1) {
        request_unit_do_action(ACTION_PILLAGE, punit['id'], punit.tile,
          tgt[0]);
      } else {
        popup_pillage_selection_dialog(punit, tgt);
      }
    }
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to mine.
**************************************************************************/
export function key_unit_mine() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    /* EXTRA_NONE -> server decides */
    request_new_unit_activity(punit, ACTIVITY_MINE, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to plant.
**************************************************************************/
export function key_unit_plant() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    request_new_unit_activity(punit, ACTIVITY_PLANT, EXTRA_NONE);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Tell the units in focus to build some kind of road.
**************************************************************************/
export function key_unit_road() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);

    for (let r = 0; r < roads.length; r++) {
      if (!tile_has_extra(ptile, roads[r])) {
        request_new_unit_activity(punit, ACTIVITY_GEN_ROAD, roads[r]['id']);
      }
    }
  }

  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Changes unit homecity to the city on same tile.
**************************************************************************/
export function key_unit_homecity() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const ptile = index_to_tile(punit['tile']);
    const pcity = tile_city(ptile);

    if (pcity != null) {
      request_unit_do_action(ACTION_HOME_CITY, punit['id'], pcity['id']);
      $("#order_change_homecity").hide();
    }
  }
}

/**************************************************************************
  Show action selection dialog for unit(s).
**************************************************************************/
export function key_unit_action_select() {
  if (action_tgt_sel_active == true) {
    /* The 2nd key press means that the actor should target its own
     * tile. */
    action_tgt_sel_active = false;

    /* Target tile selected. Clean up hover state. */
    request_unit_act_sel_vs_own_tile();
  } else {
    action_tgt_sel_active = true;
    message_log.update({
      event: E_BEGINNER_HELP,
      message: "Click on a tile to act against it. "
        + "Press 'd' again to act against own tile."
    });
  }
}

/**************************************************************************
  An action selection dialog for the selected units against the specified
  tile is wanted.
**************************************************************************/
export function request_unit_act_sel_vs(ptile: any) {
  const funits = get_units_in_focus();

  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const packet = {
      "pid": packet_unit_sscs_set,
      "unit_id": punit['id'],
      "type": USSDT_QUEUE,
      "value": ptile['index']
    };

    /* Have the server record that an action decision is wanted for this
     * unit. */
    sendRequest(JSON.stringify(packet));
  }
}

/**************************************************************************
  An action selection dialog for the selected units against its own tile.
**************************************************************************/
export function request_unit_act_sel_vs_own_tile() {
  const funits = get_units_in_focus();
  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];
    const packet = {
      "pid": packet_unit_sscs_set,
      "unit_id": punit['id'],
      "type": USSDT_QUEUE,
      "value": punit['tile']
    };

    /* Have the server record that an action decision is wanted for this
     * unit. */
    sendRequest(JSON.stringify(packet));
  }
}

/**************************************************************************
  Call to request (from the server) that the focus unit is put into
  autoworker mode.
**************************************************************************/
export function key_unit_auto_work() {
  const funits = get_units_in_focus();

  for (let i = 0; i < funits.length; i++) {
    const punit = funits[i];

    request_unit_autoworkers(punit);
  }
  setTimeout(update_unit_focus, 700);
}

/**************************************************************************
  Ask the server to cancel unit orders, if any.
**************************************************************************/
export function request_unit_cancel_orders(punit: any) {
  if (punit != null && (punit.ssa_controller != SSA_NONE
    || punit.has_orders)) {
    punit.ssa_controller = SSA_NONE;
    punit.has_orders = false;
    const packet = {
      pid: packet_unit_orders,
      unit_id: punit.id,
      src_tile: punit.tile,
      length: 0,
      repeat: false,
      vigilant: false,
      dest_tile: punit.tile
    };
    packet.orders = [];
    sendRequest(JSON.stringify(packet));
  }
}

/**************************************************************************
 ...
**************************************************************************/
export function request_new_unit_activity(punit: any, activity: any, target: any) {
  request_unit_cancel_orders(punit);
  action_decision_clear_want(punit['id']);
  const packet = {
    "pid": packet_unit_change_activity, "unit_id": punit['id'],
    "activity": activity, "target": target
  };
  sendRequest(JSON.stringify(packet));
}

/**********************************************************************//**
  Call to request (from the server) that the unit is put under the
  control of the specified server side agent or - if agent is SSA_NONE -
  under client control.
**************************************************************************/
export function request_unit_ssa_set(punit: any, agent: any) {
  if (punit != null) {
    const packet = {
      "pid": packet_unit_server_side_agent_set,
      "unit_id": punit['id'],
      "agent": agent,
    };
    sendRequest(JSON.stringify(packet));
  }
}

/****************************************************************************
  Call to request (from the server) that the settler unit is put into
  autoworker mode.
****************************************************************************/
export function request_unit_autoworkers(punit: any) {
  if (punit != null) {
    request_unit_cancel_orders(punit);
    action_decision_clear_want(punit['id']);
    request_unit_ssa_set(punit, SSA_AUTOWORKER);
  }
}

/****************************************************************************
  Request that a city is built.
****************************************************************************/
export function request_unit_build_city() {
  if (current_focus.length > 0) {
    const punit = current_focus[0];
    if (punit != null) {

      if (punit['movesleft'] == 0) {
        message_log.update({
          event: E_BAD_COMMAND,
          message: "Unit has no moves left to build city"
        });
        return;
      }

      const ptype = unit_type(punit);
      if (ptype['name'] == "Settlers" || ptype['name'] == "Engineers") {
        let packet = null;
        const target_city = tile_city(index_to_tile(punit['tile']));

        /* Do Join City if located inside a city. */
        if (target_city == null) {
          packet = {
            "pid": packet_city_name_suggestion_req,
            "unit_id": punit['id']
          };
        } else {
          request_unit_do_action(ACTION_JOIN_CITY, punit.id, target_city.id);
        }

        sendRequest(JSON.stringify(packet));
      }
    }
  }
}

/**********************************************************************//**
 * Send a request for an actor unit to do a specific action.
 *
 * @param action_id - action type to be requested
 * @param actor_id - acting unit id
 * @param target_id - target unit, city or tile
 * @param [sub_tgt_id=0] - optional sub target. Only some actions take
 *     a sub target. The sub target kind depends on the action. e.g.
 *     the technology to steal from a city, the extra to
 *     pillage at a tile, and the building to sabotage in a city.
 * @param [name=""] - optional name, used by ACTION_FOUND_CITY
**************************************************************************/
export function request_unit_do_action(action_id: any, actor_id: any, target_id: any, sub_tgt_id: any = 0,
  name: string = "") {
  sendRequest(JSON.stringify({
    pid: packet_unit_do_action,
    action_type: action_id,
    actor_id: actor_id,
    target_id: target_id,
    sub_tgt_id: sub_tgt_id || 0,
    name: name || ""
  }));
  action_decision_clear_want(actor_id);
}

/**************************************************************************
  Tell the units in focus to disband.
**************************************************************************/
export function key_unit_disband() {

  swal({
    title: "Disband unit?",
    text: "Do you want to destroy this unit?",
    type: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DD6B55",
    confirmButtonText: "Yes, disband unit.",
    closeOnConfirm: true
  },
    function () {
      const funits = get_units_in_focus();
      for (let i = 0; i < funits.length; i++) {
        const punit = funits[i];
        const target_city = tile_city(index_to_tile(punit['tile']));

        /* Do Disband Unit Recover if located inside a city. */
        /* FIXME: Only rulesets where the player can do Disband Unit Recover to all
         * domestic and allied cities are supported here. */
        const action_id = target_city ? ACTION_DISBAND_UNIT_RECOVER : ACTION_DISBAND_UNIT;
        const target_id = target_city ? target_city['id'] : punit['id'];
        request_unit_do_action(action_id, punit['id'], target_id);
      }
      setTimeout(update_unit_focus, 700);
      setTimeout(update_active_units_dialog, 800);
    });

}

/**************************************************************************
  Moved the unit in focus in the specified direction.
**************************************************************************/
export function key_unit_move(dir: number) {
  if (current_focus.length > 0) {
    const punit = current_focus[0];
    if (punit == null) {
      return;
    }

    const ptile = index_to_tile(punit['tile']);
    if (ptile == null) {
      return;
    }

    const newtile = mapstep(ptile, dir);
    if (newtile == null) {
      return;
    }

    /* Send the order to move using the orders system. */
    const order = {
      "order": ORDER_ACTION_MOVE,
      "dir": dir,
      "activity": ACTIVITY_LAST,
      "target": 0,
      "sub_target": 0,
      "action": ACTION_COUNT
    };

    if (punit['transported']
      /* No non domestic units */
      && newtile['units'].every(function (ounit: any) {
        return ounit['owner'] == store.client.conn.playing.playerno;
      })
      /* No non domestic cities */
      && (tile_city(newtile) == null
        || tile_city(newtile)['owner'] == store.client.conn.playing.playerno)
      && !tile_has_extra(newtile, EXTRA_HUT)
      && (newtile['extras_owner'] == store.client.conn.playing.playerno
        || !tile_has_territory_claiming_extra(newtile))) {
      order["order"] = ORDER_MOVE;
    }

    const packet = {
      "pid": packet_unit_orders,
      "unit_id": punit['id'],
      "src_tile": ptile['index'],
      "length": 1,
      "repeat": false,
      "vigilant": false,
      "orders": [order],
      "dest_tile": newtile['index']
    };

    sendRequest(JSON.stringify(packet));
    unit_move_sound_play(punit);
  }

  deactivate_goto(true);
}

/****************************************************************************
  Request GOTO path for unit with unit_id, and dst_x, dst_y in map coords.
****************************************************************************/
export function request_goto_path(unit_id: number, dst_x: number, dst_y: number) {
  if (goto_request_map[unit_id + "," + dst_x + "," + dst_y] == null) {
    goto_request_map[unit_id + "," + dst_x + "," + dst_y] = true;

    const packet = {
      "pid": packet_web_goto_path_req, "unit_id": unit_id,
      "goal": map_pos_to_tile(dst_x, dst_y)['index']
    };
    sendRequest(JSON.stringify(packet));
    current_goto_turns = null;
    $("#unit_text_details").html("Choose unit goto");
    setTimeout(update_mouse_cursor, 700);
  } else {
    update_goto_path(goto_request_map[unit_id + "," + dst_x + "," + dst_y]);
  }
}

/****************************************************************************
...
****************************************************************************/
export function check_request_goto_path() {
  if (goto_active && current_focus.length > 0
    && prev_mouse_x == mouse_x && prev_mouse_y == mouse_y) {
    let ptile: any;
    clear_goto_tiles();
    if (renderer == RENDERER_2DCANVAS) {
      ptile = canvas_pos_to_tile(mouse_x, mouse_y);
    } else {
      ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
    }
    if (ptile != null) {
      /* Send request for goto_path to server. */
      for (let i = 0; i < current_focus.length; i++) {
        request_goto_path(current_focus[i]['id'], ptile['x'], ptile['y']);
      }
    }
  }
  prev_mouse_x = mouse_x;
  prev_mouse_y = mouse_y;
}

/****************************************************************************
  Show the GOTO path in the unit_goto_path packet.
****************************************************************************/
export function update_goto_path(goto_packet: any) {
  const punit = store.units[goto_packet['unit_id']];
  if (punit == null) return;
  const t0 = index_to_tile(punit['tile']);
  let ptile = t0;
  const goaltile = index_to_tile(goto_packet['dest']);

  if (renderer == RENDERER_2DCANVAS) {
    for (let i = 0; i < goto_packet['dir'].length; i++) {
      if (ptile == null) break;
      const dir = goto_packet['dir'][i];

      if (dir == -1) {
        /* Assume that this means refuel. */
        continue;
      }

      ptile['goto_dir'] = dir;
      ptile = mapstep(ptile, dir);
    }
  } else {
    webgl_render_goto_line(ptile, goto_packet['dir']);
  }

  current_goto_turns = goto_packet['turns'];

  goto_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']] = goto_packet;
  goto_turns_request_map[goto_packet['unit_id'] + "," + goaltile['x'] + "," + goaltile['y']]
    = current_goto_turns;

  if (current_goto_turns != undefined) {
    $("#active_unit_info").html("Turns for goto: " + current_goto_turns);
  }
  update_mouse_cursor();
}



/**************************************************************************
  Centers the mapview around the given tile..
**************************************************************************/
export function center_tile_mapcanvas(ptile: any) {
  if (renderer == RENDERER_2DCANVAS) {
    center_tile_mapcanvas_2d(ptile);
  } else {
    center_tile_mapcanvas_3d(ptile);
  }
}

/**************************************************************************
  Show tile information in a popup
**************************************************************************/
export function popit() {
  let ptile: any;

  if (renderer == RENDERER_2DCANVAS) {
    ptile = canvas_pos_to_tile(mouse_x, mouse_y);
  } else {
    ptile = webgl_canvas_pos_to_tile(mouse_x, mouse_y);
  }

  if (ptile == null) return;

  popit_req(ptile);
}

/**************************************************************************
  Request tile popup
**************************************************************************/
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
  if (current_focus.length > 0) {
    focus_unit_id = current_focus[0]['id'];
  }

  const packet = {
    "pid": packet_web_info_text_req, "visible_unit": punit_id,
    "loc": ptile['index'], "focus_unit": focus_unit_id
  };
  sendRequest(JSON.stringify(packet));
}

/**************************************************************************
  Find any city to focus on.
**************************************************************************/
export function center_on_any_city() {
  for (const city_id in store.cities) {
    const pcity = store.cities[city_id];
    center_tile_mapcanvas(city_tile(pcity));
    return;
  }
}

/**************************************************************************
  This function shows the dialog containing active units on
  the current tile.
**************************************************************************/
export function update_active_units_dialog() {
  let unit_info_html = "";
  let ptile = null;
  let punits: any[] = [];
  let width = 0;

  if (client_is_observer() || !unitpanel_active) return;

  if (current_focus.length == 1) {
    ptile = index_to_tile(current_focus[0]['tile']);
    punits.push(current_focus[0]);
    const tmpunits = tile_units(ptile);

    for (let i = 0; i < tmpunits.length; i++) {
      const kunit = tmpunits[i];
      if (kunit['id'] == current_focus[0]['id']) continue;
      punits.push(kunit);
    }
  } else if (current_focus.length > 1) {
    punits = current_focus;
  }

  for (let i = 0; i < punits.length; i++) {
    const punit = punits[i];
    const sprite = get_unit_image_sprite(punit);
    const active = (current_focus.length > 1 || current_focus[0]['id'] == punit['id']);

    unit_info_html += "<div id='unit_info_div' class='" + (active ? "current_focus_unit" : "")
      + "'><div id='unit_info_image' onclick='set_unit_focus_and_redraw(units[" + punit['id'] + "])' "
      + " style='background: transparent url("
      + sprite['image-src'] +
      ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
      + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
      + "></div></div>";
    width = sprite['width'];
  }

  if (current_focus.length == 1) {
    /* show info about the active focus unit. */
    const aunit = current_focus[0];
    const ptype = unit_type(aunit);
    unit_info_html += "<div id='active_unit_info' title='" + ptype['helptext'] + "'>";

    if (store.client.conn.playing != null && current_focus[0]['owner'] != store.client.conn.playing.playerno) {
      unit_info_html += "<b>" + store.nations[store.players[current_focus[0]['owner']]['nation']]['adjective'] + "</b> ";
    }

    unit_info_html += "<b>" + ptype['name'] + "</b>: ";
    if (get_unit_homecity_name(aunit) != null) {
      unit_info_html += " " + get_unit_homecity_name(aunit) + " ";
    }
    if (current_focus[0]['owner'] == store.client.conn.playing.playerno) {
      unit_info_html += "<span>" + get_unit_moves_left(aunit) + "</span> ";
    }
    unit_info_html += "<br><span title='Attack strength'>A:" + ptype['attack_strength']
      + "</span> <span title='Defense strength'>D:" + ptype['defense_strength']
      + "</span> <span title='Firepower'>F:" + ptype['firepower']
      + "</span> <span title='Health points'>H:"
      + aunit['hp'] + "/" + ptype['hp'] + "</span>";
    if (aunit['veteran'] > 0) {
      unit_info_html += " <span>Veteran: " + aunit['veteran'] + "</span>";
    }
    if (ptype['transport_capacity'] > 0) {
      unit_info_html += " <span>Transport: " + ptype['transport_capacity'] + "</span>";
    }

    unit_info_html += "</div>";
  } else if (current_focus.length >= 1 && store.client.conn.playing != null && current_focus[0]['owner'] != store.client.conn.playing.playerno) {
    unit_info_html += "<div id='active_unit_info'>" + current_focus.length + " foreign units  (" +
      store.nations[store.players[current_focus[0]['owner']]['nation']]['adjective']
      + ")</div> ";
  } else if (current_focus.length > 1) {
    unit_info_html += "<div id='active_unit_info'>" + current_focus.length + " units selected.</div> ";
  }

  $("#game_unit_info").html(unit_info_html);

  if (current_focus.length > 0) {
    /* reposition and resize unit dialog. */
    let newwidth = 32 + punits.length * (width + 10);
    if (newwidth < 140) newwidth = 140;
    const newheight = 75 + normal_tile_height;
    $("#game_unit_panel").parent().show();
    $("#game_unit_panel").parent().width(newwidth);
    $("#game_unit_panel").parent().height(newheight);
    $("#game_unit_panel").parent().css("left", ($(window).width() - newwidth) + "px");
    $("#game_unit_panel").parent().css("top", ($(window).height() - newheight - 30) + "px");
    $("#game_unit_panel").parent().css("background", "rgba(50,50,40,0.5)");
    if (game_unit_panel_state == "minimized") $("#game_unit_panel").dialogExtend("minimize");
  } else {
    $("#game_unit_panel").parent().hide();
    if (renderer == RENDERER_WEBGL) {
      webgl_clear_unit_focus();
    }
  }
  $("#active_unit_info").tooltip();
}

/**************************************************************************
  Sets mouse_touch_started_on_unit
**************************************************************************/
export function set_mouse_touch_started_on_unit(ptile: any) {
  if (ptile == null) return;
  const sunit = find_visible_unit(ptile);
  if (sunit != null && store.client.conn.playing != null && sunit['owner'] == store.client.conn.playing.playerno) {
    mouse_touch_started_on_unit = true;
  } else {
    mouse_touch_started_on_unit = false;
  }
}


/****************************************************************************
 This function checks if there is a visible unit on the given tile,
 and selects that visible unit, and activates goto.
****************************************************************************/
export function check_mouse_drag_unit(ptile: any) {
  if (ptile == null || !mouse_touch_started_on_unit) return;

  const sunit = find_visible_unit(ptile);

  if (sunit != null) {
    if (store.client.conn.playing != null && sunit['owner'] == store.client.conn.playing.playerno) {
      set_unit_focus(sunit);
      activate_goto();
    }
  }

  const ptile_units = tile_units(ptile);
  if (ptile_units.length > 1) {
    update_active_units_dialog();
  }
}
