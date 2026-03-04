import { store } from '../data/store';
import { playerInventionState as player_invention_state, techIdByName as tech_id_by_name, TECH_KNOWN, TECH_UNKNOWN, TECH_PREREQS_KNOWN } from '../data/tech';
import { getCurrentBulbsOutput as get_current_bulbs_output, getCurrentBulbsOutputText as get_current_bulbs_output_text } from '../data/tech';
import { update_net_bulbs } from '../ui/rates';
import { tileset_tech_graphic_tag, tileset_unit_type_graphic_tag, tileset_building_graphic_tag } from '../renderer/tilespec';
import { tileset_name } from '../renderer/tilesetConfig';
declare const tileset: any;
declare const get_tileset_file_extention: any;
import { mapview_put_tile } from '../renderer/mapview';
import { send_request as sendRequest } from '../net/connection';
import { packet_player_research, packet_player_tech_goal } from '../net/packetConstants';
import { clientState as client_state, C_S_RUNNING } from '../client/clientState';
import { clientIsObserver as client_is_observer } from '../client/clientState';
declare const client: any;
import { isSmallScreen as is_small_screen } from '../utils/helpers';
import { isPbem as is_pbem } from '../client/clientCore';
import { move_points_text } from '../data/unit';
declare const get_pbem_game_key: any;
declare const pbem_phase_ended: any;
declare const EventAggregator: any;
declare const unit_types: any;
declare const improvements: any;
declare const nations: any;
import { research_get } from '../data/player';
declare const players: any;


declare const $: any;
declare const reqtree: any; // Assuming reqtree is globally available or imported from somewhere
declare const reqtree_civ2civ3: any;
declare const reqtree_multiplayer: any;
declare const freeciv_wiki_docs: any;
declare const simpleStorage: any;
declare const mouse_x: any;
declare const mouse_y: any;
declare const sprites: any;
declare const ts: any; // timestamp for cache busting

export const techs: { [key: string]: any } = {};
export const techcoststyle1: { [key: string]: any } = {};

export let tech_canvas_text_font: string = "18px Arial";

export let is_tech_tree_init: boolean = false;
export let tech_dialog_active: boolean = false;

export const tech_xscale: number = 1.2;
export const wikipedia_url: string = "http://en.wikipedia.org/wiki/";

/* TECH_KNOWN is self-explanatory, TECH_PREREQS_KNOWN are those for which all
 * requirements are fulfilled; all others (including those which can never
 * be reached) are TECH_UNKNOWN */
export const TECH_UNKNOWN: number = 0;
export const TECH_PREREQS_KNOWN: number = 1;
export const TECH_KNOWN: number = 2;

export const AR_ONE: number = 0;
export const AR_TWO: number = 1;
export const AR_ROOT: number = 2;
export const AR_SIZE: number = 3;


export const TF_BONUS_TECH: number = 0; /* player gets extra tech if rearched first */
export const TF_BRIDGE: number = 1;    /* "Settler" unit types can build bridges over rivers */
export const TF_RAILROAD: number = 2;  /* "Settler" unit types can build rail roads */
export const TF_POPULATION_POLLUTION_INC: number = 3;  /* Increase the pollution factor created by population by one */
export const TF_FARMLAND: number = 4;  /* "Settler" unit types can build farmland */
export const TF_BUILD_AIRBORNE: number = 5; /* Player can build air units */
export const TF_LAST: number = 6;

/*
  [kept for amusement and posterity]
typedef int Tech_type_id;
  Above typedef replaces old "enum tech_type_id"; see comments about
  Unit_type_id in unit.h, since mainly apply here too, except don't
  use Tech_type_id very widely, and don't use (-1) flag values. (?)
*/
/* [more accurately]
 * Unlike most other indices, the Tech_type_id is widely used, because it
 * so frequently passed to packet and scripting.  The client menu routines
 * sometimes add and substract these numbers.
 */
export const A_NONE: number = 0;
export const A_FIRST: number = 1;
export const MAX_NUM_ADVANCES: number = 1000; // Assuming a reasonable max value
export const A_LAST: number = (MAX_NUM_ADVANCES + 1);
export const A_FUTURE: number = (A_LAST + 1);
export const A_UNSET: number = (A_LAST + 2);
export const A_UNKNOWN: number = (A_LAST + 3);
export const A_LAST_REAL: number = A_UNKNOWN;

