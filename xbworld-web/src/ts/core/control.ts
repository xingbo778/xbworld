/**
 * Control barrel — re-exports all sub-modules for backward compatibility.
 *
 * This file was formerly 3,384 lines. It has been split into:
 *   - control/controlState.ts  — shared mutable state
 *   - control/actionSelection.ts — action selection / server queries
 *   - control/chat.ts           — chat message handling
 *   - control/keyboard.ts       — keyboard event handling
 *   - control/mapClick.ts       — map click, goto, tile popup
 *   - control/mouse.ts          — mouse / touch events
 *   - control/unitCommands.ts   — key_unit_* and request_* functions
 *   - control/unitFocus.ts      — unit focus management
 *
 * Only control_init() remains here as it wires up jQuery event handlers
 * that reference functions from multiple sub-modules.
 */

// Re-export everything from sub-modules so that existing imports
// from '../core/control' continue to work unchanged.
export * from './control/controlState';
export * from './control/actionSelection';
export * from './control/chat';
export * from './control/keyboard';
export * from './control/mapClick';
export * from './control/mouse';
export * from './control/unitCommands';
export * from './control/unitFocus';

// ---------------------------------------------------------------------------
// Imports needed only for control_init()
// ---------------------------------------------------------------------------
import { network_stop } from '../net/connection';
import { isTouchDevice as is_touch_device } from '../utils/helpers';
import { update_city_screen } from '../ui/cityDialog';
import { update_tech_screen } from '../ui/techDialog';
import { init_civ_dialog } from '../ui/governmentDialog';
import { init_options_dialog } from '../ui/options';
import { show_help } from '../ui/helpdata';
import { show_load_game_dialog } from '../utils/savegame';
import { pregame_start_game, pregame_settings, pick_nation } from '../core/pregame';
import { show_intelligence_report_dialog } from '../ui/intelDialog';
import {
  updateNationScreen as update_nation_screen,
  showSendPrivateMessageDialog as show_send_private_message_dialog,
  nationMeetClicked as nation_meet_clicked,
  centerOnPlayer as center_on_player,
  cancelTreatyClicked as cancel_treaty_clicked,
  withdrawVisionClicked as withdraw_vision_clicked,
  takePlayerClicked as take_player_clicked,
  toggleAiClicked as toggle_ai_clicked,
  handleNationTableSelect as handle_nation_table_select,
} from '../data/nation';
import { overview_clicked } from '../core/overview';
import { mapview_window_resized } from '../renderer/mapview';
import { orientation_changed } from '../utils/mobile';
import { tech_mapview_mouse_click } from '../ui/techDialog';
import { mapctrl_init_2d } from '../renderer/mapctrl';

// Sub-module imports used in control_init
import { setKeyboardInput, setResizeEnabled, setUrgentFocusQueue } from './control/controlState';
import { global_keyboard_listener, handle_context_menu_callback } from './control/keyboard';
import { chat_context_change } from './control/chat';
import { check_text_input } from './control/chat';
import { send_end_turn } from './control/mapClick';
import { update_unit_order_commands } from './control/unitFocus';
import * as S from './control/controlState';

declare const $: any;
declare const RENDERER_2DCANVAS: number;

// ---------------------------------------------------------------------------
// Helper functions used only in control_init
// ---------------------------------------------------------------------------
function set_default_mapview_active(): void {
  setKeyboardInput(true);
}

function set_default_mapview_inactive(): void {
  setKeyboardInput(true);
}

