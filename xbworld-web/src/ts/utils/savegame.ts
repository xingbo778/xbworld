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
declare const jsSHA: any;
declare const username: string;
declare const logged_in_with_password: boolean;
declare const keyboard_input: boolean;
declare const send_message: (msg: string) => void;
declare const is_small_screen: () => boolean;
declare const is_pbem: () => boolean;
declare const message_log: any;
declare const E_SCRIPT: any;
declare const E_LOG_ERROR: any;
declare const client_state: () => any;
declare const C_S_RUNNING: any;
declare const $.blockUI: () => void;
declare const $.unblockUI: () => void;
declare const wait_for_text: (text: string, callback: () => void) => void;
declare const players: any[];
declare const metamessage_changed: boolean;
declare const loaded_game_type: string;
declare const hotseat_enabled: boolean;
declare const show_map_from_image_dialog: () => void;
declare const $id: (id: string) => any;
declare const $.getUrlVar: (name: string) => string | undefined;

export let saved_this_turn: boolean = false;
export let game_loaded: boolean = false;

export const scenarios: {img: string; description: string; savegame: string;}[] = [
  {"img":"/images/world_small.png", "description":"The World - Small world map, 80x50 map of the Earth", "savegame":"earth-small"},
  {"img":"/images/world_big.png", "description":"The World - Large world map, 160x90 map of the Earth", "savegame":"earth-large"},
  {"img":"/images/iberian.png", "description":"Iberian Peninsula - 136x100 map of Spain and Portugal", "savegame":"iberian-peninsula"},
  {"img":"/images/france.png", "description":"France - Large (140x90)", "savegame":"france"},
  {"img":"/images/japan.png", "description":"Japan - Medium (88x100)", "savegame":"japan"},
  {"img":"/images/italy.png", "description":"Italy - Medium (100x100)", "savegame":"italy"},
  {"img":"/images/america.png", "description":"North America - 116x100 map of North America", "savegame":"north_america"},
  {"img":"/images/british.png", "description":"British Aisles - Medium (85x80)", "savegame":"british-isles"},
  {"img":"/images/hagworld.png", "description":"The World - Classic-style 120x60 map of the Earth", "savegame":"hagworld"},
  {"img":"/images/europe.png", "description":"Very large map of Europe, 200x100", "savegame":"europe"}
];

export let scenario_info: any = null;
export let scenario_activated: boolean = false;
export let loadTimerId: number = -1;


/****************************************************************************
  Shows the save game dialog.
****************************************************************************/
export function save_game(): void
{

  if (saved_this_turn) {
    swal("You have already saved this turn, and you can only save once every turn each game-session.");
    return;
  }
  // reset dialog page.
  $("#save_dialog").remove();
  $("<div id='save_dialog'></div>").appendTo("div#game_page");

  let dhtml: string = "<span id='settings_info'><i>You can save your current game here. "
    + "Savegames are stored on the server, and deleted after 365 days. You can save once every turn in each game session.</i></span>";

  if (!logged_in_with_password) {
    dhtml += "<br><br>Warning: You have not logged in using a user account with password. Please "
    + "create a new user account with password next time you want save, so you are sure"
    + " you can load the savegame with a username and password. <a href='/webclient/?action=new&amp;type=singleplayer'>Click here</a> "
    + "to start a new game, then click on the \"New User Account\" button to create a new account.<br>";
  }

  $("#save_dialog").html(dhtml);
  $("#save_dialog").attr("title", "Save game");
  $("#save_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "40%",
			close : function(){
			  keyboard_input = true;
                        },
			buttons: {
				"Save Game": function() {
					$("#save_dialog").dialog('close');
					send_message("/save");
					swal("Game saved.");
					}
				}
			});

  if (is_pbem()) {
    swal("Play-By-Email games can not be saved. Please use the end turn button.");
    return;
  }

  $("#save_dialog").dialog('open');
  saved_this_turn = true;
}

/**************************************************************************
 Press Ctrl-S to quickly save the game.
**************************************************************************/
export function quicksave(): void
{
  if (is_pbem()) {
    swal("Play-By-Email games can not be saved. Please use the end turn button.");
    return;
  }

  if (saved_this_turn) {
    swal("You have already saved this turn, and you can only save once every turn each game-session.");
    return;
  }

  send_message("/save");
  message_log.update({
    event: E_SCRIPT,
    message: "Game saved."
  });
  saved_this_turn = true;

}



