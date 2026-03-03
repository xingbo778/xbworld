/***********************************************************************
    XBWorld - AI-powered civilization strategy game. https://github.com/xbworld/
    Copyright (C) 2009-2015  The XBWorld project

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

/* ======================================================================
 * Phase 6 migration note:
 *
 * The following functions have been migrated to TypeScript and are now
 * provided by the TS bundle (ts-bundle/main.js):
 *
 *   clientCore.ts:
 *     is_longturn, is_pbem, is_hotseat, is_server, set_phase_start,
 *     request_observe_game, send_surrender_game, surrender_game,
 *     get_invalid_username_reason, validate_username,
 *     is_username_valid_show, show_fullscreen_window, motd_init
 *
 *   clientTimers.ts:
 *     update_timeout, update_turn_change_timer
 *
 *   clientDebug.ts:
 *     show_debug_info
 *
 * Remaining in this file (heavy jQuery UI / init dependencies):
 *     civclient_init, init_common_intro_dialog,
 *     close_dialog_message, closing_dialog_message, show_dialog_message,
 *     show_auth_dialog, switch_renderer
 *
 * Global variable declarations remain here because they must be
 * available before any script runs.
 * ====================================================================== */


var client = {};
client.conn = {};

var client_frozen = false;
var phase_start_time = 0;

var debug_active = false;
var autostart = false;

var username = null;

var fc_seedrandom = null;

// singleplayer, multiplayer, longturn, pbem
var game_type = "";

var music_list = [ "battle-epic",
                   "andrewbeck-ancient",
                   "into_the_shadows",
                   "andrewbeck-stings",
                   "trap_a_space_odyssey_battle_for_the_planet",
                   "elvish-theme",
                   "cullambruce-lockhart-dawning_fanfare"];
var audio = null;
var audio_enabled = false;

var last_turn_change_time = 0;
var turn_change_elapsed = 0;
var seconds_to_phasedone = 0;
var seconds_to_phasedone_sync = 0;
var dialog_close_trigger = "";
var dialog_message_close_task;

var RENDERER_2DCANVAS = 1;      // default HTML5 Canvas
var RENDERER_WEBGL = 2;         // WebGL + Three.js
var renderer = RENDERER_2DCANVAS;  // This variable specifies which map renderer to use, 2d Canvas or WebGL.


/**************************************************************************
 Main starting point for XBWorld
**************************************************************************/
$(document).ready(function() {
  civclient_init();
});

/**************************************************************************
 This function is called on page load.
**************************************************************************/
function civclient_init()
{
  $.blockUI.defaults['css']['backgroundColor'] = "#222";
  $.blockUI.defaults['css']['color'] = "#fff";
  $.blockUI.defaults['theme'] = true;

  var action = $.getUrlVar('action');
  game_type = $.getUrlVar('type');
  if (game_type == null) {
    // TODO: When no type param is provided (e.g. direct URL access),
    // we default to singleplayer. In the future, consider showing a
    // proper lobby/landing page instead of going straight into a game.
    if (action == 'pbem') {
      game_type = 'pbem';
    } else {
      game_type = 'singleplayer';
    }
  }

  if (action == "observe") {
    observing = true;
    $("#civ_tab").remove();
    $("#cities_tab").remove();
    $("#pregame_buttons").remove();
    $("#game_unit_orders_default").remove();
    $("#civ_dialog").remove();
  }

  // Initialize a seeded random number generator
  fc_seedrandom = new Math.seedrandom('xbworld');

  if (window.requestAnimationFrame == null) {
    swal("Please upgrade your browser.");
    return;
  }

  if (is_longturn() && observing) {
    swal("LongTurn games can't be observed.");
    return;
  }

  init_mapview();

  game_init();
  $('#tabs').tabs({ heightStyle: "fill" });
  control_init();
  init_replay();

  timeoutTimerId = setInterval(update_timeout, 1000);

  update_game_status_panel();
  statusTimerId = setInterval(update_game_status_panel, 6000);

  if (overviewTimerId == -1) {
    if (renderer == RENDERER_WEBGL) {
      OVERVIEW_REFRESH = 12000;
    } else {
      OVERVIEW_REFRESH = 6000;
    }
    overviewTimerId = setInterval(redraw_overview, OVERVIEW_REFRESH);
  }

  motd_init();

  /*
   * Interner Explorer doesn't support Array.indexOf
   * http://soledadpenades.com/2007/05/17/arrayindexof-in-internet-explorer/
   */
  if(!Array.indexOf){
	    Array.prototype.indexOf = function(obj){
	        for(var i=0; i<this.length; i++){
	            if(this[i]==obj){
	                return i;
	            }
	        }
	        return -1;
	    };
  }


  $('#tabs').css("height", $(window).height());
  $("#tabs-map").height("auto");
  $("#tabs-civ").height("auto");
  $("#tabs-tec").height("auto");
  $("#tabs-nat").height("auto");
  $("#tabs-cities").height("auto");
  $("#tabs-opt").height("auto");
  $("#tabs-hel").height("auto");

  $(".button").button();

  sounds_enabled = simpleStorage.get('sndFX');
  if (sounds_enabled == null) {
    // Default to true, except when known to be problematic.
    if (platform.name == 'Safari') {
      sounds_enabled = false;
    } else {
      sounds_enabled = true;
    }
  }

  /* Initialze audio.js music player */
  audiojs.events.ready(function() {
    var as = audiojs.createAll({
          trackEnded: function() {
            if (!supports_mp3()) {
              audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".ogg");
            } else {
              audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".mp3");
            }
            audio.play();
          }
        });
    audio = as[0];

 });

 init_common_intro_dialog();
 setup_window_size();



}