export const A_NEVER: null = null;

export let tech_canvas: HTMLCanvasElement | null = null;
export let tech_canvas_ctx: CanvasRenderingContext2D | null = null;

export const tech_item_width: number = 208;
export const tech_item_height: number = 52;
export let maxleft: number = 0;
export let clicked_tech_id: number | null = null;

export const bulbs_output_updater: EventAggregator = new EventAggregator(update_bulbs_output_info, 250,
                                               EventAggregator.DP_NONE,
                                               250, 3, 250);

/**************************************************************************
  Returns state of the tech for current pplayer.
  This can be: TECH_KNOWN, TECH_UNKNOWN, or TECH_PREREQS_KNOWN
  Should be called with existing techs or A_FUTURE

  If pplayer is NULL this checks whether any player knows the tech (used
  by the client).
**************************************************************************/

export function init_tech_screen(): void {
  if (is_small_screen()) tech_canvas_text_font = "20px Arial";
  $("#technologies").width($(window).width() - 20);
  $("#technologies").height($(window).height() - $("#technologies").offset().top - 15);

  if (is_tech_tree_init) return;

  // Assuming ruleset_control is globally available or imported
  // if (ruleset_control['name'] == "Civ2Civ3 ruleset") reqtree = reqtree_civ2civ3;
  // if (ruleset_control['name'] == "Multiplayer ruleset") reqtree = reqtree_multiplayer;
  // if (ruleset_control['name'] == "Longturn-Web-X ruleset") reqtree = reqtree_multiplayer;

  tech_canvas = document.getElementById('tech_canvas') as HTMLCanvasElement;
  if (tech_canvas == null) {
    console.log("unable to find tech canvas.");
    return;
  }
  tech_canvas_ctx = tech_canvas.getContext("2d");
  if (tech_canvas_ctx && "imageSmoothingEnabled" in tech_canvas_ctx) {
    // if this Boolean value is false, images won't be smoothed when scaled. This property is true by default.
    tech_canvas_ctx.imageSmoothingEnabled = false;
  }

  let max_width: number = 0;
  let max_height: number = 0;
  for (let tech_id in techs) {
    if (!(tech_id + '' in reqtree) || reqtree[tech_id + ''] == null) {
      continue;
    }
    let x: number = reqtree[tech_id + '']['x'];
    let y: number = reqtree[tech_id + '']['y'];
    if (x > max_width) max_width = x;
    if (y > max_height) max_height = y;
  }

  tech_canvas.width = (max_width + tech_item_width) * tech_xscale;
  tech_canvas.height = max_height + tech_item_height;

  if (is_small_screen()) {
    tech_canvas.width = Math.floor(tech_canvas.width * 0.6);
    tech_canvas.height = Math.floor(tech_canvas.height * 0.6);
    if (tech_canvas_ctx) {
      tech_canvas_ctx.scale(0.6, 0.6);
    }
    $("#tech_result_text").css("font-size", "85%");
    $("#tech_color_help").css("font-size", "65%");
    $("#tech_progress_box").css("padding-left", "10px");
  }

  is_tech_tree_init = true;
  clicked_tech_id = null;
}