/**************************************************************************
 Prepare Load game dialog
**************************************************************************/
export function show_load_game_dialog(): void
{
 $.ajax({
   type: 'POST',
   url: "/listsavegames?username=" + username,
   success: function(data: any, textStatus: string, request: any){
                show_load_game_dialog_cb(data);
   },
   error: function (request: any, textStatus: string, errorThrown: any) {
     swal("Loading game failed (listsavegames failed)");
   }
  });
}

/**************************************************************************
 Show Load game dialog
**************************************************************************/
export function show_load_game_dialog_cb(savegames_data: any): void
{
  let saveHtml: string[] = [];

  if (savegames_data != null && savegames_data.length >= 3) {
    const savegames: string[] = savegames_data.split(";");
    for (let i = 0; i < savegames.length; i++) {
        if (savegames[i].length > 2) {
          saveHtml.push("<li class='ui-widget-content'>" + savegames[i] + "</li>");
        }
    }
  }

  if (saveHtml.length == 0) {
    show_scenario_dialog();
    return;
  }

  let saveHtmlStr: string = "<ul id='selectable' style='height: 95%;'>" + saveHtml.join('')
           + "</ul><br>";

  let dialog_buttons: any = {};

  if (C_S_RUNNING != client_state()) {
    dialog_buttons = $.extend(dialog_buttons,
     {"Load Savegame": function() {
		  const load_game_id = $('#selectable .ui-selected').index();
		  if (load_game_id == -1) {
		    swal("Unable to load savegame: no game selected.");
		  } else if ($('#selectable .ui-selected').text() != null){
            send_message("/load " + $('#selectable .ui-selected').text());
            game_loaded = true;

		    $("#dialog").dialog('close');
		    $("#game_text_input").blur();
		  }
    }});
    const stored_password = simpleStorage.get("password", "");
    if (stored_password != null && stored_password != false) {
      dialog_buttons = $.extend(dialog_buttons, {
    "Delete ALL" : function() {
            let r: boolean;
            if ('confirm' in window) {
             r = confirm("Do you really want to delete all your savegames?");
            } else {
             r = true;
            }
            if (r == true) {
              delete_all_savegames();
		      $("#dialog").dialog('close');
		      setTimeout(show_scenario_dialog, 1000);
		    }
    },

    "Delete" : function() {
      const load_game_id = $('#selectable .ui-selected').index();
      if (load_game_id != -1) {
      $('#selectable .ui-selected').each(function () {
         const $this = $(this);
         if ($this.length) {
          delete_savegame($this.text());
         }
      });
      }
      $('#selectable .ui-selected').remove();
    }
    });
    }
    dialog_buttons = $.extend(dialog_buttons, {
     "Load Scenarios...": function() {
		  $("#dialog").dialog('close');
		  $("#game_text_input").blur();
		  show_scenario_dialog();
    }
    });
  }


  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(saveHtmlStr);
  $("#dialog").attr("title", "Resume playing a saved game");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "50%",
			height: is_small_screen() ? $(window).height() - 20 : $(window).height() - 80,
			buttons: dialog_buttons
		});

  $("#selectable li").first().addClass('ui-selected');

  if (!is_touch_device()) {
    $("#selectable").selectable();
  } else {
    $("#selectable").on("click", "li", function (ev: any) {
      ev.stopPropagation();
      const item = $(this);
      item.siblings().removeClass('ui-selected');
      item.addClass('ui-selected');
    });
  }

  $("#dialog").dialog('open');
  $("#game_text_input").blur();


  $('.ui-dialog-buttonpane button').eq(0).focus();

}

/**************************************************************************
 Deletes a savegame
**************************************************************************/
export function delete_savegame(filename: string): void
{
  const stored_password = simpleStorage.get("password", "");
  if (stored_password != null && stored_password != false) {
    const shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.update(stored_password);
    const sha_password = encodeURIComponent(shaObj.getHash("HEX"));

    $.ajax({
     type: 'POST',
     url: "/deletesavegame?username=" + encodeURIComponent(username) + "&savegame=" + encodeURIComponent(filename)
     + "&sha_password=" + sha_password
    });
  }
}


/**************************************************************************
 Deletes all savegames
**************************************************************************/
export function delete_all_savegames(): void
{
  const stored_password = simpleStorage.get("password", "");
  if (stored_password != null && stored_password != false) {
    const shaObj = new jsSHA("SHA-512", "TEXT");
    shaObj.update(stored_password);
    const sha_password = encodeURIComponent(shaObj.getHash("HEX"));

    $.ajax({
     type: 'POST',
     url: "/deletesavegame?username=" + encodeURIComponent(username) + "&savegame=ALL"
     + "&sha_password=" + sha_password
    });
  }
}

