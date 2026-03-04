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
declare const nations: any;
import { canPlayerGetGov as can_player_get_gov } from "../data/government";
import { send_request } from "../net/connection";
import { packet_player_change_government, packet_report_req } from "../net/packetConstants";
import { clientIsObserver as client_is_observer } from "../client/clientState";
import { isSmallScreen as is_small_screen } from "../utils/helpers";

export let governments: any = {};
export let requested_gov: number = -1;

export const REPORT_WONDERS_OF_THE_WORLD: number = 0;
export const REPORT_WONDERS_OF_THE_WORLD_LONG: number = 1;
export const REPORT_TOP_CITIES: number = 2;
export const REPORT_DEMOGRAPHIC: number = 3;
export const REPORT_ACHIEVEMENTS: number = 4;

/**************************************************************************
   ...
**************************************************************************/

export function show_revolution_dialog(): void {
  const id = "#revolution_dialog";
  $(id).remove();
  $("<div id='revolution_dialog'></div>").appendTo("div#game_page");

  if (client.conn.playing == null) return;

  const dhtml: string = "Current form of government: " + governments[client.conn.playing['government']]['name']
    + "<br>To start a revolution, select the new form of government:"
    + "<p><div id='governments' >"
    + "<div id='governments_list'>"
    + "</div></div><br> ";

  $(id).html(dhtml);

  $(id).attr("title", "Start a Revolution!");
  $(id).dialog({
    bgiframe: true,
    modal: true,
    width: is_small_screen() ? "99%" : "450",
    height: is_small_screen() ? $(window).height() - 40 : 600,
    buttons: {
      "Start revolution!": function () {
        start_revolution();
        $("#revolution_dialog").dialog('close');
      }
    }
  });

  update_govt_dialog();
}

export function init_civ_dialog(): void {
  if (!client_is_observer() && client.conn.playing != null) {

    const pplayer: any = client.conn.playing;
    const pnation: any = nations[pplayer['nation']];
    const tag: string = pnation['graphic_str'];

    let civ_description: string = "";
    if (!pnation['customized']) {
      civ_description += "<img src='/images/flags/" + tag + "-web" + get_tileset_file_extention() + "' width='180'>";
    }

    civ_description += "<br><div>" + pplayer['name'] + " rules the " + nations[pplayer['nation']]['adjective']
      + " with the form of government: " + governments[client.conn.playing['government']]['name']
      + "</div><br>";
    $("#nation_title").html("The " + nations[pplayer['nation']]['adjective'] + " nation");
    $("#civ_dialog_text").html(civ_description);

  } else {
    $("#civ_dialog_text").html("This dialog isn't available as observer.");
  }
}

export function update_govt_dialog(): void {
  let govt: any;
  let govt_id: string | number;
  if (client_is_observer()) return;

  let governments_list_html: string = "";

  for (govt_id in governments) {
    govt = governments[govt_id];
    governments_list_html += "<button class='govt_button' id='govt_id_" + govt['id'] + "' "
      + "onclick='set_req_government(" + govt['id'] + ");' "
      + "title='" + govt['helptext'] + "'>" + govt['name'] + "</button>";
  }

  $("#governments_list").html(governments_list_html);

  for (govt_id in governments) {
    govt = governments[govt_id];
    if (!can_player_get_gov(govt_id)) {
      $("#govt_id_" + govt['id']).button({ disabled: true, label: govt['name'], icons: { primary: govt['rule_name'] } });
    } else if (requested_gov == govt_id) {
      $("#govt_id_" + govt['id']).button({ label: govt['name'], icons: { primary: govt['rule_name'] } }).css("background", "green");
    } else if (client.conn.playing['government'] == govt_id) {
      $("#govt_id_" + govt['id']).button({ label: govt['name'], icons: { primary: govt['rule_name'] } }).css("background", "#BBBBFF").css("font-weight", "bolder");
    } else {
      $("#govt_id_" + govt['id']).button({ label: govt['name'], icons: { primary: govt['rule_name'] } });
    }
  }
  $(".govt_button").tooltip();
}

export function start_revolution(): void {
  if (requested_gov != -1) {
    send_player_change_government(requested_gov);
    requested_gov = -1;
  }
}

export function set_req_government(gov_id: number): void {
  requested_gov = gov_id;
  update_govt_dialog();
}

export function send_player_change_government(govt_id: number): void {
  const packet: any = { "pid": packet_player_change_government, "government": govt_id };
  send_request(JSON.stringify(packet));
}

export function request_report(rtype: number): void {
  const packet: any = { "pid": packet_report_req, "type": rtype };
  send_request(JSON.stringify(packet));
}

function get_tileset_file_extention(): string {
  // Placeholder function to avoid TS error, as it was used in init_civ_dialog but not defined in original code.
  // The original JS code calls get_tileset_file_extention(), so we keep it here as any.
  return "";
}