export function update_tech_tree(): void {
  if (!tech_canvas_ctx) return;

  const hy: number = 24;
  const hx: number = 48 + 160;

  tech_canvas_ctx.clearRect(0, 0, 5824, 726);

  for (let tech_id in techs) {
    const ptech = techs[tech_id];
    if (!(tech_id + '' in reqtree) || reqtree[tech_id + ''] == null) {
      continue;
    }

    const sx: number = Math.floor(reqtree[tech_id + '']['x'] * tech_xscale);  //scale in X direction.
    const sy: number = reqtree[tech_id + '']['y'];
    for (let i: number = 0; i < ptech['research_reqs'].length; i++) {
      const rid: number = ptech['research_reqs'][i]['value'];
      if (rid == 0 || reqtree[rid + ''] == null) continue;

      const dx: number = Math.floor(reqtree[rid + '']['x'] * tech_xscale);  //scale in X direction.
      const dy: number = reqtree[rid + '']['y'];

      tech_canvas_ctx.strokeStyle = 'rgba(70, 70, 70, 0.8)';
      tech_canvas_ctx.lineWidth = 3;

      tech_canvas_ctx.beginPath();
      tech_canvas_ctx.moveTo(sx, sy + hy);
      tech_canvas_ctx.lineTo(dx + hx, dy + hy);
      tech_canvas_ctx.stroke();
    }
  }

  tech_canvas_ctx.lineWidth = 1;

  for (let tech_id in techs) {
    const ptech = techs[tech_id];
    if (!(tech_id + '' in reqtree) || reqtree[tech_id + ''] == null) {
      console.log("tech not found");
      continue;
    }

    const x: number = Math.floor(reqtree[tech_id + '']['x'] * tech_xscale) + 2;  //scale in X direction.
    const y: number = reqtree[tech_id + '']['y'] + 2;

    /* KNOWN TECHNOLOGY */
    if (player_invention_state(client.conn.playing, ptech['id']) == TECH_KNOWN) {

      const tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.fillStyle = 'rgb(255, 255, 255)';
      tech_canvas_ctx.fillRect(x - 2, y - 2, tech_item_width, tech_item_height);
      tech_canvas_ctx.strokeStyle = 'rgb(225, 225, 225)';
      tech_canvas_ctx.strokeRect(x - 2, y - 2, tech_item_width, tech_item_height);
      mapview_put_tile(tech_canvas_ctx, tag, x + 1, y);

      tech_canvas_ctx.font = tech_canvas_text_font;
      tech_canvas_ctx.fillStyle = "rgba(0, 0, 0, 1)";
      tech_canvas_ctx.fillText(ptech['name'], x + 50, y + 15);

      if (x > maxleft) maxleft = x;


      /* TECH WITH KNOWN PREREQS. */
    } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
      let bgcolor: string = (client.conn.playing != null && is_tech_req_for_goal(ptech['id'], client.conn.playing['tech_goal'])) ? "rgb(131, 170, 101)" : "rgb(91, 130, 61)";
      if (client.conn.playing['researching'] == ptech['id']) {
        bgcolor = "rgb(161, 200, 131)";
        tech_canvas_ctx.lineWidth = 6;
      }

      const tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.lineWidth = 4;
      tech_canvas_ctx.fillStyle = bgcolor;
      tech_canvas_ctx.fillRect(x - 2, y - 2, tech_item_width, tech_item_height);
      tech_canvas_ctx.strokeStyle = 'rgb(255, 255, 255)';
      tech_canvas_ctx.strokeRect(x - 2, y - 2, tech_item_width, tech_item_height);
      tech_canvas_ctx.lineWidth = 2;
      mapview_put_tile(tech_canvas_ctx, tag, x + 1, y);

      if (client.conn.playing['researching'] == ptech['id']) {
        tech_canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
        tech_canvas_ctx.font = "Bold " + tech_canvas_text_font;
      } else {
        tech_canvas_ctx.font = tech_canvas_text_font;
        tech_canvas_ctx.fillStyle = 'rgb(255, 255, 255)';
      }
      tech_canvas_ctx.fillText(ptech['name'], x + 51, y + 16);

      /* UNKNOWN TECHNOLOGY. */
    } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
      let bgcolor: string = (client.conn.playing != null && is_tech_req_for_goal(ptech['id'], client.conn.playing['tech_goal'])) ? "rgb(111, 141, 180)" : "rgb(61, 95, 130)";
      if (client.conn.playing['tech_goal'] == ptech['id']) {
        tech_canvas_ctx.lineWidth = 6;
      }

      const tag = tileset_tech_graphic_tag(ptech);
      tech_canvas_ctx.fillStyle = bgcolor;
      tech_canvas_ctx.fillRect(x - 2, y - 2, tech_item_width, tech_item_height);
      tech_canvas_ctx.strokeStyle = 'rgb(255, 255, 255)';
      tech_canvas_ctx.strokeRect(x - 2, y - 2, tech_item_width, tech_item_height);
      tech_canvas_ctx.lineWidth = 2;
      mapview_put_tile(tech_canvas_ctx, tag, x + 1, y);

      if (client.conn.playing['tech_goal'] == ptech['id']) {
        tech_canvas_ctx.fillStyle = 'rgb(0, 0, 0)';
        tech_canvas_ctx.font = "Bold " + tech_canvas_text_font;
      } else {
        tech_canvas_ctx.fillStyle = 'rgb(255, 255, 255)';
        tech_canvas_ctx.font = tech_canvas_text_font;
      }
      tech_canvas_ctx.fillText(ptech['name'], x + 51, y + 16);
    }

    let tech_things: number = 0;
    const prunits = get_units_from_tech(tech_id);
    for (let i: number = 0; i < prunits.length; i++) {
      const utype = prunits[i];
      const sprite = sprites[tileset_unit_type_graphic_tag(utype)];
      if (sprite != null) {
        tech_canvas_ctx.drawImage(sprite, x + 50 + ((tech_things++) * 30), y + 23, 28, 24);
      }
    }

    const primprovements = get_improvements_from_tech(tech_id);
    for (let i: number = 0; i < primprovements.length; i++) {
      const pimpr = primprovements[i];
      const sprite = sprites[tileset_building_graphic_tag(pimpr)];
      if (sprite != null) {
        tech_canvas_ctx.drawImage(sprite, x + 50 + ((tech_things++) * 30), y + 23, 28, 24);
      }
    }
  }
}

