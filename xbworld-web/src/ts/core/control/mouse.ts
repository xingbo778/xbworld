/**
 * Mouse and touch event handling.
 *
 * Extracted from core/control.ts — mouse_moved_cb, update_mouse_cursor,
 * set_mouse_touch_started_on_unit, check_mouse_drag_unit.
 */

import { store } from '../../data/store';
import { cityOwnerPlayerId as city_owner_player_id } from '../../data/city';
import { tileCity as tile_city } from '../../data/tile';
import { tile_units } from '../../data/unit';
import { canvas_pos_to_tile } from '../../renderer/mapviewCommon';
import { isTouchDevice as is_touch_device } from '../../utils/helpers';
import { clientState as client_state, C_S_RUNNING } from '../../client/clientState';
import { update_tech_dialog_cursor, tech_dialog_active } from '../../ui/techDialog';

declare const $: any;
declare const client: any;
declare const mapview: any;
declare const mapview_canvas: any;
declare const active_city: any;
declare const city_canvas: any;
declare const map_select_check: any;
declare const map_select_x: any;
declare const map_select_y: any;
declare const map_select_check_started: any;
declare let map_select_active: any;
declare let touch_start_x: number;
declare let touch_start_y: number;
declare const RENDERER_2DCANVAS: number;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export let mouse_x: number;
export let mouse_y: number;
export let prev_mouse_x: number;
export let prev_mouse_y: number;
export let mapview_mouse_movement: boolean = false;

let mouse_touch_started_on_unit: boolean = false;

// ---------------------------------------------------------------------------
// Imports from sibling modules (lazy to avoid cycles)
// ---------------------------------------------------------------------------
import type { UnitFocusFns } from './unitFocus';
import type { GotoFns } from './mapClick';
let _unitFocus: UnitFocusFns | null = null;
let _gotoFns: GotoFns | null = null;
export function _setMouseDeps(uf: UnitFocusFns, gf: GotoFns): void {
  _unitFocus = uf;
  _gotoFns = gf;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Called when the mouse is moved.
 */
export function mouse_moved_cb(e: MouseEvent): void {
  const mapview_slide = (window as any).mapview_slide;
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
  const goto_active = _gotoFns ? _gotoFns.isGotoActive() : false;

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
  } else if (active_city != null && city_canvas != null
    && $("#city_canvas").length) {
    mouse_x = mouse_x - $("#city_canvas").offset().left;
    mouse_y = mouse_y - $("#city_canvas").offset().top;
  }

  if (client.conn.playing == null) return;

  if (C_S_RUNNING == client_state()) {
    update_mouse_cursor();
  }

  if (map_select_check && Math.abs(mouse_x - map_select_x) > 45
    && Math.abs(mouse_y - map_select_y) > 45
    && (new Date().getTime() - map_select_check_started) > 200) {
    map_select_active = true;
  }
}

/**
 * Update the mouse cursor style based on game state.
 */
export function update_mouse_cursor(): void {
  if (tech_dialog_active && !is_touch_device()) {
    update_tech_dialog_cursor();
    return;
  }

  const ptile = canvas_pos_to_tile(mouse_x, mouse_y);

  if (ptile == null) return;

  const punit = _unitFocus ? _unitFocus.find_visible_unit(ptile) : null;
  const pcity = tile_city(ptile);
  const goto_active = _gotoFns ? _gotoFns.isGotoActive() : false;
  const current_goto_turns = _gotoFns ? _gotoFns.getCurrentGotoTurns() : null;

  if (mapview_mouse_movement && !goto_active) {
    $("#canvas_div").css("cursor", "move");
  } else if (goto_active && current_goto_turns != null) {
    $("#canvas_div").css("cursor", "crosshair");
  } else if (goto_active && current_goto_turns == null) {
    $("#canvas_div").css("cursor", "not-allowed");
  } else if (pcity != null && client.conn.playing != null && city_owner_player_id(pcity) == client.conn.playing.playerno) {
    $("#canvas_div").css("cursor", "pointer");
  } else if (punit != null && client.conn.playing != null && punit['owner'] == client.conn.playing.playerno) {
    $("#canvas_div").css("cursor", "pointer");
  } else {
    $("#canvas_div").css("cursor", "default");
  }
}

/**
 * Sets mouse_touch_started_on_unit.
 */
export function set_mouse_touch_started_on_unit(ptile: any): void {
  if (ptile == null) return;
  const sunit = _unitFocus ? _unitFocus.find_visible_unit(ptile) : null;
  if (sunit != null && store.client.conn.playing != null && sunit['owner'] == store.client.conn.playing.playerno) {
    mouse_touch_started_on_unit = true;
  } else {
    mouse_touch_started_on_unit = false;
  }
}

/**
 * Check if there is a visible unit on the given tile,
 * select that visible unit, and activate goto.
 */
export function check_mouse_drag_unit(ptile: any): void {
  if (ptile == null || !mouse_touch_started_on_unit) return;

  const sunit = _unitFocus ? _unitFocus.find_visible_unit(ptile) : null;

  if (sunit != null) {
    if (store.client.conn.playing != null && sunit['owner'] == store.client.conn.playing.playerno) {
      if (_unitFocus) _unitFocus.set_unit_focus(sunit);
      if (_gotoFns) _gotoFns.activate_goto();
    }
  }

  const ptile_units = tile_units(ptile);
  if (ptile_units.length > 1) {
    if (_unitFocus) _unitFocus.update_active_units_dialog();
  }
}