// ---------------------------------------------------------------------------
// control_init — the main initialization entry point
// ---------------------------------------------------------------------------
export function control_init(): void {
  setUrgentFocusQueue([]);

  mapctrl_init_2d();

  $(document).keydown(global_keyboard_listener);
  $(window).resize(mapview_window_resized);
  $(window).bind('orientationchange resize', orientation_changed);

  $("#turn_done_button").click(send_end_turn);
  if (!is_touch_device()) $("#turn_done_button").tooltip();

  $("#freeciv_logo").click(function(event: Event) {
    window.open('/', '_new');
  });


  $("#game_text_input").keydown(function(event: any) {
    return check_text_input(event, $("#game_text_input"));
  });
  $("#game_text_input").focus(function(event: any) {
    setKeyboardInput(false);
    setResizeEnabled(false);
  });

  $("#game_text_input").blur(function(event: any) {
    setKeyboardInput(true);
    setResizeEnabled(true);
  });

  $("#chat_direction").click(function(event: any) {
    chat_context_change();
  });

  $("#pregame_text_input").keydown(function(event: any) {
    return check_text_input(event, $("#pregame_text_input"));
  });

  $("#pregame_text_input").blur(function(this: HTMLInputElement, event: any) {
    setKeyboardInput(true);
    if (this.value == '') {
      this.value = '>';
    }
  });

  $("#pregame_text_input").focus(function(this: HTMLInputElement, event: any) {
    setKeyboardInput(false);
    if (this.value == '>') this.value = '';
  });

  $("#start_game_button").click(function(event: any) {
    pregame_start_game();
  });

  $("#load_game_button").click(function(event: any) {
    show_load_game_dialog();
  });

  $("#pick_nation_button").click(function(event: any) {
    pick_nation(null as any);
  });

  $("#pregame_settings_button").click(function(event: any) {
    pregame_settings();
  });

  $("#tech_canvas").click(function(event: any) {
    tech_mapview_mouse_click(event);
  });

  /* disable text-selection, as this gives wrong mouse cursor
   * during drag to goto units. */
  document.onselectstart = function() { return false; };

  /* disable right clicks. */
  window.addEventListener('contextmenu', function(e: MouseEvent) {
    if (e.target != null && ((e.target as HTMLElement).id == 'game_text_input' || (e.target as HTMLElement).id == 'overview_map' || ((e.target as HTMLElement).parentElement != null && (e.target as HTMLElement).parentElement!.id == 'game_message_area'))) return;
    if (!S.allow_right_click) e.preventDefault();
  }, false);

  const context_options: any = {
    selector: (RENDERER_2DCANVAS) ? '#canvas' : '#canvas_div',
    zIndex: 5000,
    autoHide: true,
    callback: function(key: string, options: any) {
      handle_context_menu_callback(key);
    },
    build: function($trigger: any, e: Event) {
      if (!S.context_menu_active) {
        S.setContextMenuActive(true);
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
      let new_top = S.mouse_y + $("#canvas_div").offset().top;
      if (RENDERER_2DCANVAS) new_top = S.mouse_y + $("#canvas").offset().top;
      opt.$menu.css({ top: new_top, left: S.mouse_x });
    };
  }

  $.contextMenu(context_options);

  $(window).on('unload', function() {
    network_stop();
  });

  /* Click callbacks for main tabs. */
  $("#map_tab").click(function(event: any) {
    setTimeout(set_default_mapview_active, 5);
  });


  $("#civ_tab").click(function(event: any) {
    set_default_mapview_inactive();
    init_civ_dialog();
  });

  $("#tech_tab").click(function(event: any) {
    set_default_mapview_inactive();
    update_tech_screen();
  });

  $("#players_tab").click(function(event: any) {
    set_default_mapview_inactive();
    update_nation_screen();
  });

  $("#cities_tab").click(function(event: any) {
    set_default_mapview_inactive();
    update_city_screen();
  });

  $("#opt_tab").click(function(event: any) {
    $("#tabs-hel").hide();
    init_options_dialog();
    set_default_mapview_inactive();
  });

  $("#chat_tab").click(function(event: any) {
    set_default_mapview_inactive();
    $("#tabs-chat").show();

  });


  $("#hel_tab").click(function(event: any) {
    set_default_mapview_inactive();
    show_help();
  });

  if (!is_touch_device()) {
    $("#game_unit_orders_default").tooltip();
  }

  $("#overview_map").click(function(this: any, e: any) {
    const x = e.pageX - $(this).offset().left;
    const y = e.pageY - $(this).offset().top;
    overview_clicked(x, y);
  });

  $("#send_message_button").click(function(e: any) {
    show_send_private_message_dialog();
  });

  $("#intelligence_report_button").click(function(e: any) {
    show_intelligence_report_dialog();
  });

  $('#meet_player_button').click(nation_meet_clicked);
  $('#view_player_button').click(center_on_player);
  $('#cancel_treaty_button').click(cancel_treaty_clicked);
  $('#withdraw_vision_button').click(withdraw_vision_clicked);
  $('#take_player_button').click(take_player_clicked);
  $('#toggle_ai_button').click(toggle_ai_clicked);
  $('#nations_list').on('click', 'tbody tr', handle_nation_table_select);

  /* prevents keyboard input from changing tabs. */
  $('#tabs>ul>li').off('keydown');
  $('#tabs>div').off('keydown');
}