export function update_tech_screen(): void {

  if (client_is_observer() || client.conn.playing == null) {
    show_observer_tech_dialog();
    return;
  }

  init_tech_screen();
  update_tech_tree();


  let research_goal_text: string = "No research target selected.<br>Please select a technology now";
  if (techs[client.conn.playing['researching']] != null) {
    research_goal_text = "Researching: " + techs[client.conn.playing['researching']]['name'];
  }
  if (techs[client.conn.playing['tech_goal']] != null) {
    research_goal_text = research_goal_text + "<br>Research Goal: "
      + techs[client.conn.playing['tech_goal']]['name'];
  }
  $("#tech_goal_box").html(research_goal_text);

  $("#tech_progress_text").html("Research progress: "
    + client.conn.playing['bulbs_researched']
    + " / "
    + client.conn.playing['researching_cost']);

  const pct_progress: number = 100 * (client.conn.playing['bulbs_researched']
    / client.conn.playing['researching_cost']);

  $("#progress_fg").css("width", pct_progress + "%");

  if (clicked_tech_id != null) {
    $("#tech_result_text").html("<span id='tech_advance_helptext'>" + get_advances_text(clicked_tech_id) + "</span>");
    $("#tech_advance_helptext").tooltip({ disabled: false });
  } else if (techs[client.conn.playing['researching']] != null) {
    $("#tech_result_text").html("<span id='tech_advance_helptext'>" + get_advances_text(client.conn.playing['researching']) + "</span>");
    $("#tech_advance_helptext").tooltip({ disabled: false });
  }

  $("#tech_tab_item").css("color", "#000000");

  /* scroll the tech tree, so that the current research targets are on the screen..  */
  maxleft = maxleft - 280;
  if (maxleft < 0) maxleft = 0;
  if (!tech_dialog_active) {
    setTimeout(scroll_tech_tree, 10);
  }

  tech_dialog_active = true;

}

export function get_advances_text(tech_id: number): string {
  const num = (value: number | null) => value === null ? 'null' : value;
  const tech_span = (name: string, unit_id: number | null, impr_id: number | null, title?: string) =>
    `<span ${title ? `title='${title}'` : ''}`
    + ` onclick='show_tech_info_dialog("${name}", ${num(unit_id)}, ${num(impr_id)})'>${name}</span>`;

  const is_valid_and_required = (next_tech_id: string) =>
    reqtree.hasOwnProperty(next_tech_id) && is_tech_req_for_tech(tech_id, parseInt(next_tech_id));

  const format_list_with_intro = (intro: string, list: (string | undefined)[]) =>
    (list = list.filter(Boolean) as string[]).length ? (intro + ' ' + list.join(', ')) : '';

  const ptech = techs[tech_id];

  return tech_span(ptech.name, null, null) + ' (' + Math.floor(ptech.cost) + ')'
    + format_list_with_intro(' allows',
      [
        format_list_with_intro('building unit', get_units_from_tech(tech_id)
          .map((unit: any) => tech_span(unit.name, unit.id, null, unit.helptext))),
        format_list_with_intro('building', get_improvements_from_tech(tech_id)
          .map((impr: any) => tech_span(impr.name, null, impr.id, impr.helptext))),
        format_list_with_intro('researching', Object.keys(techs)
          .filter(is_valid_and_required)
          .map((tid: string) => techs[tid])
          .map((tech: any) => tech_span(tech.name, null, null)))
      ]) + '.';
}

