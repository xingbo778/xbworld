import { sendRequest, sendMessage, network_init } from '../net/connection';
import { packet_player_ready, packet_nation_select_req, packet_authentication_reply } from '../net/packetConstants';
import { client_state, C_S_PREPARING, C_S_RUNNING, set_client_state } from '../client/clientState';
import { globalEvents } from '../core/events';
import { logNormal, logError } from '../core/log';
import { isTouchDevice, clone, is_small_screen, supports_mp3, validateEmail } from '../utils/helpers';
import { $id, on } from '../utils/dom';
import { setup_window_size, blur_input_on_touchdevice, show_dialog_message } from '../ui/dialogs';
import { store } from '../data/store';
import { PLRF_AI } from '../data/player'; // Assuming PLRF_AI is defined here

declare const $: any;
declare const client: any;
declare const players: any;
declare const nations: any;
declare const sprites: any;
declare const tileset: any;
declare const city_rules: any;
declare const scenario_info: any;
declare const game_info: any;
declare const server_settings: any;
declare const ruleset_control: any;
declare const simpleStorage: any;
declare const audio_enabled: boolean;
declare const audio: any;
declare const music_list: string[];
declare const map_select_setting_enabled: boolean;
declare const canvas_text_font: string;
declare const speech_enabled: boolean;
declare const speak_unfiltered: (message: string) => void;
declare const load_voices: () => void;
declare const voice: string;
declare const anaglyph_3d_enabled: boolean;
declare const RENDERER_WEBGL: any;
declare const renderer: any;
declare const webgl_preload: () => void;
declare const webgl_benchmark_run: () => void;
declare const benchmark_start: number;
declare const swal: any;
declare const jsSHA: any;
declare const grecaptcha: any;
declare const captcha_site_key: string;
declare const gapi: any;
declare const BigScreen: any;

export let observing: boolean = false;
export let chosen_nation: number = -1;
export let chosen_style: number = -1;
export let choosing_player: number = -1;
export let ai_skill_level: number = 3;
export let nation_select_id: number = -1;
export let metamessage_changed: boolean = false;
export let logged_in_with_password: boolean = false;
export let antialiasing_setting: boolean = true;
export let update_player_info_pregame_queued: boolean = false;
export let password_reset_count: number = 0;
export let google_user_token: string | null = null;

export const QUALITY_MEDIUM: number = 2; // Medium quality.
export const QUALITY_HIGH: number = 3;   // Best quality, add features which require
                        // high-end graphics hardware here.

export let graphics_quality: number = QUALITY_HIGH;

// TODO: Import these functions from their respective modules if they exist.
declare function is_pbem(): boolean;
declare function is_hotseat(): boolean;
declare function is_longturn(): boolean;
declare function get_tileset_file_extention(): string;
declare function helpdata_format_current_ruleset(): string;
declare function is_speech_supported(): boolean;
declare function validate_username(): boolean;
declare function init_common_intro_dialog(): void;
declare function show_pbem_dialog(): void;
declare function challenge_pbem_player_dialog(message: string): void;
declare function is_username_valid_show(username: string): boolean;
declare function forceLower(element: HTMLInputElement): boolean;

let dialog_close_trigger: string = "";
let autostart: boolean = false;
let username: string = "";