/**************************************************************************
 Shows a intro dialog depending on game type.
**************************************************************************/
function init_common_intro_dialog() {
  if (observing) {
    show_intro_dialog("Welcome to XBWorld",
      "You have joined the game as an observer. Please enter your name:");
    $("#turn_done_button").button( "option", "disabled", true);

  } else if ($.getUrlVar('action') == "pbem") {
    show_pbem_dialog();

  } else if ($.getUrlVar('action') == "hotseat") {
    show_hotseat_dialog();

  } else if (is_small_screen()) {
    if (is_longturn()) {
        setTimeout(show_longturn_intro_dialog, 300);
    } else {
      show_intro_dialog("Welcome to XBWorld",
        "You are about to join the game. Please enter your name:");
    }
  } else if ($.getUrlVar('action') == "earthload") {
    show_intro_dialog("Welcome to XBWorld",
      "You can now play XBWorld on the earth map you have chosen. " +
      "Please enter your name: ");

  } else if ($.getUrlVar('action') == "load") {
    show_intro_dialog("Welcome to XBWorld",
      "You are about to join this game server, where you can " +
      "load a savegame, tutorial, custom map generated from an image or a historical scenario map. " +
      "Please enter your name: ");

  } else if ($.getUrlVar('action') == "multi") {

    if (is_longturn()) {
        setTimeout(show_longturn_intro_dialog, 300);
    } else {
      var msg = "You are about to join this game server, where you can "  +
                  "participate in a multiplayer game. You can customize the game " +
                  "settings, and wait for the minimum number of players before " +
                  "the game can start. ";
      show_intro_dialog("Welcome to XBWorld", msg);
    }

  } else if ($.getUrlVar('action') == "hack") {
    var hack_port;
    var hack_username;

    if ($.getUrlVar('civserverport') != null) {
      hack_port = $.getUrlVar('civserverport');
    } else {
      show_intro_dialog("Welcome to XBWorld",
        "Hack mode disabled because civserverport wasn't specified. "
        + "Falling back to regular mode.");
      return;
    }

    if ($.getUrlVar("username") != null) {
      hack_username = $.getUrlVar("username");
    } else if (simpleStorage.hasKey("username")) {
      hack_username = simpleStorage.get("username");
    } else {
      show_intro_dialog("Welcome to XBWorld",
        "Hack mode disabled because \"username\" wasn't specified and no "
        + "stored user name was found. " +
        "Falling back to regular mode.");
      return;
    }

    if ($.getUrlVar('autostart') == "true") {
      autostart = true;
    }

    network_init_manual_hack(hack_port, hack_username,
                             $.getUrlVar("savegame"));
  } else {
    show_intro_dialog("Welcome to XBWorld",
      "You are about to join this game server, where you can " +
      "play a singleplayer game against the XBWorld AI. You can " +
      "start the game directly by entering any name, or customize the game settings. " +
      "Creating a user account is optional, but savegame support requires that you create a user account. (<a class='pwd_reset' href='#' style='color: #555555;'>Forgot password?</a>) Have fun! <br>" +
      "Please enter your name: ");
      $(".pwd_reset").click(forgot_pbem_password);
  }
}