export function scroll_tech_tree(): void {
  $("#technologies").scrollLeft(maxleft);
}

export function send_player_research(tech_id: number): void {
  const packet = { "pid": packet_player_research, "tech": tech_id };
  sendRequest(JSON.stringify(packet));
  $("#tech_dialog").dialog('close');
}

export function send_player_tech_goal(tech_id: number): void {
  const packet = { "pid": packet_player_tech_goal, "tech": tech_id };
  sendRequest(JSON.stringify(packet));
}

export function tech_mapview_mouse_click(e: MouseEvent): void {

  let rightclick: boolean;
  if (!e) {
    e = window.event as MouseEvent;
  }
  if (e.which) {
    rightclick = (e.which == 3);
  } else if (e.button) {
    rightclick = (e.button == 2);
  } else {
    rightclick = false;
  }

  if (rightclick) {
    if (mouse_x > $(window).width() / 2) {
      $("#technologies").scrollLeft($("#technologies").scrollLeft() + 150);
    } else {
      $("#technologies").scrollLeft($("#technologies").scrollLeft() - 150);
    }
    return;
  }

  if (tech_canvas != null) {
    const tech_mouse_x: number = mouse_x - $("#technologies").offset().left + $("#technologies").scrollLeft();
    const tech_mouse_y: number = mouse_y - $("#technologies").offset().top + $("#technologies").scrollTop();

    for (let tech_id in techs) {
      const ptech = techs[tech_id];
      if (!(tech_id + '' in reqtree)) continue;

      let x: number = Math.floor(reqtree[tech_id + '']['x'] * tech_xscale) + 2;  //scale in X direction.
      let y: number = reqtree[tech_id + '']['y'] + 2;

      if (is_small_screen()) {
        x = x * 0.6;
        y = y * 0.6;
      }

      if (tech_mouse_x > x && tech_mouse_x < x + tech_item_width
        && tech_mouse_y > y && tech_mouse_y < y + tech_item_height) {
        if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
          send_player_research(ptech['id']);
        } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
          send_player_tech_goal(ptech['id']);
        }
        clicked_tech_id = ptech['id'];
      }
    }
  }

  update_tech_screen();

}

export function get_tech_infobox_html(tech_id: number): string | null {
  let infobox_html: string = "";
  const ptech = techs[tech_id];
  const tag = tileset_tech_graphic_tag(ptech);

  if (tag == null) return null;
  const tileset_x: number = tileset[tag][0];
  const tileset_y: number = tileset[tag][1];
  const width: number = tileset[tag][2];
  const height: number = tileset[tag][3];
  const i: number = tileset[tag][4];
  const image_src: string = "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts;
  if (is_small_screen()) {
    infobox_html += "<div class='specific_tech' onclick='send_player_research(" + tech_id + ");' title='"
      + get_advances_text(tech_id).replace(/(<([^>]+)>)/ig, "") + "'>"
      + ptech['name']
      + "</div>";
  } else {
    infobox_html += "<div class='specific_tech' onclick='send_player_research(" + tech_id + ");' title='"
      + get_advances_text(tech_id).replace(/(<([^>]+)>)/ig, "") + "'>"
      + "<div class='tech_infobox_image' style='background: transparent url("
      + image_src
      + ");background-position:-" + tileset_x + "px -" + tileset_y
      + "px;  width: " + width + "px;height: " + height + "px;'"
      + "></div>"
      + ptech['name']
      + "</div>";
  }

  return infobox_html;
}

export function check_queued_tech_gained_dialog(): void {
  if (!is_pbem() || players.length < 2) return;

  const queued_tech: string | null = simpleStorage.get(get_pbem_game_key(), "");

  if (queued_tech != null && queued_tech !== "") {
    $("#dialog").remove();
    show_tech_gained_dialog(parseInt(queued_tech));
    simpleStorage.set(get_pbem_game_key(), null);
  }

}