/****************************************************************************
  ...
****************************************************************************/
export function sanitize_username(un: string): string
{
  return (un.trim()
    .replace(/&/g, '&amp;') // Must be first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;'));
}

/****************************************************************************
  ...
****************************************************************************/
export function pregame_start_game(): void
{
  if (client.conn['player_num'] == null) return;

  if (is_pbem() || is_hotseat()) {
    set_alternate_turns();
  }

  const test_packet = {"pid" : packet_player_ready, "is_ready" : true,
                     "player_no": client.conn['player_num']};
  const myJSONText = JSON.stringify(test_packet);
  sendRequest(myJSONText);

  setup_window_size ();
}

/****************************************************************************
  Set some parameters needed for alternate turns game type.
****************************************************************************/
export function set_alternate_turns(): void
{
  sendMessage("/set phasemode player");
  sendMessage("/set minp 2");
  sendMessage("/set ec_chat=enabled");
  sendMessage("/set ec_info=enabled");
  sendMessage("/set ec_max_size=20000");
  sendMessage("/set ec_turns=32768");
}

/****************************************************************************
  ...
****************************************************************************/
export function observe(): void
{
  if (observing) {
    $("#observe_button").button("option", "label", "Observe Game");
    sendMessage("/detach");

  } else {
    $("#observe_button").button("option", "label", "Don't observe");
    sendMessage("/observe");
  }

  observing = !observing;
}

/****************************************************************************
  Show information about the current game
****************************************************************************/
export function update_game_info_pregame(): void
{
  let game_info_html = "";

  if (C_S_PREPARING != client_state()) {
    /* The game has already started. */
    return;
  }

  if (scenario_info != null && scenario_info['is_scenario']) {
    /* Show the scenario description. */
    game_info_html += "<p>";
    game_info_html += scenario_info['description'].replace(/\n/g, "<br>");
    game_info_html += "</p>";

    if (scenario_info['authors']) {
      /* Show the scenario authors. */
      game_info_html += "<p>";
      game_info_html += "Scenario by ";
      game_info_html += scenario_info['authors'].replace(/\n/g, "<br>");
      game_info_html += "</p>";
    }

    if (scenario_info['prevent_new_cities']) {
      /* Make sure that the player is aware that cities can't be built. */
      game_info_html += "<p>";
      game_info_html += scenario_info['name']
                        + " forbids the founding of new cities.";
      game_info_html += "</p>";
    }
  }

  if (is_longturn()) {
    $("#load_game_button").hide();
    $("#pregame_settings_button").hide();
    game_info_html += "<p>";
    game_info_html += "<h2>XBWorld: One Turn per Day game</h2>-Each player plays one turn every day, each turn lasts 23 hours.<br>";


  } else if ($.getUrlVar('action') == "multi") {
    game_info_html += "<p>";
    game_info_html += "<h2>XBWorld Multiplayer game</h2>-You are now about to play a multiplayer game.<br>-Please wait until at least 2 players have joined the game, then click the start game button.";
    game_info_html += "</p>";
  }

  $("#pregame_game_info").html(game_info_html);

  /* Update pregame_message_area's height. */
  setup_window_size();
}

/****************************************************************************
  Shows the pick nation dialog. This can be called multiple times, but will
  only call update_player_info_pregame_real once in a short timespan.
****************************************************************************/
export function update_player_info_pregame(): void
{
  if (update_player_info_pregame_queued) return;
  setTimeout(update_player_info_pregame_real, 1000);
  update_player_info_pregame_queued = true;

}

/****************************************************************************
  Shows the pick nation dialog.
****************************************************************************/
export function update_player_info_pregame_real(): void
{
  let id: string;
  if (C_S_PREPARING == client_state()) {
    let player_html = "";
    for (id in players) {
      const player = players[id];
      if (player != null) {
        if (player['name'].indexOf("AI") != -1) {
          player_html += "<div id='pregame_plr_" + id
		        + "' class='pregame_player_name'><div id='pregame_ai_icon'></div><b>"
                        + player['name'] + "</b></div>";
        } else {
          player_html += "<div id='pregame_plr_" + id
		        + "' class='pregame_player_name'><div id='pregame_player_icon'></div><b>"
                        + player['name'] + "</b></div>";
        }
      }
    }
    $("#pregame_player_list").html(player_html);

    /* Show player ready state in pregame dialog */
    for (id in players) {
      const player = players[id];
      let nation_text = "";
      if (player['nation'] in nations) {
        nation_text = " - " + nations[player['nation']]['adjective'];
        const flag_html = $("<canvas id='pregame_nation_flags_" + id + "' width='29' height='20' class='pregame_flags'></canvas>");
        $("#pregame_plr_"+id).prepend(flag_html);
        const flag_canvas = document.getElementById('pregame_nation_flags_' + id) as HTMLCanvasElement;
        if (flag_canvas == null) continue;
        const flag_canvas_ctx = flag_canvas.getContext("2d");
        const tag = "f." + nations[player['nation']]['graphic_str'];
        if (sprites[tag] != null && flag_canvas_ctx != null) {
          flag_canvas_ctx.drawImage(sprites[tag], 0, 0);
        }
      }
      if (player['is_ready'] == true) {
        $("#pregame_plr_"+id).addClass("pregame_player_ready");
        $("#pregame_plr_"+id).attr("title", "Player ready" + nation_text);
      } else if (player['name'].indexOf("AI") == -1) {
          $("#pregame_plr_"+id).attr("title", "Player not ready" + nation_text);
      } else {
          $("#pregame_plr_"+id).attr("title", "AI Player (random nation)");
      }
      $("#pregame_plr_"+id).attr("name", player['name']);
      $("#pregame_plr_"+id).attr("playerid", player['playerno']);

    }
    $(".pregame_player_name").tooltip();

    let pregame_context_items: any = {
            "pick_nation": {name: "Pick nation"},
            "observe_player": {name: "Observe this player"},
            "take_player": {name: "Take this player"},
            "aitoggle_player": {name: "Aitoggle player"},
            "sep1": "---------",
            "novice": {name: "Novice"},
            "easy": {name: "Easy"},
            "normal": {name: "Normal"},
            "hard": {name: "Hard"},
            "sep2": "---------"
       };

    if (is_pbem()) {
      pregame_context_items = {
            "pick_nation": {name: "Pick nation"}};
    }

    if (!is_longturn()) {
      $("#pregame_player_list").contextMenu({
        selector: '.pregame_player_name',
        callback: function(key: string, options: any) {
            let name = $(this).attr('name');
            if (name != null && name.indexOf(" ") != -1) name = name.split(" ")[0];
            const playerid = parseInt($(this).attr('playerid'));
            if (key == "take_player") {
              sendMessage("/take " + name);
            } else if (key == "pick_nation") {
              pick_nation(playerid);
            } else if (key == "aitoggle_player") {
              sendMessage("/aitoggle " + name);
            } else if (key == "observe_player") {
              sendMessage("/observe " + name);
            } else if (key == "novice") {
              sendMessage("/novice " + name);
            } else if (key == "easy") {
              sendMessage("/easy " + name);
            } else if (key == "normal") {
              sendMessage("/normal " + name);
            } else if (key == "hard") {
              sendMessage("/hard " + name);
            }
        },
        items: pregame_context_items
      });
    }

    /* Set state of Start game button depending on if user is ready. */
    if (client.conn['player_num'] != null  && client.conn['player_num'] in players
        && players[client.conn['player_num']]['is_ready'] == true) {
        $("#start_game_button").button( "option", "disabled", true);
    } else {
        $("#start_game_button").button( "option", "disabled", false);
    }
  }
  update_player_info_pregame_queued = false;
}


/****************************************************************************
  Shows the pick nation dialog.
****************************************************************************/
export function pick_nation(player_id: number): void
{
  if (player_id == null) player_id = client.conn['player_num'];
  const pplayer = players[player_id];
  choosing_player = player_id;

  if (pplayer == null) return;

  let nations_html = "<div id='nation_heading'><span>Select nation for " + pplayer['name'] + ":</span> <br>"
                  + "<input id='nation_autocomplete_box' type='text' size='20'>"
		  + "<div id='nation_choice'></div></div> <div id='nation_list'> ";

  /* Prepare a list of flags and nations. */
  const nation_name_list: string[] = [];
  for (const nation_id in nations) {
    const pnation = nations[nation_id];
    if (pnation['is_playable']) {
      nations_html += "<div class='nation_pickme_line' onclick='select_nation(" + nation_id + ");'>"
             + "<div id='nation_" + nation_id + "' class='nation_choice'>"
             + "<canvas id='pick_flag_" + nation_id + "' width='29' height='20' class='pick_nation_flags'></canvas>"
             + pnation['adjective'] + "</div></div>";
      nation_name_list.push(pnation['adjective']);
    }
  }

  nations_html += "</div><div id='nation_style_choices'></div>"
               + "<div id='nation_legend'></div><div id='select_nation_flag'></div>";

  $("#pick_nation_dialog").html(nations_html);
  $("#pick_nation_dialog").attr("title", "What Nation Will " + pplayer['name'] + " Be Ruler Of?");
  $("#pick_nation_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "99%" : "70%",
            height: $(window).height() - 100,
			buttons: {
			    "Customize this nation": function() {
                   show_customize_nation_dialog(player_id);
            	},
				"Play this nation!": function() {
					$("#pick_nation_dialog").dialog('close');
					submit_nation_choice();
				}
			}
		});

  $("#nation_legend").html("Please choose nation for " + pplayer['name'] + ".");


  $("#nation_autocomplete_box").autocomplete({
      source: nation_name_list,
      close: function (event: any, ui: any) { update_nation_selection(); }
  });

  if (is_small_screen()) {
    $("#select_nation_flag").hide();
    $("#nation_legend").hide();
    $("#nation_style_choices").hide();
    $("#nation_list").width("80%");
  }

  nation_select_id = setTimeout (update_nation_selection, 150);
  $("#pick_nation_dialog").dialog('open');

  if (!is_small_screen()) {
    render_city_style_list();
  } else {
    $("#nation_autocomplete_box").blur();
  }

  for (const nation_id in nations) {
    const pnation = nations[nation_id];
    if (pnation['is_playable']) {
      const flag_canvas = document.getElementById('pick_flag_' + nation_id) as HTMLCanvasElement;
      const flag_canvas_ctx = flag_canvas.getContext("2d");
      const tag = "f." + pnation['graphic_str'];

      if (tileset[tag] == null) continue;

      flag_canvas_ctx.drawImage(sprites[tag], 0, 0);
    }
  }

  if (chosen_nation != -1) {
    select_nation(chosen_nation);
  }
}

