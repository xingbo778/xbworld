/***********************************************************************
    Freeciv-web - the web version of Freeciv. https://www.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

declare const $: any;
declare const client: any;
declare const map: any;

import { canvas_pos_to_tile, mapview } from './mapviewCommon';
import { mapPosToTile } from '../data/map';
const map_pos_to_tile = mapPosToTile;
import { tile_units } from '../data/unit';
import { find_visible_unit, set_unit_focus, action_selection_next_in_focus, update_active_units_dialog } from '../core/control';
import { current_focus, goto_active, goto_request_map, request_goto_path, context_menu_active, keyboard_input as keyboard_input_ref, mapview_mouse_movement as mapview_mouse_movement_ref, SELECT_POPUP, popit, do_map_click, update_mouse_cursor, set_mouse_touch_started_on_unit, check_mouse_drag_unit } from '../core/control';
import { player_by_full_username, get_player_connection_status } from '../data/player';
import { clientIsObserver as client_is_observer, canClientChangeView as can_client_change_view } from '../client/clientState';
import { isTouchDevice as is_touch_device, isRightMouseSelectionSupported as is_right_mouse_selection_supported } from '../utils/helpers';
import { showDialogMessage as show_dialog_message } from '../client/civClient';
import { do_city_map_click } from '../ui/cityDialog';
import { IDENTITY_NUMBER_ZERO } from '../core/constants';
import { enable_mapview_slide } from './mapview';
import { center_tile_mapcanvas } from '../core/control';

export let mouse_x: number;
export let mouse_y: number;
export let touch_start_x: number;
export let touch_start_y: number;

export let map_select_setting_enabled: boolean = true;
export let map_select_check: boolean = false;
export let map_select_check_started: number = 0;
export let map_select_active: boolean = false;
export let map_select_x: number;
export let map_select_y: number;
export let mouse_touch_started_on_unit: boolean = false;

/****************************************************************************
  Init 2D mapctrl
****************************************************************************/
export function mapctrl_init_2d(): void {
  // Register keyboard and mouse listener using JQuery.
  $("#canvas").mouseup(mapview_mouse_click);
  $("#canvas").mousedown(mapview_mouse_down);
  $(window).mousemove(mouse_moved_cb);

  if (is_touch_device()) {
    $('#canvas').bind('touchstart', mapview_touch_start);
    $('#canvas').bind('touchend', mapview_touch_end);
    $('#canvas').bind('touchmove', mapview_touch_move);
  }
}

/****************************************************************************
  Triggered when the mouse button is clicked UP on the mapview canvas.
****************************************************************************/
export function mapview_mouse_click(e: any): void {
  let rightclick = false;
  let middleclick = false;

  if (!e) e = window.event;
  if (e.which) {
    rightclick = (e.which == 3);
    middleclick = (e.which == 2);
  } else if (e.button) {
    rightclick = (e.button == 2);
    middleclick = (e.button == 1 || e.button == 4);
  }
  if (rightclick) {
    /* right click to recenter. */
    if (!map_select_active || !map_select_setting_enabled) {
      (window as any).context_menu_active = true;
      recenter_button_pressed(mouse_x, mouse_y);
    } else {
      (window as any).context_menu_active = false;
      map_select_units(mouse_x, mouse_y);
    }
    map_select_active = false;
    map_select_check = false;

  } else if (!middleclick) {
    /* Left mouse button*/
    action_button_pressed(mouse_x, mouse_y, SELECT_POPUP);
    (window as any).mapview_mouse_movement = false;
    update_mouse_cursor();
  }
  (window as any).keyboard_input = true;
}

/****************************************************************************
  Triggered when the mouse button is clicked DOWN on the mapview canvas.
****************************************************************************/
export function mapview_mouse_down(e: any): boolean | void {
  let rightclick = false;
  let middleclick = false;

  if (!e) e = window.event;
  if (e.which) {
    rightclick = (e.which == 3);
    middleclick = (e.which == 2);
  } else if (e.button) {
    rightclick = (e.button == 2);
    middleclick = (e.button == 1 || e.button == 4);
  }

  if (!rightclick && !middleclick) {
    /* Left mouse button is down */
    if (goto_active) return;
    set_mouse_touch_started_on_unit(canvas_pos_to_tile(mouse_x, mouse_y));
    check_mouse_drag_unit(canvas_pos_to_tile(mouse_x, mouse_y));
    if (!mouse_touch_started_on_unit) mapview_mouse_movement = true;
    touch_start_x = mouse_x;
    touch_start_y = mouse_y;

  } else if (middleclick || e['altKey']) {
    popit();
    return false;
  } else if (rightclick && !map_select_active && is_right_mouse_selection_supported()) {
    map_select_check = true;
    map_select_x = mouse_x;
    map_select_y = mouse_y;
    map_select_check_started = new Date().getTime();

    /* The context menu blocks the right click mouse up event on some
     * browsers. */
    (window as any).context_menu_active = false;
  }
}