/**************************************************************************
 Closes a generic message dialog.
**************************************************************************/
function close_dialog_message() {
  $("#generic_dialog").dialog('close');
}

function closing_dialog_message() {
  clearTimeout(dialog_message_close_task);
  $("#game_text_input").blur();
}

/**************************************************************************
 Shows a generic message dialog.
**************************************************************************/
function show_dialog_message(title, message) {

  // reset dialog page.
  $("#generic_dialog").remove();
  $("<div id='generic_dialog'></div>").appendTo("div#game_page");

  speak(title);
  speak(message);

  $("#generic_dialog").html(message);
  $("#generic_dialog").attr("title", title);
  $("#generic_dialog").dialog({
			bgiframe: true,
			modal: false,
			width: is_small_screen() ? "90%" : "50%",
			close: closing_dialog_message,
			buttons: {
				Ok: close_dialog_message
			}
		}).dialogExtend({
                   "minimizable" : true,
                   "closable" : true,
                   "icons" : {
                     "minimize" : "ui-icon-circle-minus",
                     "restore" : "ui-icon-bullet"
                   }});

  $("#generic_dialog").dialog('open');
  $("#game_text_input").blur();

  // automatically close dialog after 24 seconds, because sometimes the dialog can't be closed manually.
  dialog_message_close_task = setTimeout(close_dialog_message, 24000);

  $('#generic_dialog').css("max-height", "450px");

}


/**************************************************************************
 Shows the authentication and password dialog.
**************************************************************************/
function show_auth_dialog(packet) {

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  var intro_html = packet['message']
      + "<br><br> Password: <input id='password_req' type='text' size='25'>";
  $("#dialog").html(intro_html);
  $("#dialog").attr("title", "Private server needs password to enter");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "80%" : "60%",
			buttons:
			{
				"Ok" : function() {
                                  var pwd_packet = {"pid" : packet_authentication_reply, "password" : $('#password_req').val()};
                                  var myJSONText = JSON.stringify(pwd_packet);
                                  send_request(myJSONText);

                                  $("#dialog").dialog('close');
				}
			}
		});


  $("#dialog").dialog('open');


}



/****************************************************************************
 Change between 2D isometric and 3D WebGL renderer.
****************************************************************************/
function switch_renderer()
{

  $("#canvas_div").unbind();
  if (renderer == RENDERER_WEBGL) {
    //activate 2D isometric renderer
    renderer = RENDERER_2DCANVAS;
    $("#canvas_div").empty();
    init_mapview();
    set_default_mapview_active();
    requestAnimationFrame(update_map_canvas_check, mapview_canvas);
    mapctrl_init_2d();

    for (var tile_id in tiles) {
      if (tile_get_known(tiles[tile_id]) == TILE_KNOWN_SEEN) {
        center_tile_mapcanvas(tiles[tile_id]);
        break;
      }
    }

    // reset 3D WebGL data
    for (var tile_id in tiles) {
      tiles[tile_id]['height'] = 0;
    }
    scene = null;
    heightmap = {};
    unit_positions = {};
    city_positions = {};
    city_label_positions = {};
    city_walls_positions = {};
    unit_flag_positions = {};
    unit_label_positions = {};
    unit_activities_positions = {};
    unit_health_positions = {};
    unit_healthpercentage_positions = {};
    forest_positions = {};
    jungle_positions = {};
    tile_extra_positions = {};
    road_positions = {};
    rail_positions = {};
    river_positions = {};
    tiletype_palette = [];
    meshes = {};
    load_count = 0;

  } else {
    //activate 3D WebGL renderer
    renderer = RENDERER_WEBGL;
    load_count = 0;
    mapview_model_width = Math.floor(MAPVIEW_ASPECT_FACTOR * map['xsize']);
    mapview_model_height = Math.floor(MAPVIEW_ASPECT_FACTOR * map['ysize']);

    set_default_mapview_active();
    init_webgl_renderer();

  }

  $.contextMenu({
        selector: (renderer == RENDERER_2DCANVAS) ? '#canvas' : '#canvas_div' ,
	    zIndex: 5000,
        autoHide: true,
        callback: function(key, options) {
          handle_context_menu_callback(key);
        },
        build: function($trigger, e) {
            if (!context_menu_active) {
              context_menu_active = true;
              return false;
            }
            var unit_actions = update_unit_order_commands();
            return {
                 callback: function(key, options) {
                   handle_context_menu_callback(key);
                  } ,
                 items : unit_actions
            };
        }
  });

}