/****************************************************************************
  This function is called when the nation select autocomplete box
  has been used, and it will call select_nation based on the user's choice.
****************************************************************************/
export function update_nation_selection(): void
{
  const nation_name = $("#nation_autocomplete_box").val();
  if (nation_name == null || nation_name.length == 0) return;
  if (C_S_RUNNING == client_state()) return;

  for (const nation_id in nations) {
    const pnation = nations[nation_id];
    if (pnation['is_playable'] && pnation['adjective'].toLowerCase() == nation_name.toLowerCase()) {
      select_nation(parseFloat(nation_id));
      return;
    }
  }
}

/****************************************************************************
  Renders a list of city styles in the choose nation dialog.
****************************************************************************/
export function render_city_style_list(): void
{
  /* Prepare a list of city styles. */
  let city_style_html = "<b>City Styles:</b><br>";
  for (const style_id in city_rules) {
    if (parseFloat(style_id) > 5) continue;
    const pstyle = city_rules[style_id];
    city_style_html += "<canvas id='city_style_" + style_id
          + "' data-style-id='" + style_id + "' width='96' height='72' style='cursor: pointer;'></canvas><br>"
          + pstyle['rule_name'] + "<br>";
  }
  $("#nation_style_choices").html(city_style_html);
  for (const style_id in city_rules) {
    if (parseFloat(style_id) > 5) continue;
    const pstyle = city_rules[style_id];
    const pcitystyle_canvas = document.getElementById('city_style_' + style_id) as HTMLCanvasElement;
    if (pcitystyle_canvas == null) continue;
    const ctx = pcitystyle_canvas.getContext("2d");
    const tag = pstyle['graphic'] + "_city_4";
    if (parseFloat(style_id) == chosen_style) {
      ctx.fillStyle="#FFFFFF";
      ctx.fillRect(0,0, 96, 72);
    }
    ctx.drawImage(sprites[tag], 0, 0);

    $("#city_style_" + style_id).click(function() {
      chosen_style = parseFloat($(this).attr("data-style-id"));
      render_city_style_list();
    });

  }

}

/****************************************************************************
  Updates the choose nation dialog with the selected nation.
****************************************************************************/
export function select_nation(new_nation_id: number): void
{
  const pnation = nations[new_nation_id];
  $("#nation_legend").html(pnation['legend']);
  $("#nation_autocomplete_box").val(pnation['adjective']);
  $("#nation_" + chosen_nation).css("background-color", "transparent");
  $("#nation_choice").html("Chosen nation: " + pnation['adjective']);

  if (!pnation['customized']) {
    $("#select_nation_flag").html("<img style='nation_flag_choice' src='/images/flags/"
		            + pnation['graphic_str'] + "-web" + get_tileset_file_extention() + "'>");
  }

  if (chosen_nation != new_nation_id && $("#nation_" + new_nation_id).length > 0) {
    $("#nation_" + new_nation_id).get(0).scrollIntoView();
  }

  chosen_nation = parseFloat(new_nation_id.toString());
  $("#nation_" + chosen_nation).css("background-color", "#FFFFFF");
}

/****************************************************************************
  ...
****************************************************************************/
export function submit_nation_choice(): void
{
  if (chosen_nation == -1 || client.conn['player_num'] == null
      || choosing_player == null || choosing_player < 0) return;

  const pplayer = players[choosing_player];
  if (pplayer == null) return;

  let leader_name = pplayer['name'];

  if (pplayer['flags'].isSet(PLRF_AI)) {
    leader_name = nations[chosen_nation]['leader_name'][0];
  }

  let style = nations[chosen_nation]['style'];
  if (chosen_style != -1) {
    style = chosen_style;
  }

  const test_packet = {"pid" : packet_nation_select_req,
                     "player_no" : choosing_player,
                     "nation_no" : chosen_nation,
                     "is_male" : true, /* FIXME */
                     "name" : leader_name,
                     "style" : style};
  sendRequest(JSON.stringify(test_packet));
  clearInterval(nation_select_id);

  if (is_longturn()) {
    pregame_start_game();
  }
}

/***************************************************************************
  Returns the ruleset directory of the ruleset based on its name.
***************************************************************************/
export function ruledir_from_ruleset_name(ruleset_name: string, fall_back_dir: string): string
{
  /* HACK: Find current ruleset dir based on its name. */
  switch (ruleset_name) {
  case "Classic ruleset":
    return "classic";
  case "Civ2Civ3 ruleset":
    return "civ2civ3";
  case "Multiplayer ruleset":
    return "multiplayer";
  case "Webperimental":
    return "webperimental";
  default:
    console.log("Don't know the ruleset dir of \"" + ruleset_name
                + "\". Guessing \"" + fall_back_dir + "\".");
    return fall_back_dir;
  }
}

/***************************************************************************
  Show the full description of the current ruleset.
***************************************************************************/
export function show_ruleset_description_full(): void {
  const id = "#long_help_dialog";

  if (ruleset_control == null) return;

  $(id).remove();
  $("<div id='long_help_dialog'></div>").appendTo("div#pregame_page");

  $(id).html(helpdata_format_current_ruleset());

  $(id).dialog({
                 title   : ruleset_control['name'],
                 buttons : {
                   Close : function () {
                     $(id).dialog('close');
                   }
                 },
                 height  : $("#pregame_settings").dialog("option",
                                                         "height"),
                 width   : "80%"
               });
}