export function queue_tech_gained_dialog(tech_gained_id: number): void {
  if (client_is_observer() || C_S_RUNNING != client_state()) return;

  if (is_pbem() && pbem_phase_ended) {
    simpleStorage.set(get_pbem_game_key(), tech_gained_id);
  } else {
    show_tech_gained_dialog(tech_gained_id);
  }

}

export function show_tech_gained_dialog(tech_gained_id: number): void {
  if (client_is_observer() || C_S_RUNNING != client_state()) return;

  $("#tech_tab_item").css("color", "#aa0000");
  const pplayer = client.conn.playing;
  const tech = techs[tech_gained_id];
  if (tech == null) return;

  const title: string = tech['name'] + " discovered!";
  let message: string = "The " + nations[pplayer['nation']]['adjective'] + " have discovered " + tech['name'] + ".<br>";
  message += "<span id='tech_advance_helptext'>" + get_advances_text(tech_gained_id) + "</span>";

  const tech_choices: any[] = [];
  for (let next_tech_id in techs) {
    const ntech = techs[next_tech_id];
    if (!(next_tech_id + '' in reqtree)) continue;
    if (player_invention_state(client.conn.playing, ntech['id']) == TECH_PREREQS_KNOWN) {
      tech_choices.push(ntech);
    }
  }

  message += "<br>You can now research:<br><div id='tech_gained_choice'>";
  for (let i: number = 0; i < tech_choices.length; i++) {
    const html = get_tech_infobox_html(tech_choices[i]['id']);
    if (html) {
      message += html;
    }
  }
  message += "</div>";

  // reset dialog page.
  $("#tech_dialog").remove();
  $("<div id='tech_dialog'></div>").appendTo("div#game_page");

  $("#tech_dialog").html(message);
  $("#tech_dialog").attr("title", title);
  $("#tech_dialog").dialog({
    bgiframe: true,
    modal: false,
    width: is_small_screen() ? "90%" : "60%",
    buttons: [
      {
        text: "Close",
        click: function () {
          $("#tech_dialog").dialog('close');
          $("#game_text_input").blur();
        }
      }, {
        text: "Show Technology Tree",
        click: function () {
          $("#tabs").tabs("option", "active", 2);
          // set_default_mapview_inactive(); // Assuming this is a global function
          update_tech_screen();
          $("#tech_dialog").dialog('close');
        }
      }
    ]
  });

  $("#tech_dialog").dialog('open');
  $("#game_text_input").blur();
  $("#tech_advance_helptext").tooltip({ disabled: false });
  $(".specific_tech").tooltip({ disabled: false });

}

export function show_wikipedia_dialog(tech_name: string): void {
  $("#tech_tab_item").css("color", "#aa0000");
  if (freeciv_wiki_docs == null || freeciv_wiki_docs[tech_name] == null) return;

  let message: string = "<b>Wikipedia on <a href='" + wikipedia_url
    + freeciv_wiki_docs[tech_name]['title']
    + "' target='_new'>" + freeciv_wiki_docs[tech_name]['title']
    + "</a></b><br>";
  if (freeciv_wiki_docs[tech_name]['image'] != null) {
    message += "<img id='wiki_image' src='/images/wiki/" + freeciv_wiki_docs[tech_name]['image'] + "'><br>";
  }

  message += freeciv_wiki_docs[tech_name]['summary'];

  // reset dialog page.
  $("#wiki_dialog").remove();
  $("<div id='wiki_dialog'></div>").appendTo("div#game_page");

  $("#wiki_dialog").html(message);
  $("#wiki_dialog").attr("title", tech_name);
  $("#wiki_dialog").dialog({
    bgiframe: true,
    modal: true,
    width: is_small_screen() ? "90%" : "60%",
    buttons: {
      Ok: function () {
        $("#wiki_dialog").dialog('close');
      }
    }
  });

  $("#wiki_dialog").dialog('open');
  $("#wiki_dialog").css("max-height", $(window).height() - 100);
  $("#game_text_input").blur();
}

