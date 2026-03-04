import { store } from '../data/store';
import { find_city_by_number, city_owner, does_city_have_improvement } from '../data/city';
import { player_invention_state } from '../data/tech';
import { game_info, is_longturn } from '../data/game';
import { sendRequest } from '../net/connection';
import {
  packet_diplomacy_init_meeting_req,
  packet_diplomacy_accept_treaty_req,
  packet_diplomacy_cancel_meeting_req,
  packet_diplomacy_create_clause_req,
  packet_diplomacy_remove_clause_req,
  packet_diplomacy_cancel_pact,
} from '../net/packetConstants';
import { client_state } from '../client/clientState';
import { update_nation_screen } from '../client/civClient'; // Assuming this is in civClient.ts
import { is_small_screen } from '../utils/helpers'; // Assuming this is in helpers.ts
import { get_tileset_file_extention } from '../utils/helpers'; // Assuming this is in helpers.ts
import { get_treaty_agree_thumb_up, get_treaty_disagree_thumb_down } from './statusPanel'; // Assuming these are in statusPanel.ts

declare const $: any;
declare const Handlebars: any;
declare const client: any; // TODO: Type client
declare const players: any; // TODO: Type players
declare const nations: any; // TODO: Type nations
declare const techs: any; // TODO: Type techs
declare const cities: any; // TODO: Type cities
declare const sprites: any; // TODO: Type sprites
declare const DS_CEASEFIRE: any; // TODO: Type DS_CEASEFIRE
declare const TECH_KNOWN: any; // TODO: Type TECH_KNOWN
declare const TECH_UNKNOWN: any; // TODO: Type TECH_UNKNOWN
declare const TECH_PREREQS_KNOWN: any; // TODO: Type TECH_PREREQS_KNOWN

export const CLAUSE_ADVANCE = 0;
export const CLAUSE_GOLD = 1;
export const CLAUSE_MAP = 2;
export const CLAUSE_SEAMAP = 3;
export const CLAUSE_CITY = 4;
export const CLAUSE_CEASEFIRE = 5;
export const CLAUSE_PEACE = 6;
export const CLAUSE_ALLIANCE = 7;
export const CLAUSE_VISION = 8;
export const CLAUSE_EMBASSY = 9;
export const CLAUSE_SHARED_TILES = 10;
export const SPECENUM_COUNT = 11;

export let clause_infos: any = {}; // TODO: Type clause_infos
export let diplomacy_clause_map: any = {}; // TODO: Type diplomacy_clause_map

/**************************************************************************
 ...
**************************************************************************/
export function diplomacy_init_meeting_req(counterpart: any): void {
  const packet = { "pid": packet_diplomacy_init_meeting_req, "counterpart": counterpart };
  sendRequest(JSON.stringify(packet));
}


/**************************************************************************
 ...
**************************************************************************/
export function show_diplomacy_dialog(counterpart: any): void {
  const pplayer = players[counterpart];
  create_diplomacy_dialog(pplayer, Handlebars.templates['diplomacy_meeting']);
}