/****************************************************************************
  Shows the pregame settings dialog.
****************************************************************************/
export function pregame_settings(): void
{
  const id = "#pregame_settings";
  $(id).remove();
  $("<div id='pregame_settings'></div>").appendTo("div#pregame_page");

  const dhtml = "<div id='pregame_settings_tabs'>" +
      "   <ul>" +
      "     <li><a href='#pregame_settings_tabs-1'>Game</a></li>" +
      "     <li><a href='#pregame_settings_tabs-3'>Other</a></li>" +
      "   </ul>"
      + "<div id='pregame_settings_tabs-1'><table id='settings_table'> "
      + "<tr title='Ruleset version'><td>Ruleset:</td>"
      + "<td><select name='ruleset' id='ruleset'>"
      + "<option value='classic'>Classic</option>"
      + "<option value='civ2civ3'>Civ2Civ3</option>"
      + "<option value='webperimental'>Webperimental</option>"
      + "</select><a id='ruleset_description'></a></td></tr>"
      + "<tr title='Set metaserver info line'><td>Game title:</td>" +
	  "<td><input type='text' name='metamessage' id='metamessage' size='28' maxlength='42'></td></tr>" +
	  "<tr title='Enables music'><td>Music:</td>" +
          "<td><input type='checkbox' name='music_setting' id='music_setting'>Play Music</td></tr>" +
	  "<tr class='not_pbem' title='Total number of players (including AI players)'><td>Number of Players (including AI):</td>" +
	  "<td><input type='number' name='aifill' id='aifill' size='4' length='3' min='0' max='12' step='1'></td></tr>" +
	  "<tr class='not_pbem' title='Maximum seconds per turn'><td>Timeout (seconds per turn):</td>" +
	  "<td><input type='number' name='timeout' id='timeout' size='4' length='3' min='30' max='3600' step='1'></td></tr>" +
          "<tr class='not_pbem' title='Creates a private game where players need to know this password in order to join.'><td>Password for private game:</td>" +
	  "<td><input type='text' name='password' id='password' size='10' length='10'></td></tr>" +
	  "<tr title='Map size (in thousands of tiles)'><td>Map size:</td>" +
	  "<td><input type='number' name='mapsize' id='mapsize' size='4' length='3' min='1' max='10' step='1'></td></tr>" +
	  "<tr class='not_pbem' title='This setting sets the skill-level of the AI players'><td>AI skill level:</td>" +
	  "<td><select name='skill_level' id='skill_level'>" +
	      "<option value='1'>Restricted</option>" +
	      "<option value='2'>Novice</option>" +
	      "<option value='3'>Easy</option>" +
          "<option value='4'>Normal</option>" +
          "<option value='5'>Hard</option>" +
          "<option value='6'>Cheating</option>" +
	  "</select></td></tr>"+
	  "<tr title='Number of initial techs per player'><td>Tech level:</td>" +
	  "<td><input type='number' name='techlevel' id='techlevel' size='3' length='3' min='0' max='100' step='10'></td></tr>" +
	  "<tr title='This setting gives the approximate percentage of the map that will be made into land.'><td>Landmass:</td>" +
	  "<td><input type='number' name='landmass' id='landmass' size='3' length='3' min='15' max='85' step='10'></td></tr>" +
	  "<tr title='Amount of special resource squares'><td>Specials:</td>" +
	  "<td><input type='number' name='specials' id='specials' size='4' length='4' min='0' max='1000' step='50'></td></tr>" +
	  "<tr title='Minimum distance between cities'><td>City mindist :</td>" +
	  "<td><input type='number' name='citymindist' id='citymindist' size='4' length='4' min='1' max='9' step='1'></td></tr>" +
          "<tr title='The game will end at the end of the given turn.'><td>End turn:</td>" +
	  "<td><input type='number' name='endturn' id='endturn' size='4' length='4' min='0' max='32767' step='1'></td></tr>" +
	  "<tr class='not_pbem' title='Enables score graphs for all players, showing score, population, techs and more."+
          " This will lead to information leakage about other players.'><td>Score graphs</td>" +
          "<td><input type='checkbox' name='scorelog_setting' id='scorelog_setting' checked>Enable score graphs</td></tr>" +
      "<tr id='killstack_area'><td id='killstack_label'></td>" +
          "<td><input type='checkbox' id='killstack_setting'>Enable killstack</td></tr>" +
      "<tr id='selct_multiple_units_area'><td id='select_multiple_units_label'></td>" +
          "<td><input type='checkbox' id='select_multiple_units_setting'>Right-click selects units</td></tr>" +
	  "<tr title='Method used to generate map'><td>Map generator:</td>" +
	  "<td><select name='generator' id='generator'>" +
          "<option value='RANDOM'>Fully random height</option>" +
          "<option value='FRACTAL'>Pseudo-fractal height</option>" +
          "<option value='ISLAND'>Island-based</option>" +
          "<option value='FAIR'>Fair islands</option>" +
          "<option value='FRACTURE'>Fracture map</option>" +
    "</select></td></tr>"
    + "</table><br>"+
	  "<span id='settings_info'><i>XBWorld can be customized using the command line in many " +
          "other ways also. Type /help in the command line for more information.</i></span></div>" +

      "<div id='pregame_settings_tabs-3'>" +
	    "<table id='settings_table'>" +
        "<tr title='Font on map'><td>Font on map:</td>" +
	    "<td><input type='text' name='mapview_font' id='mapview_font' size='28' maxlength='42' value='16px Georgia, serif'></td></tr>" +
	    "<tr id='speech_enabled'><td id='speech_label'></td>" +
        "<td><input type='checkbox' id='speech_setting'>Enable speech audio messages</td></tr>" +
	    "<tr id='voice_row'><td id='voice_label'></td>" +
        "<td><select name='voice' id='voice'></select></td></tr>" +
        "</table>" +
      "</div>"
	  ;
  $(id).html(dhtml);

  $(id).attr("title", "Game Settings");
  $(id).dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "98%" : "60%",
            height: is_small_screen() ?  $(window).height() - 40 : $(window).height() - 250,
			 buttons: {
				Ok: function() {
					$("#pregame_settings").dialog('close');
					if (benchmark_start > 0) {
					  $(window).unbind('beforeunload');
                      alert("Reloading game to setup new graphics quality.");
					  location.reload();
					}
				}
			  }
  });

  $("#pregame_settings_tabs").tabs();

  if (game_info != null) {
    $("#aifill").val(game_info['aifill']);
    $("#timeout").val(game_info['timeout']);
    $("#skill_level").val(ai_skill_level);
  }

  if (server_settings['techlevel'] != null
      && server_settings['techlevel']['val'] != null) {
    $("#techlevel").val(server_settings['techlevel']['val']);
  }

  if (server_settings['landmass'] != null
      && server_settings['landmass']['val'] != null) {
    $("#landmass").val(server_settings['landmass']['val']);
  }

  if (server_settings['specials'] != null
      && server_settings['specials']['val'] != null) {
    $("#specials").val(server_settings['specials']['val']);
  }

  if (server_settings['citymindist'] != null
      && server_settings['citymindist']['val'] != null) {
    $("#citymindist").val(server_settings['citymindist']['val']);
  }

  if (server_settings['endturn'] != null
      && server_settings['endturn']['val'] != null) {
    $("#endturn").val(server_settings['endturn']['val']);
  }

  if (server_settings['size'] != null
      && server_settings['size']['val'] != null) {
    $("#mapsize").val(server_settings['size']['val']);
  }

  if (server_settings['killstack'] != null
      && server_settings['killstack']['val'] != null) {
    $("#killstack_setting").prop("checked",
                                 server_settings['killstack']['val']);
    $("#killstack_area").prop("title",
                              server_settings['killstack']['extra_help']);
    $("#killstack_label").prop("innerHTML",
                              server_settings['killstack']['short_help']);
  }

  if (server_settings['generator'] != null
      && server_settings['generator']['val'] != null) {
    /* TODO: Should probably be auto generated from setting so help text,
     * alternatives etc is kept up to date. */
    $("#generator").val(server_settings['generator']['support_names'][
                        server_settings['generator']['val']]);
  }

  $("#select_multiple_units_setting").prop("checked", map_select_setting_enabled);
  $("#select_multiple_units_area").prop("title", "Select multiple units with right-click and drag");
  $("#select_multiple_units_label").prop("innerHTML", "Select multiple units with right-click and drag");

  // TODO: Check if these elements exist in the HTML
  // $("#3d_antialiasing_label").prop("innerHTML", "Antialiasing:");

  const stored_antialiasing_setting = simpleStorage.get("antialiasing_setting", "");
  if (stored_antialiasing_setting != null && stored_antialiasing_setting == "false") {
      // $("#3d_antialiasing_setting").prop("checked", false);
      antialiasing_setting = false;
  }

  // $('#3d_antialiasing_setting').change(function() {
  //   antialiasing_setting = !antialiasing_setting;
  //   simpleStorage.set("antialiasing_setting", antialiasing_setting ? "true" : "false");
  // });

  if (is_speech_supported()) {
    $("#speech_setting").prop("checked", speech_enabled);
    $("#speech_label").prop("innerHTML", "Speech messages:");
    $("#voice_label").prop("innerHTML", "Voice:");
  } else {
    $("#speech_label").prop("innerHTML", "Speech messages:");
    $("#speech_setting").parent().html("Speech Synthesis API is not supported or enabled in your browser.");
  }

  // $("#anaglyph_label").prop("innerHTML", "3D Anaglyph glasses:");
  // $('#anaglyph_setting').change(function() {
  //   anaglyph_3d_enabled = !anaglyph_3d_enabled;
  // });

  if (server_settings['metamessage'] != null
      && server_settings['metamessage']['val'] != null) {
    $("#metamessage").val(server_settings['metamessage']['val']);
  }

  if (ruleset_control != null) {
    $("#ruleset").val(ruledir_from_ruleset_name(ruleset_control['name'],
                                                "classic"));
  }

  if (scenario_info != null && scenario_info['is_scenario']) {
    /* A scenario may be bound to a ruleset. */
    $("#ruleset").prop("disabled", scenario_info['ruleset_locked']);
  }

  $(id).dialog('open');

  $('#aifill').change(function() {
    if (parseInt($('#aifill').val()) <= 12) {
      sendMessage("/set aifill " + $('#aifill').val());
    }
  });

  $('#metamessage').change(function() {
    sendMessage("/metamessage " + $('#metamessage').val());
    metamessage_changed = true;
  });

  $('#metamessage').bind('keyup blur',function(){
    const cleaned_text = $(this).val().replace(/[^a-zA-Z\s\-]/g,'');
    if ($(this).val() != cleaned_text) {
      $(this).val( cleaned_text ); }
    }
  );

  $('#mapview_font').change(function() {
    // TODO: canvas_text_font is a global variable, consider making it a setting or part of a state object.
    // @ts-ignore
    canvas_text_font =  $('#mapview_font').val();
  });

  $('#mapsize').change(function() {
    const mapsize = parseFloat($('#mapsize').val());
    if (mapsize <= 10 ) {
      sendMessage("/set size " + $('#mapsize').val());
    }
  });

  $('#timeout').change(function() {
    sendMessage("/set timeout " + $('#timeout').val());
  });

  $('#techlevel').change(function() {
    sendMessage("/set techlevel " + $('#techlevel').val());
  });

  $('#specials').change(function() {
    sendMessage("/set specials " + $('#specials').val());
  });

  $('#landmass').change(function() {
    sendMessage("/set landmass " + $('#landmass').val());
  });

  $('#citymindist').change(function() {
    sendMessage("/set citymindist " + $('#citymindist').val());
  });

  $('#endturn').change(function() {
    sendMessage("/set endturn " + $('#endturn').val());
  });

  $('#generator').change(function() {
    sendMessage("/set generator " + $('#generator').val());
  });

  /* Make the long ruleset description available in the pregame. The
   * ruleset's README isn't located at the player's computer. */
  $('#ruleset_description').html(" description");
  $('#ruleset_description').click(show_ruleset_description_full);

  $('#ruleset').change(function() {
    change_ruleset($('#ruleset').val());
  });

  $('#password').change(function() {

    swal({
      title: "Really set game password?",
      text: "Setting a password on this game means that other players can not join this game " +
            "unless they know this password. In multiplayer games, be sure to ask the other players " +
            "about setting a password.",
      type: "warning",   showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, set game password",
      closeOnConfirm: true },
      function(){
        const pwd_packet = {"pid" : packet_authentication_reply, "password" : $('#password').val()};
        sendRequest(JSON.stringify(pwd_packet));
        sendMessage("/metamessage Private password-protected game");
        metamessage_changed = true;
        $("#metamessage").prop('readonly', true);
        $("#metamessage_setting").prop('readonly', true);
        $("#password").prop('readonly', true);
     });
   });


  $('#skill_level').change(function() {
    ai_skill_level = parseFloat($('#skill_level').val());
    if (ai_skill_level == 1) {
      sendMessage("/restricted");
    } else if (ai_skill_level == 2) {
      sendMessage("/novice");
    } else if (ai_skill_level == 3) {
      sendMessage("/easy");
    } else if (ai_skill_level == 4) {
      sendMessage("/normal");
    } else if (ai_skill_level == 5) {
      sendMessage("/hard");
    } else if (ai_skill_level == 6) {
      sendMessage("/cheating");
    }
  });

  $('#music_setting').prop('checked', audio_enabled == true);

  $('#music_setting').change(function() {
    // TODO: audio_enabled is a global variable, consider making it a setting or part of a state object.
    // @ts-ignore
    audio_enabled = !audio_enabled;
    if (audio_enabled) {
      if (!audio.source.src) {
        if (!supports_mp3()) {
          audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".ogg");
        } else {
          audio.load("/music/" + music_list[Math.floor(Math.random() * music_list.length)] + ".mp3");
        }
      }
      audio.play();
    } else {
      audio.pause();
    }
  });

  $('#scorelog_setting').change(function() {
    const scorelog_enabled = $('#scorelog_setting').prop('checked');
    if (scorelog_enabled) {
      sendMessage("/set scorelog enabled");
    } else {
      sendMessage("/set scorelog disabled");
    }
  });

  $('#killstack_setting').change(function() {
    if ($('#killstack_setting').prop('checked')) {
      sendMessage("/set killstack enabled");
    } else {
      sendMessage("/set killstack disabled");
    }
  });

  $('#select_multiple_units_setting').change(function() {
      // TODO: map_select_setting_enabled is a global variable, consider making it a setting or part of a state object.
      // @ts-ignore
      if ($('#select_multiple_units_setting').prop('checked')) {
        // @ts-ignore
        map_select_setting_enabled = true;
      } else {
        // @ts-ignore
        map_select_setting_enabled = false;
      }
  });


  $('#graphics_quality').change(function() {
    graphics_quality = parseFloat($('#graphics_quality').val());
    simpleStorage.set("graphics_quality", graphics_quality);
    // TODO: load_count is a global variable, consider making it a setting or part of a state object.
    // @ts-ignore
    load_count = 0;
    webgl_preload();
  });

  $("#graphics_quality").val(graphics_quality);

  $(".benchmark").click(function() {
    swal({
      title: "Run benchmark?",
      text: "Do you want to run a benchmark now? This will start a new game and run measure the performance of a game playing for 30 turns.",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, run benchmark!",
      closeOnConfirm: true
    },
    function(){
      webgl_benchmark_run();
    });
  });

  if (renderer == RENDERER_WEBGL) {
    $(".benchmark").button();
    $("#show_voice_commands").button();
  } else {
    $('[href="#pregame_settings_tabs-2"]').closest('li').hide();
  }

  $('#speech_setting').change(function() {
    // TODO: speech_enabled is a global variable, consider making it a setting or part of a state object.
    // @ts-ignore
    if ($('#speech_setting').prop('checked')) {
      // @ts-ignore
      speech_enabled = true;
      speak_unfiltered("Speech enabled.");
    } else {
      // @ts-ignore
      speech_enabled = false;
    }
  });

  $('#voice').change(function() {
    // TODO: voice is a global variable, consider making it a setting or part of a state object.
    // @ts-ignore
    voice = $('#voice').val();
  });

  if (is_speech_supported()) {
    load_voices();
    window.speechSynthesis.onvoiceschanged = function(e: Event) {
      load_voices();
    };
  }

  if (is_pbem()) {
    $(".not_pbem").hide();
  }

  $("#settings_table").tooltip();

  if (is_touch_device() || is_small_screen()) {
      $('#metamessage').blur();
  }

  $("#show_voice_commands").click(function() {
   show_dialog_message("Voice commands",
     "<b>Voice command - Explanation:</b> <br>" +
     "T, Turn - Turn Done<br>" +
     "Y, Yes, O, Ok   - Yes<br>" +
     "No - No<br>" +
     "B, Build, City   - Build city<br>" +
     "X - Explore<br>" +
     "I, Irrigation  - Irrigation<br>" +
     "Road  - Road<br>" +
     "A, Auto  - Auto settlers<br>" +
     "F, Fortify  - Fortify<br>" +
     "M, Mine  - Mine<br>" +
     "Wait  - Wait<br>" +
     "U, Up  - Move unit up<br>" +
     "D, Down  - Down<br>" +
     "L, Left  - Left<br>" +
     "R, Right  - Right<br>" +
     "N, North  - North<br>" +
     "S, South  - South<br>" +
     "E, East  - East<br>" +
     "W, West  - West<br>" +
     "North West, North East, South East, South West<br>"
      );
  });

}