/**************************************************************************
 Send a load game command, if requested by user.
 uses HTML5 local storage.
**************************************************************************/
export function load_game_check(): void
{
  const load_game_id: number = $('#selectable .ui-selected').index();
  const scenario: string | undefined = $.getUrlVar('scenario');

  if ($.getUrlVar('load') == "tutorial") {
    $.blockUI();
    wait_for_text("You are logged in as", function () {
      load_game_real('tutorial');
    });
    wait_for_text("Load complete", load_game_toggle);
  } else if ($.getUrlVar('action') == "earthload") {
    $.blockUI();
    let savegame_earth_file: string = $.getUrlVar('savegame') || "";
    savegame_earth_file = savegame_earth_file.replace("#", "");
    wait_for_text("You are logged in as", function () {
      load_game_real(savegame_earth_file);
    });
    wait_for_text("Load complete", load_game_toggle);

  } else if (load_game_id != -1) {
    $.blockUI();

    if (scenario == "true" || scenario_activated) {
      if (load_game_id == -1) {
        show_scenario_dialog();
      } else {
        const scenario_game_id: string = scenarios[load_game_id]['savegame'];
        wait_for_text("You are logged in as", function () {
          load_game_real(scenario_game_id);
        });
        wait_for_text("Load complete", load_game_toggle);
      }
    }
  } else if (scenario == "true" && $.getUrlVar('load') != "tutorial") {
    show_scenario_dialog();
  } else if ($.getUrlVar('action') == "load") {
    show_load_game_dialog();
  }

}


/**************************************************************************
 Send a load game command, if requested by user.
**************************************************************************/
export function load_game_real(filename: string): void
{
      console.log("Server command: /load " + filename );
      send_message("/load " + filename);
      $.unblockUI();
      game_loaded = true;
}


/**************************************************************************
...
**************************************************************************/
export function set_metamessage_on_loaded_game(game_type: string): void
{
  if (game_type == "multi") {
    metamessage_changed = true;
    send_message("/metamessage Multiplayer game loaded by " + username);
    loaded_game_type = game_type;
  } else if (game_type == "hotseat") {
    hotseat_enabled = true;
    loaded_game_type = game_type;
  }

}


/**************************************************************************
 Aitoggle and take first player.
**************************************************************************/
export function load_game_toggle(): void
{

  send_message("/set nationset all");

  if (players == null || players[0] == null) {
    message_log.update({
      event: E_LOG_ERROR,
      message: "Error: Unable to aitoggle and take your player. Try reloading the page."
    });
    $.unblockUI();
    return;
  }
    
  const firstplayer: string = players[0]['name'].split(" ")[0];

  if ($.getUrlVar('scenario') == "true" || scenario_activated) {
    send_message("/set aifill 6");
  }

  send_message("/aitoggle " + firstplayer);
  send_message("/take " + firstplayer);
  $.unblockUI();


}




/**************************************************************************
 Show the select scenario dialog.
**************************************************************************/
export function show_scenario_dialog(): void
{

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");
  $.unblockUI();

  let saveHtml: string =  "<ol id='selectable'>";
    for (let i = 0; i < scenarios.length; i++) {
      saveHtml += "<li class='ui-widget-content'><img border='0' src='" + scenarios[i]['img']
	       +  "' style='padding: 4px;' ><br>" + scenarios[i]['description'] + "</li>";
    }

  saveHtml += "</ol>";

  $("#dialog").html(saveHtml);
  $("#dialog").attr("title", "Select a scenario to play:");
  $("#selectable").css("height", $(window).height() - 180);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "40%",
			position: {my: 'center bottom', at: 'center bottom', of: window},
			buttons: {
                                "Cancel" : function() {
					$("#dialog").dialog('close');
                                },
                                "Create map from image upload.." : function() {
                                  $("#dialog").dialog('close');
                                  show_map_from_image_dialog();
                                },
	  			"Select scenario": function() {
	  			    if ($('#selectable .ui-selected').index() == -1) {
	  			        swal("Please select a scenario first.");
	  			    } else {
                        scenario_activated = true;
                        load_game_check();
                        $("#dialog").dialog('close');
                        $("#game_text_input").blur();
					}
				}
			}
		});
  $("#selectable").selectable();
  $("#dialog").dialog('open');
  $("#game_text_input").blur();

}

function is_touch_device(): boolean {
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
}