export function show_tech_info_dialog(tech_name: string, unit_type_id: number | null, improvement_id: number | null): void {
  $("#tech_tab_item").css("color", "#aa0000");

  let message: string = "";

  if (unit_type_id != null) {
    const punit_type = unit_types[unit_type_id];
    message += "<b>Unit info</b>: " + punit_type['helptext'] + "<br><br>"
      + "Cost: " + punit_type['build_cost']
      + "<br>Attack: " + punit_type['attack_strength']
      + "<br>Defense: " + punit_type['defense_strength']
      + "<br>Firepower: " + punit_type['firepower']
      + "<br>Hitpoints: " + punit_type['hp']
      + "<br>Moves: " + move_points_text(punit_type['move_rate'])
      + "<br>Vision: " + punit_type['vision_radius_sq']
      + "<br><br>";
  }

  if (improvement_id != null) message += "<b>Improvement info</b>: " + improvements[improvement_id]['helptext'] + "<br><br>";

  if (freeciv_wiki_docs[tech_name] != null) {
    message += "<b>Wikipedia on <a href='" + wikipedia_url
      + freeciv_wiki_docs[tech_name]['title']
      + "' target='_new' style='color: black;'>" + freeciv_wiki_docs[tech_name]['title']
      + "</a>:</b><br>";

    if (freeciv_wiki_docs[tech_name]['image'] != null) {
      message += "<img id='wiki_image' src='/images/wiki/" + freeciv_wiki_docs[tech_name]['image'] + "'><br>";
    }

    message += freeciv_wiki_docs[tech_name]['summary'];
  }

  // reset dialog page.
  $("#wiki_dialog").remove();
  $("<div id='wiki_dialog'></div>").appendTo("div#game_page");

  $("#wiki_dialog").html(message);
  $("#wiki_dialog").attr("title", tech_name);
  $("#wiki_dialog").dialog({
    bgiframe: true,
    modal: true,
    width: is_small_screen() ? "95%" : "70%",
    height: $(window).height() - 60,
    buttons: {
      Ok: function () {
        $("#wiki_dialog").dialog('close');
      }
    }
  });

  $("#wiki_dialog").dialog('open');
  $("#game_text_input").blur();
}

export function update_tech_dialog_cursor(): void {
  if (!tech_canvas) return;

  tech_canvas.style.cursor = "default";
  const tech_mouse_x: number = mouse_x - $("#technologies").offset().left + $("#technologies").scrollLeft();
  const tech_mouse_y: number = mouse_y - $("#technologies").offset().top + $("#technologies").scrollTop();

  for (let tech_id in techs) {
    const ptech = techs[tech_id];
    if (!(tech_id + '' in reqtree)) continue;

    let x: number = Math.floor(reqtree[tech_id + '']['x'] * tech_xscale) + 2;  //scale in X direction.
    let y: number = reqtree[tech_id + '']['y'] + 2;

    if (is_small_screen()) {
      x = x * 0.6;
      y = y * 0.6;
    }

    if (tech_mouse_x > x && tech_mouse_x < x + tech_item_width
      && tech_mouse_y > y && tech_mouse_y < y + tech_item_height) {
      if (player_invention_state(client.conn.playing, ptech['id']) == TECH_PREREQS_KNOWN) {
        tech_canvas.style.cursor = "pointer";
      } else if (player_invention_state(client.conn.playing, ptech['id']) == TECH_UNKNOWN) {
        tech_canvas.style.cursor = "pointer";
      } else {
        tech_canvas.style.cursor = "not-allowed";
      }
      $("#tech_result_text").html("<span id='tech_advance_helptext'>" + get_advances_text(ptech['id']) + "</span>");
      $("#tech_advance_helptext").tooltip({ disabled: false });
    }
  }
}

export function show_observer_tech_dialog(): void {
  $("#tech_info_box").hide();
  $("#tech_canvas").hide();
  let msg: string = "<h2>Research</h2>";
  for (let player_id in players) {
    const pplayer = players[player_id];
    const pname: string = pplayer['name'];
    const pr = research_get(pplayer);
    if (pr == null) continue;

    const researching: number = pr['researching'];
    if (techs[researching] != null) {
      msg += pname + ": " + techs[researching]['name'] + "<br>";
    }
  }
  $("#technologies").html(msg);
  $("#technologies").css("color", "black");
}

export function update_bulbs_output_info(): void {
  const cbo = get_current_bulbs_output();
  $('#bulbs_output').html(get_current_bulbs_output_text(cbo));
  update_net_bulbs(cbo.self_bulbs - cbo.self_upkeep);
}