/**************************************************************************
  Change the ruleset to
**************************************************************************/
export function change_ruleset(to: string): void
{
  sendMessage("/rulesetdir " + to);
  // Reset some ruleset defined settings.
  sendMessage("/set nationset all");
  if (chosen_nation != -1) {
    swal("Ruleset changed. You need to select your nation again.");
  }
}

/**************************************************************************
  Shows the Freeciv intro dialog.
**************************************************************************/
export function show_intro_dialog(title: string, message: string): void {

  if ($.getUrlVar('autostart') == "true") {
    autostart = true;
    return;
  }

  // Reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  const intro_html = message + "<br><br><table><tr><td>Player name:</td><td><input id='username_req' type='text' size='25' maxlength='31'></td></tr>"
      +  "<tr id='password_row' style='display:none;'><td>Password:</td><td id='password_td'></td></tr></table>"
	  + " <br><br><span id='username_validation_result' style='display:none;'></span><br><br>";

  $("#dialog").html(intro_html);

  const stored_username = simpleStorage.get("username", "");
  if (stored_username != null && stored_username != false) {
    $("#username_req").val(stored_username);
  }
  const stored_password = simpleStorage.get("password", "");
  if (stored_password != null && stored_password != false) {
    $("#password_row").show();
    $("#password_td").html("<input id='password_req' type='password' size='25' maxlength='200'>  &nbsp; <a class='pwd_reset_2' href='#' style='color: #666666;'>Forgot password?</a>");
    $("#password_req").val(stored_password);
    $(".pwd_reset_2").click(function() { window.location.href = '/reset_password'; });
  }
  let join_game_customize_text = "";
  if ($.getUrlVar('action') == "load") {
    join_game_customize_text = "Load games";
  } else if ($.getUrlVar('action') == "multi") {
    join_game_customize_text = "Join Game";
  } else {
    join_game_customize_text = "Customize Game";
  }

  $("#dialog").attr("title", title);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "80%" : "60%",
			beforeClose: function( event: any, ui: any ) {
			  // If intro dialog is closed,
                          // then check the username and connect to the server.
			  if (dialog_close_trigger != "button") {
			    if (validate_username()) {
			      network_init();
			      if (!is_touch_device()) $("#pregame_text_input").focus();
			      return true;
			    } else {
			      return false;
			    }
			  }
			},
			buttons:
			[
			  {
				  text : "Start Game",
				  click : function() {
                     if (is_touch_device() || is_small_screen()) {
                       BigScreen.toggle();
                     }
					dialog_close_trigger = "button";
					autostart = true;
					validate_username_callback();
				  },
				  icons: { primary: "ui-icon-play" }
			  },
			  {
				  text : join_game_customize_text,
				  click : function() {
                    if (is_touch_device() || is_small_screen()) {
                      BigScreen.toggle();
                    }
					dialog_close_trigger = "button";
					validate_username_callback();
				},
				icons : { primary: "ui-icon-gear" }
			  },
              {
                  text : "New user account",
                  click : function() {
                    show_new_user_account_dialog();
                },
                icons : { primary: "ui-icon-person" }
              }
			]

		});

  if (($.getUrlVar('action') == "load" || $.getUrlVar('action') == "multi" || $.getUrlVar('action') == "earthload")
         && $.getUrlVar('load') != "tutorial") {
    $(".ui-dialog-buttonset button").first().hide();
  }

  const stored_username_check = simpleStorage.get("username", "");
  const stored_password_check = simpleStorage.get("password", "");
  if (stored_username_check != null && stored_username_check != false && stored_password_check != null && stored_password_check != false) {
    // Not allowed to create a new user account when already logged in.
    $(".ui-dialog-buttonset button").last().button("disable");
  }

  if (is_small_screen()) {
    // Some fixes for pregame screen on small devices.
    $("#freeciv_logo").remove();
    $("#pregame_message_area").css("width", "73%");
    $("#observe_button").remove();
  }

  $("#dialog").dialog('open');

  $('#dialog').keyup(function(e: JQuery.TriggeredEvent) {
    if (e.keyCode == 13) {
      dialog_close_trigger = "button";
      autostart = true;
      validate_username_callback();
    }
  });

  if ($.getUrlVar('action') == "observe") {
    $(".ui-dialog-buttonset button").first().remove();
    $(".ui-dialog-buttonset button").first().button("option", "label", "Observe Game");
  }

  blur_input_on_touchdevice();
}

