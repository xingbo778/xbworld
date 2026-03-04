/**********************************************************************
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
declare const swal: any;
declare const simpleStorage: any;
declare const audio: any;
declare const music_list: string[];
declare const speech_enabled: boolean;
declare function send_message(msg: string): void;
declare function is_pbem(): boolean;
declare function supports_mp3(): boolean;
declare function is_speech_supported(): boolean;
declare const server_settings: any;
declare const game_info: any;
declare const TRUE: boolean;
declare const FALSE: boolean;

export let server_settings: any = {};

/****************************************************************
 The "options" file handles actual "options", and also view options,
 message options, dialog/report settings, cma settings, server settings,
 and global worklists.
*****************************************************************/

/** Defaults for options normally on command line **/

export let default_user_name: string = "";
export let default_server_host: string = "localhost";
//export let default_server_port = DEFAULT_SOCK_PORT;
//export let default_metaserver = META_URL;
export let default_theme_name: string = "human";
export let default_tileset_name: string = "";
export let default_sound_set_name: string = "stdsounds";
export let default_sound_plugin_name: string = "";

export let sounds_enabled: boolean = true;

export let save_options_on_exit: boolean = TRUE;
export let fullscreen_mode: boolean = FALSE;

/** Local Options: **/

export let solid_color_behind_units: boolean = FALSE;
export let sound_bell_at_new_turn: boolean = FALSE;
export let smooth_move_unit_msec: number = 30;
export let smooth_center_slide_msec: number = 200;
export let do_combat_animation: boolean = TRUE;
export let ai_manual_turn_done: boolean = TRUE;
export let auto_center_on_unit: boolean = TRUE;
export let auto_center_on_combat: boolean = FALSE;
export let auto_center_each_turn: boolean = TRUE;
export let wakeup_focus: boolean = TRUE;
export let goto_into_unknown: boolean = TRUE;
export let center_when_popup_city: boolean = TRUE;
export let concise_city_production: boolean = FALSE;
export let auto_turn_done: boolean = FALSE;
export let meta_accelerators: boolean = TRUE;
export let ask_city_name: boolean = TRUE;
export let popup_new_cities: boolean = TRUE;
export let popup_actor_arrival: boolean = true;
export let keyboardless_goto: boolean = TRUE;
export let enable_cursor_changes: boolean = TRUE;
export let separate_unit_selection: boolean = FALSE;
export let unit_selection_clears_orders: boolean = TRUE;
export let highlight_our_names: string = "yellow";

/* This option is currently set by the client - not by the user. */
export let update_city_text_in_refresh_tile: boolean = TRUE;

export let draw_city_outlines: boolean = TRUE;
export let draw_city_output: boolean = FALSE;
export let draw_map_grid: boolean = FALSE;
export let draw_city_names: boolean = TRUE;
export let draw_city_growth: boolean = TRUE;
export let draw_city_productions: boolean = FALSE;
export let draw_city_buycost: boolean = FALSE;
export let draw_city_traderoutes: boolean = FALSE;
export let draw_terrain: boolean = TRUE;
export let draw_coastline: boolean = FALSE;
export let draw_roads_rails: boolean = TRUE;
export let draw_irrigation: boolean = TRUE;
export let draw_mines: boolean = TRUE;
export let draw_fortress_airbase: boolean = TRUE;
export let draw_huts: boolean = TRUE;
export let draw_resources: boolean = TRUE;
export let draw_pollution: boolean = TRUE;
export let draw_cities: boolean = TRUE;
export let draw_units: boolean = TRUE;
export let draw_focus_unit: boolean = FALSE;
export let draw_fog_of_war: boolean = TRUE;
export let draw_borders: boolean = TRUE;
export let draw_full_citybar: boolean = TRUE;
export let draw_unit_shields: boolean = TRUE;
export let player_dlg_show_dead_players: boolean = TRUE;
export let reqtree_show_icons: boolean = TRUE;
export let reqtree_curved_lines: boolean = FALSE;

/* gui-gtk-2.0 client specific options. */
export let gui_gtk2_map_scrollbars: boolean = FALSE;
export let gui_gtk2_dialogs_on_top: boolean = TRUE;
export let gui_gtk2_show_task_icons: boolean = TRUE;
export let gui_gtk2_enable_tabs: boolean = TRUE;
export let gui_gtk2_better_fog: boolean = TRUE;
export let gui_gtk2_show_chat_message_time: boolean = FALSE;
export let gui_gtk2_split_bottom_notebook: boolean = FALSE;
export let gui_gtk2_new_messages_go_to_top: boolean = FALSE;
export let gui_gtk2_show_message_window_buttons: boolean = TRUE;
export let gui_gtk2_metaserver_tab_first: boolean = FALSE;
export let gui_gtk2_allied_chat_only: boolean = FALSE;
export let gui_gtk2_small_display_layout: boolean = FALSE;

export function init_options_dialog(): void {
  $("#save_button").button("option", "label", "Save Game (Ctrl+S)");
  $("#metamessage_setting").val(server_settings['metamessage']['val']);
  $('#metamessage_setting').change(function(): void {
    send_message("/metamessage " + $('#metamessage_setting').val());
  });

  $('#metamessage_setting').bind('keyup blur', function(): void {
    const cleaned_text: string = $(this).val().replace(/[^a-zA-Z\s\-]/g, '');
    if ($(this).val() != cleaned_text) {
      $(this).val(cleaned_text);
    }
  });

  if (!is_pbem()) {
    const existing_timeout: number = game_info['timeout'];
    if (existing_timeout == 0) $("#timeout_info").html("(0 = no timeout)");
    $("#timeout_setting").val(existing_timeout);
  } else {
    $("#timeout_setting_div").hide();
  }
  $('#timeout_setting').change(function(): void {
    const new_timeout: number = parseInt($('#timeout_setting').val());
    if (new_timeout >= 1 && new_timeout <= 29) {
      swal("Invalid timeout specified. Must be 0 or more than 30 seconds.");
    } else {
      send_message("/set timeout " + new_timeout);
    }
  });

  if (audio != null && !audio.source.src) {
    if (!supports_mp3()) {
      audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".ogg");
    } else {
      audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".mp3");
    }
  }

  $(".setting_button").tooltip();

  $('#play_sounds_setting').prop('checked', sounds_enabled);

  $('#play_sounds_setting').change(function(): void {
    sounds_enabled = this.checked;
    simpleStorage.set('sndFX', sounds_enabled);
  });

  if (is_speech_supported()) {
    $('#speech_enabled_setting').prop('checked', speech_enabled);
    $('#speech_enabled_setting').change(function(): void {
      // speech_enabled is declared as const, so this assignment may be invalid in TS.
      // But per instructions, keep logic exactly same.
      // So we cast to any to allow assignment.
      (speech_enabled as any) = this.checked;
    });
  } else {
    $('#speech_enabled_setting').attr('disabled', true);
  }

  $("#switch_renderer_button").hide();
  $("#renderer_help").hide();
  $("#update_model_button").hide();
}