/****************************************************************************
  This function is triggered when beginning a touch event on a touch device,
  eg. finger down on screen.
****************************************************************************/
export function mapview_touch_start(e: any): void {
  e.preventDefault();

  touch_start_x = e.originalEvent.touches[0].pageX - $('#canvas').position().left;
  touch_start_y = e.originalEvent.touches[0].pageY - $('#canvas').position().top;
  const ptile = canvas_pos_to_tile(touch_start_x, touch_start_y);
  set_mouse_touch_started_on_unit(ptile);
}

/****************************************************************************
  This function is triggered when ending a touch event on a touch device,
  eg finger up from screen.
****************************************************************************/
export function mapview_touch_end(e: any): void {
  action_button_pressed(touch_start_x, touch_start_y, SELECT_POPUP);
}

/****************************************************************************
  This function is triggered on a touch move event on a touch device.
****************************************************************************/
export function mapview_touch_move(e: any): void {
  mouse_x = e.originalEvent.touches[0].pageX - $('#canvas').position().left;
  mouse_y = e.originalEvent.touches[0].pageY - $('#canvas').position().top;

  const diff_x = (touch_start_x - mouse_x) * 2;
  const diff_y = (touch_start_y - mouse_y) * 2;

  touch_start_x = mouse_x;
  touch_start_y = mouse_y;

  if (!goto_active) {
    check_mouse_drag_unit(canvas_pos_to_tile(mouse_x, mouse_y));

    mapview['gui_x0'] += diff_x;
    mapview['gui_y0'] += diff_y;
  }

  if (client.conn.playing == null) return;

  /* Request preview goto path */
  // goto_preview_active is only used locally, just set a local flag
  let _goto_preview_active = true;
  if (goto_active && current_focus.length > 0) {
    const ptile = canvas_pos_to_tile(mouse_x, mouse_y);
    if (ptile != null) {
      for (let i = 0; i < current_focus.length; i++) {
        if (i >= 20) return;  // max 20 units goto a time.
        if (goto_request_map[current_focus[i]['id'] + "," + ptile['x'] + "," + ptile['y']] == null) {
          request_goto_path(current_focus[i]['id'], ptile['x'], ptile['y']);
        }
      }
    }
  }
}

/****************************************************************************
  This function is triggered when the mouse is clicked on the city canvas.
****************************************************************************/
export function city_mapview_mouse_click(e: any): void {
  let rightclick: boolean;
  if (!e) e = window.event;
  if (e.which) {
    rightclick = (e.which == 3);
  } else if (e.button) {
    rightclick = (e.button == 2);
  }

  if (!rightclick) {
    city_action_button_pressed(mouse_x, mouse_y);
  }
}

/**************************************************************************
  Do some appropriate action when the "main" mouse button (usually
  left-click) is pressed. For more sophisticated user control use (or
  write) a different xxx_button_pressed function.
**************************************************************************/
export function action_button_pressed(canvas_x: number, canvas_y: number, qtype: any): void {
  const ptile = canvas_pos_to_tile(canvas_x, canvas_y);

  if (can_client_change_view() && ptile != null) {
    /* FIXME: Some actions here will need to check can_client_issue_orders.
     * But all we can check is the lowest common requirement. */
    do_map_click(ptile, qtype, true);
  }
}

/**************************************************************************
  Do some appropriate action when the "main" mouse button (usually
  left-click) is pressed.  For more sophisticated user control use (or
  write) a different xxx_button_pressed function.
**************************************************************************/
export function city_action_button_pressed(canvas_x: number, canvas_y: number): void {
  const ptile = canvas_pos_to_tile(canvas_x, canvas_y);

  if (can_client_change_view() && ptile != null) {
    /* FIXME: Some actions here will need to check can_client_issue_orders.
     * But all we can check is the lowest common requirement. */
    do_city_map_click(ptile);
  }
}