/**************************************************************************
 Shows the Freeciv LongTurn intro dialog.
**************************************************************************/
export function show_longturn_intro_dialog(): void {

  const title = "Welcome to XBWorld: One Turn per Day!";

  let message = "<br>This is a XBWorld: One Turn per Day game, which is a XBWorld multiplayer game "+
        "where the turns are 23 hours each, so players logs in once every day to do their turn. This format allows for more players to "+
        "play at once, more time to strategize, more time to coordinate with other players, and less rushing to get things done, which can "+
        "occur in a standard multi-player XBWorld game. It takes a lot longer to play a game, about 2 to 6 months, but you can play it just a "+
        "little bit every day. <br><br> "+
        "Please be polite to the other players and don't cheat. "+
        "Contact a moderator at <a style='color: black;' href='mailto:freeciv-web-moderation@tutanota.com'>freeciv-web-moderation@tutanota.com</a> "+
        "to report players who behave badly or cheat.<br><br>" +
        "You will get to play for turn immediately after signing up, and your next turn tomorrow. Please join the game only if you are interested in playing one turn every day. " +
        "Players who are idle for more than 12 turns can be replaced by new players. This means that idle players will continually be replaced by new players.<br><br>" +
        "Joining this game requires signing in with a player name and validated Google Account."+
        "<br><br><br><table><tr><td>Player name:</td><td><input id='username_req' type='text' size='25' maxlength='31'></td></tr></table>" +
        " <br><br><span id='username_validation_result' style='display:none;'></span><br>" +
        "<div id='fc-signin2'></div><br><br><br><small>(Please disable adblockers, then reload the page, for Google login button to work)</small>";

  if (is_small_screen()) {
    message = "Welcome to this XBWorld: One Turn per Day game! Enter your player name:"+
      "<br><br><table><tr><td>Player name:</td><td><input id='username_req' type='text' size='25' maxlength='31'></td></tr></table>" +
      " <br><br><span id='username_validation_result' style='display:none;'></span><br><br>" +
      "<div id='fc-signin2'></div><br>";
  }

  // Reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(message);
  const stored_username = simpleStorage.get("username", "");
  if (stored_username != null && stored_username != false) {
    $("#username_req").val(stored_username);
  }

  $("#dialog").attr("title", title);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "80%" : "60%",
			beforeClose: function( event: any, ui: any ) {
			  // If intro dialog is closed,
                          // then check the username and connect to the server.
			  if (dialog_close_trigger != "button") {
			    if (validate_username()) {
			      network_init();
			      if (!is_touch_device()) $("#pregame_text_input").focus();
			      return true;
			    } else {
			      return false;
			    }
			  }
			},
			buttons: []

		});

  if (is_small_screen()) {
    /* Some fixes for pregame screen on small devices.*/
    $("#freeciv_logo").remove();
    $("#pregame_message_area").css("width", "73%");
    $("#observe_button").remove();
  }

  $("#dialog").dialog('open');

  blur_input_on_touchdevice();

  google_user_token = null;
  gapi.signin2.render('fc-signin2', {
        'scope': 'profile email',
        'width': 240,
        'height': 50,
        'onsuccess': google_signin_on_success,
        'onfailure': google_signin_on_failure
      });

}