/**************************************************************************
 ...
**************************************************************************/
export function accept_treaty_req(counterpart_id: any): void {
  const packet = { "pid": packet_diplomacy_accept_treaty_req, "counterpart": counterpart_id };
  sendRequest(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
export function accept_treaty(counterpart: any, I_accepted: boolean, other_accepted: boolean): void {
  if (I_accepted === true && other_accepted === true) {
    diplomacy_clause_map[counterpart] = [];
    cleanup_diplomacy_dialog(counterpart);

  } else {

    const agree_sprite = get_treaty_agree_thumb_up();
    const disagree_sprite = get_treaty_disagree_thumb_down();


    const agree_html = "<div style='float:left; background: transparent url("
      + agree_sprite['image-src']
      + "); background-position:-" + agree_sprite['tileset-x'] + "px -"
      + agree_sprite['tileset-y']
      + "px;  width: " + agree_sprite['width'] + "px;height: "
      + agree_sprite['height'] + "px; margin: 5px; '>"
      + "</div>";

    const disagree_html = "<div style='float:left; background: transparent url("
      + disagree_sprite['image-src']
      + "); background-position:-" + disagree_sprite['tileset-x'] + "px -"
      + disagree_sprite['tileset-y']
      + "px;  width: " + disagree_sprite['width'] + "px;height: "
      + disagree_sprite['height'] + "px; margin: 5px; '>"
      + "</div>";
    if (I_accepted === true) {
      $("#agree_self_" + counterpart).html(agree_html);
    } else {
      $("#agree_self_" + counterpart).html(disagree_html);
    }

    if (other_accepted) {
      $("#agree_counterpart_" + counterpart).html(agree_html);
    } else {
      $("#agree_counterpart_" + counterpart).html(disagree_html);
    }
  }
}

/**************************************************************************
 ...
**************************************************************************/
export function cancel_meeting_req(counterpart_id: any): void {
  const packet = { "pid": packet_diplomacy_cancel_meeting_req, "counterpart": counterpart_id };
  sendRequest(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
export function create_clause_req(counterpart_id: any, giver: any, type: number, value: any): void {
  if (type === CLAUSE_CEASEFIRE || type === CLAUSE_PEACE || type === CLAUSE_ALLIANCE) {
    // eg. creating peace treaty requires removing ceasefire first.
    const clauses = diplomacy_clause_map[counterpart_id];
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      if (clause['type'] === CLAUSE_CEASEFIRE || clause['type'] === CLAUSE_PEACE || clause['type'] === CLAUSE_ALLIANCE) {
        remove_clause_req(counterpart_id, i);
      }
    }
  }

  const packet = {
    "pid": packet_diplomacy_create_clause_req,
    "counterpart": counterpart_id,
    "giver": giver,
    "type": type,
    "value": value
  };
  sendRequest(JSON.stringify(packet));
}


/**************************************************************************
 ...
**************************************************************************/
export function cancel_meeting(counterpart: any): void {
  diplomacy_clause_map[counterpart] = [];
  cleanup_diplomacy_dialog(counterpart);
}

/**************************************************************************
 Remove diplomacy dialog.
**************************************************************************/
export function cleanup_diplomacy_dialog(counterpart_id: any): void {
  $("#diplomacy_dialog_" + counterpart_id).remove();
}

/**************************************************************************
 Remove all diplomacy dialogs and empty clauses map.
**************************************************************************/
export function discard_diplomacy_dialogs(): void {
  for (const counterpart in diplomacy_clause_map) {
    cleanup_diplomacy_dialog(counterpart);
  }
  diplomacy_clause_map = {};
}

/**************************************************************************
 ...
**************************************************************************/
export function show_diplomacy_clauses(counterpart_id: any): void {
  const clauses = diplomacy_clause_map[counterpart_id];
  let diplo_html = "";
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const diplo_str = client_diplomacy_clause_string(clause['counterpart'],
      clause['giver'],
      clause['type'],
      clause['value']);
    diplo_html += "<a href='#' onclick='remove_clause_req("
      + counterpart_id + ", " + i + ");'>" + diplo_str + "</a><br>";

  }

  $("#diplomacy_messages_" + counterpart_id).html(diplo_html);
}

/**************************************************************************
 ...
**************************************************************************/
export function remove_clause_req(counterpart_id: any, clause_no: number): void {
  const clauses = diplomacy_clause_map[counterpart_id];
  const clause = clauses[clause_no];

  const packet = {
    "pid": packet_diplomacy_remove_clause_req,
    "counterpart": clause['counterpart'],
    "giver": clause['giver'],
    "type": clause['type'],
    "value": clause['value']
  };
  sendRequest(JSON.stringify(packet));
}

/**************************************************************************
 ...
**************************************************************************/
export function remove_clause(remove_clause_obj: any): void {
  const counterpart_id = remove_clause_obj['counterpart'];
  const clause_list = diplomacy_clause_map[counterpart_id];
  for (let i = 0; i < clause_list.length; i++) {
    const check_clause = clause_list[i];
    if (counterpart_id === check_clause['counterpart']
      && remove_clause_obj['giver'] === check_clause['giver']
      && remove_clause_obj['type'] === check_clause['type']) {

      clause_list.splice(i, 1);
      break;
    }
  }

  show_diplomacy_clauses(counterpart_id);
}

/**************************************************************************
 ...
**************************************************************************/
export function client_diplomacy_clause_string(counterpart: any, giver: any, type: number, value: any): string {
  const pplayer = players[giver];
  const nation = nations[pplayer['nation']]['adjective'];

  switch (type) {
    case CLAUSE_ADVANCE:
      const ptech = techs[value];
      return "The " + nation + " give " + ptech['name'];
    case CLAUSE_CITY:
      const pcity = cities[value];

      if (pcity != null) {
        return "The " + nation + " give " + decodeURIComponent(pcity['name']);
      } else {
        return "The " + nation + " give unknown city.";
      }
    case CLAUSE_GOLD:
      if (giver === client.conn.playing['playerno']) {
        $("#self_gold_" + counterpart).val(value);
      } else {
        $("#counterpart_gold_" + counterpart).val(value);
      }
      return "The " + nation + " give " + value + " gold";
    case CLAUSE_MAP:
      return "The " + nation + " give their worldmap";
    case CLAUSE_SEAMAP:
      return "The " + nation + " give their seamap";
    case CLAUSE_CEASEFIRE:
      return "The parties agree on a cease-fire";
    case CLAUSE_PEACE:
      return "The parties agree on a peace";
    case CLAUSE_ALLIANCE:
      return "The parties create an alliance";
    case CLAUSE_VISION:
      return "The " + nation + " give shared vision";
    case CLAUSE_EMBASSY:
      return "The " + nation + " give an embassy";
    case CLAUSE_SHARED_TILES:
      return "The " + nation + " share their tiles";
  }

  return "";
}



/**************************************************************************
 ...
**************************************************************************/
export function diplomacy_cancel_treaty(player_id: any): void {
  const packet = {
    "pid": packet_diplomacy_cancel_pact,
    "other_player_id": player_id,
    "clause": DS_CEASEFIRE
  };
  sendRequest(JSON.stringify(packet));

  update_nation_screen();

  setTimeout(update_nation_screen, 500);
  setTimeout(update_nation_screen, 1500);
}



/**************************************************************************
 ...
**************************************************************************/
export function create_diplomacy_dialog(counterpart: any, template: any): void {
  const pplayer = client.conn.playing;
  const counterpart_id = counterpart['playerno'];

  // reset diplomacy_dialog div.
  // TODO: check whether this is still needed
  cleanup_diplomacy_dialog(counterpart_id);
  $("#game_page").append(template({
    self: meeting_template_data(pplayer, counterpart),
    counterpart: meeting_template_data(counterpart, pplayer)
  }));

  const title = "Diplomacy: " + counterpart['name']
    + " of the " + nations[counterpart['nation']]['adjective'];

  const diplomacy_dialog = $("#diplomacy_dialog_" + counterpart_id);
  diplomacy_dialog.attr("title", title);
  diplomacy_dialog.dialog({
    bgiframe: true,
    modal: false,
    width: is_small_screen() ? "90%" : "50%",
    height: 500,
    buttons: {
      "Accept treaty": function () {
        accept_treaty_req(counterpart_id);
      },
      "Cancel meeting": function () {
        cancel_meeting_req(counterpart_id);
      }
    },
    close: function () {
      cancel_meeting_req(counterpart_id);
    }
  }).dialogExtend({
    "minimizable": true,
    "closable": true,
    "icons": {
      "minimize": "ui-icon-circle-minus",
      "restore": "ui-icon-bullet"
    }
  });

  diplomacy_dialog.dialog('open');

  let nation = nations[pplayer['nation']];
  if (nation['customized']) {
    meeting_paint_custom_flag(nation, document.getElementById('flag_self_' + counterpart_id) as HTMLCanvasElement);
  }
  nation = nations[counterpart['nation']];
  if (nation['customized']) {
    meeting_paint_custom_flag(nation, document.getElementById('flag_counterpart_' + counterpart_id) as HTMLCanvasElement);
  }

  create_clauses_menu($('#hierarchy_self_' + counterpart_id));
  create_clauses_menu($('#hierarchy_counterpart_' + counterpart_id));

  if (game_info.trading_gold && clause_infos[CLAUSE_GOLD]['enabled']) {
    $("#self_gold_" + counterpart_id).attr({
      "max": pplayer['gold'],
      "min": 0
    });

    $("#counterpart_gold_" + counterpart_id).attr({
      "max": counterpart['gold'],
      "min": 0
    });

    let wto: number;
    $("#counterpart_gold_" + counterpart_id).change(function () {
      clearTimeout(wto);
      wto = setTimeout(function () {
        meeting_gold_change_req(counterpart_id, counterpart_id,
          parseFloat($("#counterpart_gold_" + counterpart_id).val()));
      }, 500);
    });

    $("#self_gold_" + counterpart_id).change(function () {
      clearTimeout(wto);
      wto = setTimeout(function () {
        meeting_gold_change_req(counterpart_id, pplayer['playerno'],
          parseFloat($("#self_gold_" + counterpart_id).val()));
      }, 500);
    });

  } else {
    $("#self_gold_" + counterpart_id).prop("disabled", true).parent().hide();
    $("#counterpart_gold_" + counterpart_id).prop("disabled", true).parent().hide();
  }

  diplomacy_dialog.css("overflow", "visible");
  diplomacy_dialog.parent().css("z-index", 1000);
}

export function meeting_paint_custom_flag(nation: any, flag_canvas: HTMLCanvasElement): void {
  const tag = "f." + nation['graphic_str'];
  const flag_canvas_ctx = flag_canvas.getContext("2d");
  if (flag_canvas_ctx) {
    flag_canvas_ctx.scale(1.5, 1.5);
    flag_canvas_ctx.drawImage(sprites[tag], 0, 0);
  }
}

export function create_clauses_menu(content: any): void {
  content.css('position', 'relative');
  const children = content.children();
  const button = children.eq(0);
  const menu = children.eq(1);
  menu.menu();
  menu.hide();
  menu.css({
    position: 'absolute',
    top: button.height()
      + parseFloat(button.css('paddingTop'))
      + parseFloat(button.css('paddingBottom'))
      + parseFloat(button.css('borderTopWidth')),
    left: parseFloat(button.css('marginLeft'))
  });
  const menu_open = function () {
    menu.show();
    menu.data('diplAdd', 'open');
  };
  const menu_close = function () {
    menu.hide();
    menu.data('diplAdd', 'closed');
  };
  button.click(function () {
    if (menu.data('diplAdd') === 'open') {
      menu_close();
    } else {
      menu_open();
    }
  });
  menu.click(function (e: any) {
    if (e && e.target && e.target.tagName === 'A') {
      menu_close();
    }
  });
  content.hover(menu_open, menu_close);
}

/**************************************************************************
 Request update of gold clause
**************************************************************************/
export function meeting_gold_change_req(counterpart_id: any, giver: any, gold: number): void {
  const clauses = diplomacy_clause_map[counterpart_id];
  if (clauses != null) {
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      if (clause['giver'] === giver && clause['type'] === CLAUSE_GOLD) {
        if (clause['value'] === gold) return;
        remove_clause_req(counterpart_id, i);
      }
    }
  }

  if (gold !== 0) {
    const packet = {
      "pid": packet_diplomacy_create_clause_req,
      "counterpart": counterpart_id,
      "giver": giver,
      "type": CLAUSE_GOLD,
      "value": gold
    };
    sendRequest(JSON.stringify(packet));
  }
}

/**************************************************************************
 Build data object for the dialog template.
**************************************************************************/
export function meeting_template_data(giver: any, taker: any): any {
  const data: any = {};
  const nation = nations[giver['nation']];

  if (!nation['customized']) {
    data.flag = nation['graphic_str'] + "-web" + get_tileset_file_extention();
  }

  data.adjective = nation['adjective'];
  data.name = giver['name'];
  data.pid = giver['playerno'];

  const all_clauses = [];

  let clauses = [];
  if (clause_infos[CLAUSE_MAP]['enabled']) {
    clauses.push({ type: CLAUSE_MAP, value: 1, name: 'World-map' });
  }
  if (clause_infos[CLAUSE_SEAMAP]['enabled']) {
    clauses.push({ type: CLAUSE_SEAMAP, value: 1, name: 'Sea-map' });
  }
  if (clauses.length > 0) {
    all_clauses.push({ title: 'Maps...', clauses: clauses });
  }

  if (game_info.trading_tech && clause_infos[CLAUSE_ADVANCE]['enabled']) {
    clauses = [];
    for (const tech_id in techs) {
      if (player_invention_state(giver, tech_id) === TECH_KNOWN
        && (player_invention_state(taker, tech_id) === TECH_UNKNOWN
          || player_invention_state(taker, tech_id) === TECH_PREREQS_KNOWN)) {
        clauses.push({
          type: CLAUSE_ADVANCE,
          value: tech_id,
          name: techs[tech_id]['name']
        });
      }
    }
    if (clauses.length > 0) {
      all_clauses.push({ title: 'Advances...', clauses: clauses });
    }
  }

  if (game_info.trading_city && !is_longturn()
    && clause_infos[CLAUSE_CITY]['enabled']) {
    clauses = [];
    for (const city_id in cities) {
      const pcity = cities[city_id];
      if (city_owner(pcity) === giver
        && !does_city_have_improvement(pcity, "Palace")) {
        clauses.push({
          type: CLAUSE_CITY,
          value: city_id,
          name: decodeURIComponent(pcity['name'])
        });
      }
    }
    if (clauses.length > 0) {
      all_clauses.push({ title: 'Cities...', clauses: clauses });
    }
  }

  if (clause_infos[CLAUSE_VISION]['enabled']) {
    all_clauses.push({ type: CLAUSE_VISION, value: 1, name: 'Give shared vision' });
  }
  if (clause_infos[CLAUSE_EMBASSY]['enabled']) {
    all_clauses.push({ type: CLAUSE_EMBASSY, value: 1, name: 'Give embassy' });
  }
  if (clause_infos[CLAUSE_SHARED_TILES]['enabled']) {
    all_clauses.push({ type: CLAUSE_SHARED_TILES, value: 1, name: 'Share tiles' });
  }

  if (giver === client.conn.playing) {
    clauses = [];
    if (clause_infos[CLAUSE_CEASEFIRE]['enabled']) {
      clauses.push({ type: CLAUSE_CEASEFIRE, value: 1, name: 'Cease-fire' });
    }
    if (clause_infos[CLAUSE_PEACE]['enabled']) {
      clauses.push({ type: CLAUSE_PEACE, value: 1, name: 'Peace' });
    }
    if (clause_infos[CLAUSE_ALLIANCE]['enabled']) {
      clauses.push({ type: CLAUSE_ALLIANCE, value: 1, name: 'Alliance' });
    }
    if (clauses.length > 0) {
      all_clauses.push({ title: 'Pacts...', clauses: clauses });
    }
  }

  data.clauses = all_clauses;

  return data;
}