/**************************************************************************
  This will select and set focus to all the units which are in the 
  selected rectangle on the map when the mouse is selected using the right
  mouse button. 
  [canvas_x, canvas_y, map_select_x, map_select_y].
**************************************************************************/
export function map_select_units(canvas_x: number, canvas_y: number): void {
  const selected_tiles: { [key: string]: any } = {};
  const selected_units: any[] = [];
  if (client_is_observer()) return;

  const start_x = (map_select_x < canvas_x) ? map_select_x : canvas_x;
  const start_y = (map_select_y < canvas_y) ? map_select_y : canvas_y;
  const end_x = (map_select_x < canvas_x) ? canvas_x : map_select_x;
  const end_y = (map_select_y < canvas_y) ? canvas_y : map_select_y;

  for (let x = start_x; x < end_x; x += 15) {
    for (let y = start_y; y < end_y; y += 15) {
      const ptile = canvas_pos_to_tile(x, y);
      if (ptile != null) {
        selected_tiles[ptile['tile']] = ptile;
      }
    }
  }

  for (const tile_id in selected_tiles) {
    const ptile = selected_tiles[tile_id];
    const cunits = tile_units(ptile);
    if (cunits == null) continue;
    for (let i = 0; i < cunits.length; i++) {
      const aunit = cunits[i];
      if (aunit['owner'] == client.conn.playing.playerno) {
        selected_units.push(aunit);
      }
    }
  }

  (window as any).current_focus = selected_units;
  action_selection_next_in_focus(IDENTITY_NUMBER_ZERO);
  update_active_units_dialog();
}

/**************************************************************************
  Recenter the map on the canvas location, on user request. Usually this
  is done with a right-click.
**************************************************************************/
export function recenter_button_pressed(canvas_x: number, canvas_y: number): void {
  const map_scroll_border = 8;
  const big_map_size = 24;
  let ptile = canvas_pos_to_tile(canvas_x, canvas_y);
  const orig_tile = ptile;

  /* Prevent the user from scrolling outside the map. */
  if (ptile != null && ptile['y'] > (map['ysize'] - map_scroll_border)
      && map['xsize'] > big_map_size && map['ysize'] > big_map_size) {
    ptile = map_pos_to_tile(ptile['x'], map['ysize'] - map_scroll_border);
  }
  if (ptile != null && ptile['y'] < map_scroll_border
      && map['xsize'] > big_map_size && map['ysize'] > big_map_size) {
    ptile = map_pos_to_tile(ptile['x'], map_scroll_border);
  }

  if (can_client_change_view() && ptile != null && orig_tile != null) {
    const sunit = find_visible_unit(orig_tile);
    if (!client_is_observer() && sunit != null
        && sunit['owner'] == client.conn.playing.playerno) {
      /* the user right-clicked on own unit, show context menu instead of recenter. */
      if (current_focus.length <= 1) set_unit_focus(sunit);
      $("#canvas").contextMenu(true);
      $("#canvas").contextmenu();
    } else {
      $("#canvas").contextMenu(false);
      /* FIXME: Some actions here will need to check can_client_issue_orders.
       * But all we can check is the lowest common requirement. */
      enable_mapview_slide(ptile);
      center_tile_mapcanvas(ptile);
    }
  }
}

/**************************************************************************
  Received tile info text.
**************************************************************************/
export function handle_web_info_text_message(packet: any): void {
  let message = decodeURIComponent(packet['message']);
  const lines = message.split('\n');

  /* When a line starts with the key, the regex value is used to break it
   * in four elements:
   * - text before the player's name
   * - player's name
   * - text after the player's name and before the status insertion point
   * - text after the status insertion point
  **/
  const matcher: { [key: string]: RegExp } = {
    'Terri': /^(Territory of )([^(]*)(\s+\([^,]*)(.*)/,
    'City:': /^(City:[^|]*\|\s+)([^(]*)(\s+\([^,]*)(.*)/,
    'Unit:': /^(Unit:[^|]*\|\s+)([^(]*)(\s+\([^,]*)(.*)/
  };

  for (let i = 0; i < lines.length; i++) {
    const re = matcher[lines[i].substr(0, 5)];
    if (re !== undefined) {
      let pplayer: any = null;
      const split_txt = lines[i].match(re);
      if (split_txt != null && split_txt.length > 4) {
        pplayer = player_by_full_username(split_txt[2]);
      }
      if (pplayer != null &&
          (client.conn.playing == null || pplayer != client.conn.playing)) {
        lines[i] = split_txt[1]
                 + "<a href='#' onclick='javascript:nation_table_select_player("
                 + pplayer['playerno']
                 + ");' style='color: black;'>"
                 + split_txt[2]
                 + "</a>"
                 + split_txt[3]
                 + ", "
                 + get_player_connection_status(pplayer)
                 + split_txt[4];
      }
    }
  }
  message = lines.join("<br>\n");

  show_dialog_message("Tile Information", message);
}

// nation_table_select_player is called via onclick in HTML strings, so it's on window
declare function nation_table_select_player(playerno: number): void;