/**************************************************************************
  Validate username callback
**************************************************************************/
export function validate_username_callback(): void
{
  const check_username = $("#username_req").val();
  $.ajax({
   type: 'POST',
   url: "/validate_user?userstring=" + check_username,
   success: function(data: string, textStatus: string, request: JQuery.jqXHR){
      if (data == "user_does_not_exist") {
        if (is_longturn()) {
          show_new_user_account_dialog();
          return;
        }

        if (validate_username()) {
          network_init();
          if (!is_touch_device()) $("#pregame_text_input").focus();
          $("#dialog").dialog('close');
          $("#password_req").val("");
          simpleStorage.set("password", "");
        }
      } else {
        username = sanitize_username($("#username_req").val());
        let password = $("#password_req").val();
        if (password == null) {
          const stored_password = simpleStorage.get("password", "");
          if (stored_password != null && stored_password != false) {
            password = stored_password;
          }
        }

        if (password != null && password.length > 2) {
          const shaObj = new jsSHA("SHA-512", "TEXT");
          shaObj.update(password);
          const sha_password = encodeURIComponent(shaObj.getHash("HEX"));

          $.ajax({
           type: 'POST',
           url: "/login_user?username=" + encodeURIComponent(username) + "&sha_password=" + sha_password,
           success: function(data: string, textStatus: string, request: JQuery.jqXHR){
               if (data != null && data == "OK") {
                 simpleStorage.set("username", username);
                 simpleStorage.set("password", password);
                 /* Login OK! */
                 if (validate_username()) {
                   network_init();
                   if (!is_touch_device()) $("#pregame_text_input").focus();
                   $("#dialog").dialog('close');
                 }
                 logged_in_with_password = true;
               } else {
                 $("#username_validation_result").html("Incorrect username or password. Please try again!");
                 $("#username_validation_result").show();
               }

             },
           error: function (request: JQuery.jqXHR, textStatus: string, errorThrown: string) {
             swal("Login user failed.");
           }
          });
        } else {
          $("#username_validation_result").html("Player name already in use. Try a different player name, or enter the username and password of your account,<br> or create a new user account. <a class='pwd_reset' href='#' style='color: #bbbbbb;'>Forgot password?</a>");
          $("#username_validation_result").show();
        }

        $("#password_row").show();
        $("#password_req").focus();
        $("#password_td").html("<input id='password_req' type='password' size='25' maxlength='200'>  &nbsp; <a class='pwd_reset' href='#' style='color: #666666;'>Forgot password?</a>");
        $(".pwd_reset").click(forgot_pbem_password);
      }
    },
   error: function (request: JQuery.jqXHR, textStatus: string, errorThrown: string) {
     console.log("For programmers and server admins: "
                 + "Please check if the meta server is running properly.");
     swal("Error. Please try again with a different name.");
   }
  });

}

/**************************************************************************
 Shows the create new user account with password dialog.
**************************************************************************/
export function show_new_user_account_dialog(gametype?: string): void
{

  const title = "New user account";
  const message = "Create a new XBWorld user account with information about yourself:<br><br>"
                + "<table><tr><td>Username:</td><td><input id='username' type='text' size='25' maxlength='30' onkeyup='return forceLower(this);'></td></tr>"
                + "<tr><td>Email:</td><td><input id='email' type='email' size='25' maxlength='64' ></td></tr>"
                + "<tr><td>Password:</td><td><input id='password' type='password' size='25'></td></tr>"
                + "<tr><td>Confim password:</td><td><input id='confirm_password' type='password' size='25'></td></tr></table><br>"
                + "<div id='username_validation_result' style='display:none;'></div><br>"
                + "Remember your username and password, since you will need this to log in later.<br><br>"
                + (captcha_site_key != '' ? "Click to accept captcha to show that you are real human player:<br>" : "")
                + "<div id='captcha_element'></div><br><br>"
                + "<div><small><ul><li>It is free and safe to create a new account on XBWorld.</li>"
                + "<li>A user account allows you to save and load games.</li>"
                + "<li>Other players can use your username to start Play-by-email games with you.</li>"
                + "<li>You will not receive any spam and your e-mail address will be kept safe. Your password is stored securely as a secure hash.</li>"
                + "<li>You can <a href='#' onclick='javascript:close_pbem_account();' style='color: black;'>cancel</a> your account at any time if you want.</li>"
                + "</ul></small></div>";

  // Reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(message);
  $("#dialog").attr("title", title);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "60%",
			buttons:
			{
                "Cancel" : function() {
                    if (gametype == "pbem") {
                      show_pbem_dialog();
                    } else {
	                  init_common_intro_dialog();
	                }
				},
				"Signup new user" : function() {
				    if (gametype == "pbem") {
				      create_new_freeciv_user_account_request("pbem");
				    } else {
				      create_new_freeciv_user_account_request("normal");
				    }

				}
			}
		});

  $("#dialog").dialog('open');

  if (captcha_site_key != '') {
    if (grecaptcha !== undefined && grecaptcha != null) {
      $('#captcha_element').html('');
      grecaptcha.render('captcha_element', {
            'sitekey' : captcha_site_key
          });
    } else {
      swal("Captcha not available. This could be caused by a browser plugin.");
    }
  }

  $("#username").blur(function() {
   $.ajax({
     type: 'POST',
     url: "/validate_user?userstring=" + $("#username").val(),
     success: function(data: string, textStatus: string, request: JQuery.jqXHR) {
        if (data != "user_does_not_exist") {
          $("#username_validation_result").html("The username is already taken. Please choose another username.");
          $("#username_validation_result").show();
          $(".ui-dialog-buttonset button").button("disable");
        } else {
          $("#email").blur(function() {
          $.ajax({
            type: 'POST',
            url: "/validate_user?userstring=" + $("#email").val(),
            success: function(data: string, textStatus: string, request: JQuery.jqXHR) {
               if (data == "invitation") {
                 $("#username_validation_result").html("");
                 $("#username_validation_result").hide();
                 $(".ui-dialog-buttonset button").button("enable");
               } else {
                 $("#username_validation_result").html("The e-mail is already registered. Please choose another.");
                 $("#username_validation_result").show();
                 $(".ui-dialog-buttonset button").button("disable");

               }
             }
           });
         });
        }
      }
    });
  });
}

/**************************************************************************
  This will try to create a new Freeciv-web user account with password.
**************************************************************************/
export function create_new_freeciv_user_account_request(action_type: string): boolean
{
  username = sanitize_username($("#username").val()).toLowerCase();
  const password = $("#password").val().trim();
  const confirm_password = $("#confirm_password").val().trim();
  const email = $("#email").val().trim();
  const captcha = $("#g-recaptcha-response").val();

  $("#username_validation_result").show();
  if (!is_username_valid_show(
