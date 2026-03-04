import { store } from '../data/store';
import { cityTile, cityOwner, canCityBuildNow, generateProductionList, city_population, city_turns_to_growth_text, get_city_production_type_sprite, get_city_production_time, get_production_progress, get_city_production_type, get_supported_units } from '../data/city';
import { get_unit_image_sprite, get_unit_city_info, unit_types, game_find_unit_by_number } from '../data/unit';
import { VUT_UTYPE, VUT_IMPROVEMENT } from '../data/fcTypes';
import { get_improvement_image_sprite, improvements } from '../data/improvement';
import { tile_units } from '../data/tile';
import { client_state, C_S_RUNNING } from '../client/clientState';
import { sendRequest } from '../net/connection';
import { packet_city_options_req, packet_city_buy, packet_city_change, packet_city_make_specialist, packet_city_make_worker, packet_city_rename, packet_city_sell, packet_city_change_specialist, packet_city_worklist } from '../net/packetConstants';
import { is_small_screen, numberWithCommas, is_touch_device, blur_input_on_touchdevice } from '../utils/helpers';
import { setup_window_size } from '../client/clientCore';
import { set_city_mapview_active, set_default_mapview_active, center_tile_mapcanvas, update_map_canvas, update_map_canvas_full, mapview } from '../renderer/mapview';
import { EventAggregator } from '../core/events';
import { request_unit_do_action, ACTION_FOUND_CITY, act_sel_queue_done } from '../data/actions';

declare const $: any;
declare const Handlebars: any;
declare const ruleset_control: any;
declare const specialists: any;
declare const client: any;
declare const FC_INFINITY: any;
declare const O_FOOD: any;
declare const O_SHIELD: any;
declare const O_TRADE: any;
declare const O_GOLD: any;
declare const O_LUXURY: any;
declare const O_SCIENCE: any;
declare const MAX_LEN_CITYNAME: any;
declare const MAX_LEN_NAME: any;
declare const swal: any;
declare const keyboard_input: boolean;
declare const renderer: any;
declare const RENDERER_2DCANVAS: any;
declare const observing: boolean;

export let citydlg_map_width: number = 384;      // default values for most rulesets
export let citydlg_map_height: number = 192;     // default value for most rulesets

const tileset_width: number = 96;         // amplio2 based tileset
const tileset_height: number = 48;

export let cities: any = {};
export let city_rules: any = {};
export let city_trade_routes: any = {};

export let goods: any = {};

export let active_city: any = null;
export let worklist_dialog_active: boolean = false;
export let production_selection: any[] = [];
export let worklist_selection: any[] = [];

/* The city_options enum. */
export const CITYO_DISBAND: number = 0;
export const CITYO_NEW_EINSTEIN: number = 1;
export const CITYO_NEW_TAXMAN: number = 2;
export const CITYO_LAST: number = 3;

export const FEELING_BASE: number = 0;		/* before any of the modifiers below */
export const FEELING_LUXURY: number = 1;		/* after luxury */
export const FEELING_EFFECT: number = 2;		/* after building effects */
export const FEELING_NATIONALITY: number = 3;  	/* after citizen nationality effects */
export const FEELING_MARTIAL: number = 4;	/* after units enforce martial order */
export const FEELING_FINAL: number = 5;		/* after wonders (final result) */

export const MAX_LEN_WORKLIST: number = 64;

export const INCITE_IMPOSSIBLE_COST: number = (1000 * 1000 * 1000);

export let city_tab_index: number = 0;
export let city_prod_clicks: number = 0;

export const city_screen_updater: EventAggregator = new EventAggregator(update_city_screen, 250,
                                              EventAggregator.DP_NONE,
                                              250, 3, 250);

/* Information for mapping workable tiles of a city to local index */
export let city_tile_map: any = null;

export let opt_show_unreachable_items: boolean = false;

/**************************************************************************
 ...
**************************************************************************/

export function show_city_dialog_by_id(pcity_id: any): void {
  show_city_dialog(cities[pcity_id]);
}

export function show_city_dialog(pcity: any): void {
  let turns_to_complete: any;
  let sprite: any;
  let punit: any;

  if (active_city != pcity || active_city == null) {
    city_prod_clicks = 0;
    production_selection = [];
    worklist_selection = [];
  }

  if (active_city != null) close_city_dialog();
  active_city = pcity;
  if (pcity == null) return;

  // reset dialog page.
  $("#city_dialog").remove();
  $("<div id='city_dialog'></div>").appendTo("div#game_page");

  const city_data: any = {};

  $("#city_dialog").html(Handlebars.templates['city'](city_data));

  $("#city_canvas").click(city_mapview_mouse_click);

  show_city_traderoutes();

  let dialog_buttons: any = {};
  if (!is_small_screen()) {
    dialog_buttons = $.extend(dialog_buttons,
      {
       "Previous city" : function() {
         previous_city();
       },
       "Next city (N)" : function() {
         next_city();
       },
       "Buy (B)" : function() {
         request_city_buy();
       },
       "Rename" : function() {
         rename_city();
       }
     });
   } else {
       dialog_buttons = $.extend(dialog_buttons,
         {
          "Next" : function() {
            next_city();
          },
          "Buy" : function() {
            request_city_buy();
          }
        });
   }

   dialog_buttons = $.extend(dialog_buttons, {"Close": close_city_dialog});

  $("#city_dialog").attr("title", decodeURIComponent(pcity['name'])
                         + " (" + pcity['size'] + ")");
  $("#city_dialog").dialog({
			bgiframe: true,
			modal: false,
			width: is_small_screen() ? "98%" : "80%",
                        height: is_small_screen() ? $(window).height() + 10 : $(window).height() - 80,
                        close : city_dialog_close_handler,
            buttons: dialog_buttons
                   }).dialogExtend({
                     "minimizable" : true,
                     "closable" : true,
                     "minimize" : function(evt: any, dlg: any){ set_default_mapview_active(); },
                     "icons" : {
                       "minimize" : "ui-icon-circle-minus",
                       "restore" : "ui-icon-bullet"
                     }});

  $("#city_dialog").dialog('widget').keydown(city_keyboard_listener);
  $("#city_dialog").dialog('open');
  $("#game_text_input").blur();

  /* Prepare city dialog for small screens. */
  if (!is_small_screen()) {
    $("#city_tabs-6").remove();
    $(".extra_tabs_small").remove();
    $("#mobile_cma_checkbox").remove();
  } else {
    $("#city_tabs-5").remove();
    $(".extra_tabs_big").remove();
    $("#city_stats").hide();
    const units_element: any = $("#city_improvements_panel").detach();
    $('#city_units_tab').append(units_element);
   }

  $("#city_tabs").tabs({ active: city_tab_index});

  $(".citydlg_tabs").height(is_small_screen() ? $(window).height() - 110 : $(window).height() - 225);

  city_worklist_dialog(pcity);

  const orig_renderer: any = renderer;
  // renderer = RENDERER_2DCANVAS; // This line is commented out in the original JS, so it's commented here too.
  set_citydlg_dimensions(pcity);
  set_city_mapview_active();
  center_tile_mapcanvas(city_tile(pcity));
  update_map_canvas(0, 0, mapview['store_width'], mapview['store_height']);
  // renderer = orig_renderer; // This line is commented out in the original JS, so it's commented here too.

  let governor_text: string = "";
  if (typeof pcity['cma_enabled'] !== 'undefined') {
    governor_text = "<br>" + (pcity['cma_enabled'] ? "Governor Enabled" : "Governor Disabled");
  }

  $("#city_size").html("Population: " + numberWithCommas(city_population(pcity)*1000) + "<br>"
                       + "Size: " + pcity['size'] + "<br>"
                       + "Granary: " + pcity['food_stock'] + "/" + pcity['granary_size'] + "<br>"
                       + "Change in: " + city_turns_to_growth_text(pcity) + governor_text);

  const prod_type: any = get_city_production_type_sprite(pcity);
  $("#city_production_overview").html("Producing: " + (prod_type != null ? prod_type['type']['name'] : "None"));

  turns_to_complete = get_city_production_time(pcity);

  if (turns_to_complete != FC_INFINITY) {
    $("#city_production_turns_overview").html(turns_to_complete + " turns &nbsp;&nbsp;(" + get_production_progress(pcity) + ")");
  } else {
    $("#city_production_turns_overview").html("-");
  }

  let improvements_html: string = "";
  for (let z = 0; z < ruleset_control.num_impr_types; z ++) {
    if (pcity['improvements'] != null && pcity['improvements'].isSet(z)) {
       sprite = get_improvement_image_sprite(improvements[z]);
       if (sprite == null) {
         console.log("Missing sprite for improvement " + z);
         continue;
       }

      improvements_html = improvements_html +
       "<div id='city_improvement_element'><div style='background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + "title=\"" + improvements[z]['helptext'] + "\" "
	   + "onclick='city_sell_improvement(" + z + ");'>"
           +"</div>" + improvements[z]['name'] + "</div>";
    }
  }
  $("#city_improvements_list").html(improvements_html);

  const punits: any = tile_units(city_tile(pcity));
  if (punits != null) {
    let present_units_html: string = "";
    for (let r = 0; r < punits.length; r++) {
      punit = punits[r];
      sprite = get_unit_image_sprite(punit);
      if (sprite == null) {
         console.log("Missing sprite for " + punit);
         continue;
       }

      present_units_html = present_units_html +
       "<div class='game_unit_list_item' title='" + get_unit_city_info(punit)
           + "' style='cursor:pointer;cursor:hand; background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + " onclick='city_dialog_activate_unit(units[" + punit['id'] + "]);'"
           +"></div>";
    }
    $("#city_present_units_list").html(present_units_html);
  }

  const sunits: any = get_supported_units(pcity);
  if (sunits != null) {
    let supported_units_html: string = "";
    for (let t = 0; t < sunits.length; t++) {
      punit = sunits[t];
      sprite = get_unit_image_sprite(punit);
      if (sprite == null) {
         console.log("Missing sprite for " + punit);
         continue;
       }

      supported_units_html = supported_units_html +
       "<div class='game_unit_list_item' title='" + get_unit_city_info(punit)
           + "' style='cursor:pointer;cursor:hand; background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + " onclick='city_dialog_activate_unit(units[" + punit['id'] + "]);'"
           +"></div>";
    }
    $("#city_supported_units_list").html(supported_units_html);
  }
  $(".game_unit_list_item").tooltip();

  if ('prod' in pcity && 'surplus' in pcity) {
    let food_txt: string = pcity['prod'][O_FOOD] + " ( ";
    if (pcity['surplus'][O_FOOD] > 0) food_txt += "+";
    food_txt += pcity['surplus'][O_FOOD] + ")";

    let shield_txt: string = pcity['prod'][O_SHIELD] + " ( ";
    if (pcity['surplus'][O_SHIELD] > 0) shield_txt += "+";
    shield_txt += pcity['surplus'][O_SHIELD] + ")";

    let trade_txt: string = pcity['prod'][O_TRADE] + " ( ";
    if (pcity['surplus'][O_TRADE] > 0) trade_txt += "+";
    trade_txt += pcity['surplus'][O_TRADE] + ")";

    let gold_txt: string = pcity['prod'][O_GOLD] + " ( ";
    if (pcity['surplus'][O_GOLD] > 0) gold_txt += "+";
    gold_txt += pcity['surplus'][O_GOLD] + ")";

    const luxury_txt: any = pcity['prod'][O_LUXURY];
    const science_txt: any = pcity['prod'][O_SCIENCE];

    $("#city_food").html(food_txt);
    $("#city_prod").html(shield_txt);
    $("#city_trade").html(trade_txt);
    $("#city_gold").html(gold_txt);
    $("#city_luxury").html(luxury_txt);
    $("#city_science").html(science_txt);

    $("#city_corruption").html(pcity['waste'][O_TRADE]);
    $("#city_waste").html(pcity['waste'][O_SHIELD]);
    $("#city_pollution").html(pcity['pollution']);
    $("#city_steal").html(pcity['steal']);
    $("#city_culture").html(pcity['culture']);
  }

  /* Handle citizens and specialists */
  let specialist_html: string = "";
  const citizen_types: string[] = ["angry", "unhappy", "content", "happy"];
  for (let s = 0; s < citizen_types.length; s++) {
    if (pcity['ppl_' + citizen_types[s]] == null) continue;
    for (let i = 0; i < pcity['ppl_' + citizen_types[s]][FEELING_FINAL]; i ++) {
      sprite = get_specialist_image_sprite("citizen." + citizen_types[s] + "_"
         + (i % 2));
      specialist_html = specialist_html +
      "<div class='specialist_item' style='background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           +" title='One " + citizen_types[s] + " citizen'></div>";
    }
  }

  for (let u = 0; u < pcity['specialists_size']; u++) {
    const spec_type_name: string = specialists[u]['plural_name'];
    const spec_gfx_key: string = "specialist." + specialists[u]['rule_name'] + "_0";
    for (let j = 0; j < pcity['specialists'][u]; j++) {
      sprite = get_specialist_image_sprite(spec_gfx_key);
      specialist_html = specialist_html +
      "<div class='specialist_item' style='cursor:pointer;cursor:hand; background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float:left; '"
           + " onclick='city_change_specialist(" + pcity['id'] + "," + specialists[u]['id'] + ");'"
           +" title='" + spec_type_name + " (click to change)'></div>";

    }
  }
  specialist_html += "<div style='clear: both;'></div>";
  $("#specialist_panel").html(specialist_html);

  $('#disbandable_city').off();
  $('#disbandable_city').prop('checked',
                              pcity['city_options'] != null && pcity['city_options'].isSet(CITYO_DISBAND));
  $('#disbandable_city').click(function() {
    const options: any = pcity['city_options'];
    const packet: any = {
      "pid"     : packet_city_options_req,
      "city_id" : active_city['id'],
      "options" : options.raw
    };

    /* Change the option value referred to by the packet. */
    if ($('#disbandable_city').prop('checked')) {
      options.set(CITYO_DISBAND);
    } else {
      options.unset(CITYO_DISBAND);
    }

    /* Send the (now updated) city options. */
    sendRequest(JSON.stringify(packet));

  });

  if (is_small_screen()) {
    $(".ui-tabs-anchor").css("padding", "2px");
  }

  show_city_governor_tab();
}

export function request_city_buy(): void {
  const pcity: any = active_city;
  const pplayer: any = client.conn.playing;

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");
  let buy_price_string: string = "";
  let buy_question_string: string = "";

  if (pcity['production_kind'] == VUT_UTYPE) {
    const punit_type: any = unit_types[pcity['production_value']];
    if (punit_type != null) {
      buy_price_string = punit_type['name'] + " costs " + pcity['buy_cost'] + " gold.";
      buy_question_string = "Buy " + punit_type['name'] + " for " + pcity['buy_cost'] + " gold?";
    }
  } else {
    const improvement: any = improvements[pcity['production_value']];
    if (improvement != null) {
      buy_price_string = improvement['name'] + " costs " + pcity['buy_cost'] + " gold.";
      buy_question_string = "Buy " + improvement['name'] + " for " + pcity['buy_cost'] + " gold?";
    }
  }

  const treasury_text: string = "<br>Treasury contains " + pplayer['gold'] + " gold.";

  if (pcity['buy_cost'] > pplayer['gold']) {
    show_dialog_message("Buy It!",
      buy_price_string + treasury_text);
    return;
  }

  const dhtml: string = buy_question_string + treasury_text;


  $("#dialog").html(dhtml);

  $("#dialog").attr("title", "Buy It!");
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "95%" : "50%",
			buttons: {
				"Yes": function() {
						send_city_buy();
						$("#dialog").dialog('close');
				},
				"No": function() {
						$("#dialog").dialog('close');

				}
			}
		});

  $("#dialog").dialog('open');
}

export function send_city_buy(): void {
  if (active_city != null) {
    const packet: any = {"pid" : packet_city_buy, "city_id" : active_city['id']};
    sendRequest(JSON.stringify(packet));
  }
}

export function send_city_change(city_id: number, kind: any, value: any): void {
  const packet: any = {"pid" : packet_city_change, "city_id" : city_id,
                "production_kind": kind, "production_value" : value};
  sendRequest(JSON.stringify(packet));
}

export function close_city_dialog(): void {
  $("#city_dialog").dialog('close');
}

export function city_dialog_close_handler(): void {
  set_default_mapview_active();
  if (active_city != null) {
    setup_window_size ();
    center_tile_mapcanvas(city_tile(active_city));
    active_city = null;
     /*
      * TODO: this is just a hack to recover the background map.
      *       setup_window_size will resize (and thus clean) the map canvas,
      *       and this is now called when we show a city dialog while another
      *       one is open, which is unexpectedly common, tracing the functions
      *       shows two or three calls to show_city_dialog(). Maybe one internal
      *       from the client UI, the rest from info packets from the server.
      *       Both those duplicate calls and the stopping of map updates due
      *       to the 2D rendered being used to draw the minimap should go.
      */
    if (renderer == RENDERER_2DCANVAS) {
      update_map_canvas_full();
    }

  }
  // keyboard_input=true; // This is a global variable, not a local one.
  worklist_dialog_active = false;
}

export function do_city_map_click(ptile: any): void {
  let packet: any = null;
  if (ptile['worked'] == active_city['id']) {
    packet = {"pid"     : packet_city_make_specialist,
              "city_id" : active_city['id'],
              "tile_id" : ptile['index']};
  } else {
    packet = {"pid"     : packet_city_make_worker,
              "city_id" : active_city['id'],
              "tile_id" : ptile['index']};
  }
  sendRequest(JSON.stringify(packet));
}

export function city_name_dialog(suggested_name: string, unit_id: number): void {
  // reset dialog page.
  $("#city_name_dialog").remove();
  $("<div id='city_name_dialog'></div>").appendTo("div#game_page");

  $("#city_name_dialog").html($("<div>What should we call our new city?</div>"
                              + "<input id='city_name_req' type='text'>"));

  /* A suggested city name can contain an apostrophe ("'"). That character
   * is also used for single quotes. It shouldn't be added unescaped to a
   * string that later is interpreted as HTML. */
  /* TODO: Forbid city names containing an apostrophe or make sure that all
   * JavaScript using city names handles it correctly. Look for places
   * where a city name string is added to a string that later is
   * interpreted as HTML. Avoid the situation by directly using JavaScript
   * like below or by escaping the string. */
  $("#city_name_req").attr("value", suggested_name);

  $("#city_name_dialog").attr("title", "Build New City");
  $("#city_name_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: "300",
			close: function() {
				// keyboard_input=true; // This is a global variable, not a local one.
                act_sel_queue_done(unit_id);
			},
			buttons: [	{
					text: "Cancel",
				        click: function() {
						$("#city_name_dialog").remove();
                        // keyboard_input=true; // This is a global variable, not a local one.
                        act_sel_queue_done(unit_id);
					}
				},{
					text: "Ok",
				        click: function() {
						const name: string = $("#city_name_req").val();
						if (name.length == 0 || name.length >= MAX_LEN_CITYNAME - 6
						    || encodeURIComponent(name).length  >= MAX_LEN_CITYNAME - 6) {
						  swal("City name is invalid. Please try a different shorter name.");
						  return;
						}

                        const actor_unit: any = game_find_unit_by_number(unit_id);
                        request_unit_do_action(ACTION_FOUND_CITY,
                          unit_id, actor_unit['tile'], 0,
                          encodeURIComponent(name));
						$("#city_name_dialog").remove();
						// keyboard_input=true; // This is a global variable, not a local one.
                        act_sel_queue_done(unit_id);
					}
					}
				]
		});

  $("#city_name_req").attr('maxlength', MAX_LEN_NAME);

  $("#city_name_dialog").dialog('open');

  $('#city_name_dialog').keyup(function(e: any) {
    if (e.keyCode == 13) {
      const name: string = $("#city_name_req").val();
      const actor_unit: any = game_find_unit_by_number(unit_id);
      request_unit_do_action(ACTION_FOUND_CITY,
        unit_id, actor_unit['tile'], 0, encodeURIComponent(name));
	  $("#city_name_dialog").remove();
      // keyboard_input=true; // This is a global variable, not a local one.
      act_sel_queue_done(unit_id);
    }
  });

  blur_input_on_touchdevice();
  // keyboard_input=false; // This is a global variable, not a local one.

}

export function next_city(): void {
  if (!client.conn.playing) return;

  city_screen_updater.fireNow();

  let next_row: any = $('#cities_list_' + active_city['id']).next();
  if (next_row.length === 0) {
    // Either the city is not in the list anymore or it was the last item.
    // Anyway, go to the beginning
    next_row = $('#city_table tbody tr').first();
  }
  if (next_row.length > 0) {
    // If there's a city
    show_city_dialog(cities[next_row.attr('id').substr(12)]);
  }
}

export function previous_city(): void {
  if (!client.conn.playing) return;

  city_screen_updater.fireNow();

  let prev_row: any = $('#cities_list_' + active_city['id']).prev();
  if (prev_row.length === 0) {
    // Either the city is not in the list anymore or it was the last item.
    // Anyway, go to the end
    prev_row = $('#city_table tbody tr').last();
  }
  if (prev_row.length > 0) {
    // If there's a city
    show_city_dialog(cities[prev_row.attr('id').substr(12)]);
  }
}

export function city_sell_improvement(improvement_id: number): void {
  if ('confirm' in window) {
    const agree: boolean = confirm("Are you sure you want to sell this building?");
    if (agree) {
      const packet: any = {"pid" : packet_city_sell, "city_id" : active_city['id'],
                  "build_id": improvement_id};
      sendRequest(JSON.stringify(packet));
    }
  } else {
    const packet: any = {"pid" : packet_city_sell, "city_id" : active_city['id'],
                "build_id": improvement_id};
    sendRequest(JSON.stringify(packet));
  }
}

export function city_change_specialist(city_id: number, from_specialist_id: number): void {
  const city_message: any = {"pid": packet_city_change_specialist,
                      "city_id" : city_id,
                      "from" : from_specialist_id,
                      "to" : (from_specialist_id + 1) % 3};
  sendRequest(JSON.stringify(city_message));
}

export function rename_city(): void {
  if (active_city == null) return;

  // reset dialog page.
  $("#city_name_dialog").remove();
  $("<div id='city_name_dialog'></div>").appendTo("div#game_page");

  $("#city_name_dialog").html($("<div>What should we call this city?</div>"
                                + "<input id='city_name_req' type='text'>"));
  /* The city name can contain an apostrophe ("'"). That character is also
   * used for single quotes. It shouldn't be added unescaped to a
   * string that later is interpreted as HTML. */
  $("#city_name_req").attr("value", active_city['name']);
  $("#city_name_dialog").attr("title", "Rename City");
  $("#city_name_dialog").dialog({
			bgiframe: true,
			modal: true,
			width: "300",
			close: function() {
				// keyboard_input=true; // This is a global variable, not a local one.
			},
			buttons: [	{
					text: "Cancel",
				        click: function() {
						$("#city_name_dialog").remove();
        					// keyboard_input=true; // This is a global variable, not a local one.
					}
				},{
					text: "Ok",
				        click: function() {
						const name: string = $("#city_name_req").val();
						if (name.length == 0 || name.length >= MAX_LEN_NAME - 4
						    || encodeURIComponent(name).length  >= MAX_LEN_NAME - 4) {
						  swal("City name is invalid");
						  return;
						}

						const packet: any = {"pid" : packet_city_rename, "name" : encodeURIComponent(name), "city_id" : active_city['id'] };
						sendRequest(JSON.stringify(packet));
						$("#city_name_dialog").remove();
						// keyboard_input=true; // This is a global variable, not a local one.
					}
					}
				]
		});
  $("#city_name_req").attr('maxlength', MAX_LEN_NAME);

  $("#city_name_dialog").dialog('open');

  $('#city_name_dialog').keyup(function(e: any) {
    if (e.keyCode == 13) {
      const name: string = $("#city_name_req").val();
      const packet: any = {"pid" : packet_city_rename, "name" : encodeURIComponent(name), "city_id" : active_city['id'] };
      sendRequest(JSON.stringify(packet));
      $("#city_name_dialog").remove();
      // keyboard_input=true; // This is a global variable, not a local one.
    }
  });
}

export function city_worklist_dialog(pcity: any): void {
  if (pcity == null) return;
  const universals_list: any[] = [];
  let kind: any;
  let value: any;

  if (pcity['worklist'] != null && pcity['worklist'].length != 0) {
    const work_list: any[] = pcity['worklist'];
    for (let i = 0; i < work_list.length; i++) {
      const work_item: any = work_list[i];
      kind = work_item['kind'];
      value = work_item['value'];
      if (kind == null || value == null || work_item.length == 0) continue;
      if (kind == VUT_IMPROVEMENT) {
        const pimpr: any = improvements[value];
	let build_cost: any = pimpr['build_cost'];
	if (pimpr['name'] == "Coinage") build_cost = "-";
	universals_list.push({"name" : pimpr['name'],
		"kind" : kind,
		"value" : value,
		"helptext" : pimpr['helptext'],
		"build_cost" : build_cost,
		"sprite" : get_improvement_image_sprite(pimpr)});
      } else if (kind == VUT_UTYPE) {
        const putype: any = unit_types[value];
        universals_list.push({"name" : putype['name'],
		"kind" : kind,
		"value" : value,
		"helptext" : putype['helptext'],
		"build_cost" : putype['build_cost'],
		"sprite" : get_unit_type_image_sprite(putype)});
      } else {
        console.log("unknown kind: " + kind);
      }
    }
  }

  let worklist_html: string = "<table class='worklist_table'><tr><td>Type</td><td>Name</td><td>Cost</td></tr>";
  for (let j = 0; j < universals_list.length; j++) {
    const universal: any = universals_list[j];
    const sprite: any = universal['sprite'];
    if (sprite == null) {
      console.log("Missing sprite for " + universal['name']);
      continue;
    }

    worklist_html += "<tr class='prod_choice_list_item"
     + (can_city_build_now(pcity, universal['kind'], universal['value']) ?
        "" : " cannot_build_item")
     + "' data-wlitem='" + j + "' "
     + " title=\"" + universal['helptext'] + "\">"
     + "<td><div class='production_list_item_sub' style=' background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
           +"></div></td>"
     + "<td class='prod_choice_name'>" + universal['name'] + "</td>"
     + "<td class='prod_choice_cost'>" + universal['build_cost'] + "</td></tr>";
  }
  worklist_html += "</table>";
  $("#city_current_worklist").html(worklist_html);

  populate_worklist_production_choices(pcity);

  $('#show_unreachable_items').off('click');
  $('#show_unreachable_items').click(function() {
    opt_show_unreachable_items = !opt_show_unreachable_items;
    $('#show_unreachable_items').prop('checked', opt_show_unreachable_items);
    // TODO: properly update the selection only when needed,
    //       instead of always emptying it.
    if (production_selection.length !== 0) {
      production_selection = [];
      update_worklist_actions();
    }
    populate_worklist_production_choices(pcity);
  });
  $('#show_unreachable_items').prop('checked', opt_show_unreachable_items);

  worklist_dialog_active = true;
  const turns_to_complete: any = get_city_production_time(pcity);
  const prod_type: any = get_city_production_type_sprite(pcity);
  let prod_img_html: string = "";
  if (prod_type != null) { 
    const sprite: any = prod_type['sprite'];
    prod_img_html = "<div style='background: transparent url("
           + sprite['image-src']
           + ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;float: left; '>"
           +"</div>";
  }

  let headline: string = prod_img_html + "<div id='prod_descr'>" 
    + (is_small_screen() ? " " : " Production: ") 
    + (prod_type != null ? prod_type['type']['name'] : "None");

  if (turns_to_complete != FC_INFINITY) {
    headline += ", turns: " + turns_to_complete;
  }

  $("#worklist_dialog_headline").html(headline + "</div>");

  $(".production_list_item_sub").tooltip();

  if (is_touch_device()) {
    $("#prod_buttons").html("<x-small>Click to change production, next clicks will add to worklist on mobile.</x-small>");
  }

  $(".button").button();

  const tab_h: number = $("#city_production_tab").height();
  $("#city_current_worklist").height(tab_h - 150);
  $("#worklist_production_choices").height(tab_h - 121);
  /* TODO: remove all hacky sizing and positioning */
  /* It would have been nice to use $("#city_current_worklist").position().top
     for worklist_control padding-top, but that's 0 on first run.
     73 is also wrong, as it depends on text size. */
  if (tab_h > 250) {
    $("#worklist_control").height(tab_h - 148).css("padding-top", 73);
  } else {
    $("#worklist_control").height(tab_h - 77);
  }

  const worklist_items: any = $("#city_current_worklist .prod_choice_list_item");
  const max_selection: number = Math.min(MAX_LEN_WORKLIST, worklist_items.length);
  for (let k = 0; k < worklist_selection.length; k++) {
    if (worklist_selection[k] >= max_selection) {
      worklist_selection.splice(k, worklist_selection.length - k);
      break;
    }
    worklist_items.eq(worklist_selection[k]).addClass("ui-selected");
  }

  if (!is_touch_device()) {
    $("#city_current_worklist .worklist_table").selectable({
       filter: "tr",
       selected: handle_current_worklist_select,
       unselected: handle_current_worklist_unselect
    });
  } else {
    worklist_items.click(handle_current_worklist_click);
  }

  worklist_items.dblclick(handle_current_worklist_direct_remove);

  update_worklist_actions();
}

export function populate_worklist_production_choices(pcity: any): void {
  const production_list: any[] = generate_production_list();
  let production_html: string = "<table class='worklist_table'><tr><td>Type</td><td>Name</td><td title='Attack/Defense/Firepower'>Info</td><td>Cost</td></tr>";
  for (let a = 0; a < production_list.length; a++) {
    const sprite: any = production_list[a]['sprite'];
    if (sprite == null) {
      console.log("Missing sprite for " + production_list[a]['value']);
      continue;
    }
    const kind: any = production_list[a]['kind'];
    const value: any = production_list[a]['value'];
    const can_build: boolean = can_city_build_now(pcity, kind, value);

    if (can_build || opt_show_unreachable_items) {
      production_html += "<tr class='prod_choice_list_item kindvalue_item"
       + (can_build ? "" : " cannot_build_item")
       + "' data-value='" + value + "' data-kind='" + kind + "'>"
       + "<td><div class='production_list_item_sub' title=\"" + production_list[a]['helptext'] + "\" style=' background: transparent url("
           + sprite['image-src'] +
           ");background-position:-" + sprite['tileset-x'] + "px -" + sprite['tileset-y']
           + "px;  width: " + sprite['width'] + "px;height: " + sprite['height'] + "px;'"
           +"></div></td>"
       + "<td class='prod_choice_name'>" + production_list[a]['text'] + "</td>"
       + "<td class='prod_choice_name'>" + production_list[a]['unit_details'] + "</td>"
       + "<td class='prod_choice_cost'>" + production_list[a]['build_cost'] + "</td></tr>";
     }
  }
  production_html += "</table>";

  $("#worklist_production_choices").html(production_html);
  $("#worklist_production_choices .production_list_item_sub").tooltip();

  if (!is_touch_device()) {
    $("#worklist_production_choices .worklist_table").selectable({
       filter: "tr",
       selected: handle_worklist_select,
       unselected: handle_worklist_unselect
    });

    if (production_selection.length > 0) {
      const prod_items: any = $("#worklist_production_choices .kindvalue_item");
      const sel: string[] = [];
      production_selection.forEach(function (v: any) {
        sel.push("[data-value='" + v.value + "']" +
                 "[data-kind='"  + v.kind  + "']");
      });
      prod_items.filter(sel.join(",")).addClass("ui-selected");
    }

    $(".kindvalue_item").dblclick(function() {
      const value: number = parseFloat($(this).data('value'));
      const kind: number = parseFloat($(this).data('kind'));
      send_city_worklist_add(pcity['id'], kind, value);
    });
  } else {
    $(".kindvalue_item").click(function() {
      const value: number = parseFloat($(this).data('value'));
      const kind: number = parseFloat($(this).data('kind'));
      if (city_prod_clicks == 0) {
        send_city_change(pcity['id'], kind, value);
      } else {
        send_city_worklist_add(pcity['id'], kind, value);
      }
      city_prod_clicks += 1;

    });
  }
}

export function extract_universal(element: any): any {
  return {
    value: parseFloat($(element).data("value")),
    kind:  parseFloat($(element).data("kind"))
  };
}

export function find_universal_in_worklist(universal: any, worklist: any[]): number {
  for (let i = 0; i < worklist.length; i++) {
    if (worklist[i].kind === universal.kind &&
        worklist[i].value === universal.value) {
      return i;
    }
  }
  return -1;
}

export function handle_worklist_select(event: any, ui: any): void {
  const selected: any = extract_universal(ui.selected);
  const idx: number = find_universal_in_worklist(selected, production_selection);
  if (idx < 0) {
    production_selection.push(selected);
    update_worklist_actions();
  }
}

export function handle_worklist_unselect(event: any, ui: any): void {
  const selected: any = extract_universal(ui.unselected);
  const idx: number = find_universal_in_worklist(selected, production_selection);
  if (idx >= 0) {
    production_selection.splice(idx, 1);
    update_worklist_actions();
  }
}

export function handle_current_worklist_select(event: any, ui: any): void {
  const idx: number = parseInt($(ui.selected).data('wlitem'), 10);
  let i: number = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx)
    i--;
  if (i < 0 || worklist_selection[i] < idx) {
    worklist_selection.splice(i + 1, 0, idx);
    update_worklist_actions();
  }
}

export function handle_current_worklist_unselect(event: any, ui: any): void {
  const idx: number = parseInt($(ui.unselected).data('wlitem'), 10);
  let i: number = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx)
    i--;
  if (i >= 0 && worklist_selection[i] === idx) {
    worklist_selection.splice(i, 1);
    update_worklist_actions();
  }
}

export function handle_current_worklist_click(event: any): void {
  event.stopPropagation();

  const element: any = $(this);
  const item: number = parseInt(element.data('wlitem'), 10);

  if (worklist_selection.length === 1 && worklist_selection[0] === item) {
     element.removeClass('ui-selected');
     worklist_selection = [];
  } else {
     element.siblings().removeClass('ui-selected');
     element.addClass('ui-selected');
     worklist_selection = [item];
  }

  update_worklist_actions();
}

export function update_worklist_actions(): void {
  if (worklist_selection.length > 0) {
    $("#city_worklist_up_btn").button("enable");
    $("#city_worklist_remove_btn").button("enable");

    if (worklist_selection[worklist_selection.length - 1] ===
        active_city['worklist'].length - 1) {
      $("#city_worklist_down_btn").button("disable");
    } else {
      $("#city_worklist_down_btn").button("enable");
    }

  } else {
    $("#city_worklist_up_btn").button("disable");
    $("#city_worklist_down_btn").button("disable");
    $("#city_worklist_exchange_btn").button("disable");
    $("#city_worklist_remove_btn").button("disable");
  }

  if (production_selection.length > 0) {
    $("#city_add_to_worklist_btn").button("enable");
    $("#city_worklist_insert_btn").button("enable");

    if (production_selection.length == worklist_selection.length ||
        worklist_selection.length == 1) {
      $("#city_worklist_exchange_btn").button("enable");
    } else {
      $("#city_worklist_exchange_btn").button("disable");
    }

  } else {
    $("#city_add_to_worklist_btn").button("disable");
    $("#city_worklist_insert_btn").button("disable");
    $("#city_worklist_exchange_btn").button("disable");
  }

  if (production_selection.length === 1) {
    $("#city_change_production_btn").button("enable");
  } else {
    $("#city_change_production_btn").button("disable");
  }
}

export function send_city_worklist(city_id: number): void {
  const worklist: any[] = cities[city_id]['worklist'];
  const overflow: number = worklist.length - MAX_LEN_WORKLIST;
  if (overflow > 0) {
    worklist.splice(MAX_LEN_WORKLIST, overflow);
  }

  sendRequest(JSON.stringify({pid     : packet_city_worklist,
                               city_id : city_id,
                               worklist: worklist}));
}

export function send_city_worklist_add(city_id: number, kind: any, value: any): void {
  const pcity: any = cities[city_id];
  if (pcity['worklist'].length >= MAX_LEN_WORKLIST) {
    return;
  }

  pcity['worklist'].push({"kind" : kind, "value" : value});

  send_city_worklist(city_id);
}

export function city_change_production(): void {
  if (production_selection.length === 1) {
    send_city_change(active_city['id'], production_selection[0].kind,
                     production_selection[0].value);
  }
}

export function city_add_to_worklist(): void {
  if (production_selection.length > 0) {
    active_city['worklist'] = active_city['worklist'].concat(production_selection);
    send_city_worklist(active_city['id']);
  }
}

export function handle_current_worklist_direct_remove(): void {
  const idx: number = parseInt($(this).data('wlitem'), 10);
  active_city['worklist'].splice(idx, 1);

  // User may dblclick a task while having other selected
  let i: number = worklist_selection.length - 1;
  while (i >= 0 && worklist_selection[i] > idx) {
    worklist_selection[i]--;
    i--;
  }
  if (i >= 0 && worklist_selection[i] === idx) {
    worklist_selection.splice(i, 1);
  }

  send_city_worklist(active_city['id']);
}

export function city_insert_in_worklist(): void {
  const count: number = Math.min(production_selection.length, MAX_LEN_WORKLIST);
  if (count === 0) return;

  let i: number;
  const wl: any[] = active_city['worklist'];

  if (worklist_selection.length === 0) {

    wl.splice.apply(wl, [0, 0].concat(production_selection));

    // Initialize the selection with the inserted items
    for (i = 0; i < count; i++) {
      worklist_selection.push(i);
    }

  } else {

    wl.splice.apply(wl, [worklist_selection[0], 0].concat(production_selection));

    for (i = 0; i < worklist_selection.length; i++) {
      worklist_selection[i] += count;
    }
  }

  send_city_worklist(active_city['id']);
}

export function city_worklist_task_up(): void {
  let count: number = worklist_selection.length;
  if (count === 0) return;

  let swap: any;
  const wl: any[] = active_city['worklist'];

  if (worklist_selection[0] === 0) {
    worklist_selection.shift();
    if (wl[0].kind !== active_city['production_kind'] ||
        wl[0].value !== active_city['production_value']) {
      swap = wl[0];
      wl[0] = {
        kind : active_city['production_kind'],
        value: active_city['production_value']
      };

      send_city_change(active_city['id'], swap.kind, swap.value);
    }
    count--;
  }

  for (let i = 0; i < count; i++) {
    const task_idx: number = worklist_selection[i];
    swap = wl[task_idx - 1];
    wl[task_idx - 1] = wl[task_idx];
    wl[task_idx] = swap;
    worklist_selection[i]--;
  }

  send_city_worklist(active_city['id']);
}

export function city_worklist_task_down(): void {
  let count: number = worklist_selection.length;
  if (count === 0) return;

  let swap: any;
  const wl: any[] = active_city['worklist'];

  if (worklist_selection[--count] === wl.length - 1) return;

  while (count >= 0) {
    const task_idx: number = worklist_selection[count];
    swap = wl[task_idx + 1];
    wl[task_idx + 1] = wl[task_idx];
    wl[task_idx] = swap;
    worklist_selection[count]++;
    count--;
  }

  send_city_worklist(active_city['id']);
}

export function city_exchange_worklist_task(): void {
  const prod_l: number = production_selection.length;
  if (prod_l === 0) return;

  let i: number;
  let same: boolean = true;
  const wl: any[] = active_city['worklist'];
  const task_l: number = worklist_selection.length;
  if (prod_l === task_l) {
    for (i = 0; i < prod_l; i++) {
      if (same &&
          (wl[worklist_selection[i]].kind !== production_selection[i].kind ||
           wl[worklist_selection[i]].value !== production_selection[i].value)) {
        same = false;
      }
      wl[worklist_selection[i]] = production_selection[i];
    }
  } else if (task_l === 1) {
    i = worklist_selection[0];
    wl.splice.apply(wl, [i, 1].concat(production_selection));
    same = false;
    while (--prod_l) {
      worklist_selection.push(++i);
    }
  }

  if (!same) {
    send_city_worklist(active_city['id']);
  }
}

export function city_worklist_task_remove(): void {
  let count: number = worklist_selection.length;
  if (count === 0) return;

  const wl: any[] = active_city['worklist'];

  while (--count >= 0) {
    wl.splice(worklist_selection[count], 1);
  }
  worklist_selection = [];

  send_city_worklist(active_city['id']);
}

export function update_city_screen(): void {
  if (observing) return;

  const sortList: any[] = [];
  const headers: any = $('#city_table thead th');
  headers.filter('.tablesorter-headerAsc').each(function (i: number, cell: any) {
    sortList.push([cell.cellIndex, 0]);
  });
  headers.filter('.tablesorter-headerDesc').each(function (i: number, cell: any) {
    sortList.push([cell.cellIndex, 1]);
  });

  let city_list_html: string = "<table class='tablesorter' id='city_table' border=0 cellspacing=0>"
        + "<thead><tr><th>Name</th><th>Population</th><th>Size</th><th>State</th>"
        + "<th>Granary</th><th>Grows In</th><th>Producing</th>"
        + "<th>Surplus<br>Food/Prod/Trade</th><th>Economy<br>Gold/Luxury/Science</th></tr></thead><tbody>";
  let count: number = 0;
  for (const city_id in cities){
    const pcity: any = cities[city_id];
    if (client.conn.playing != null && city_owner(pcity) != null && city_owner(pcity).playerno == client.conn.playing.playerno) {
      count++; 
      const prod_type: any = get_city_production_type(pcity);
      let turns_to_complete_str: string;
      if (get_city_production_time(pcity) == FC_INFINITY) {
        turns_to_complete_str = "-"; //client does not know how long production will take yet.
      } else {
        turns_to_complete_str = get_city_production_time(pcity) + " turns";
      }

      city_list_html += "<tr class='cities_row' id='cities_list_" + pcity['id'] + "' onclick='javascript:show_city_dialog_by_id(" + pcity['id'] + ");'><td>"
              + pcity['name'] + "</td><td>" + numberWithCommas(city_population(pcity)*1000) +
              "</td><td>" + pcity['size'] + "</td><td>" + get_city_state(pcity) + "</td><td>" + pcity['food_stock'] + "/" + pcity['granary_size'] +
              "</td><td>" + city_turns_to_growth_text(pcity) + "</td>" + 
              "<td>" + prod_type['name'] + " (" + turns_to_complete_str + ")" +
              "</td><td>" + pcity['surplus'][O_FOOD] + "/" + pcity['surplus'][O_SHIELD] + "/" + pcity['surplus'][O_TRADE] + "</td>" +
              "<td>" + pcity['prod'][O_GOLD] + "/" + pcity['prod'][O_LUXURY] + "/" + pcity['prod'][O_SCIENCE] + "<td>"; 

      city_list_html += "</tr>";
    }
  }

  city_list_html += "</tbody></table>";
  $("#cities_list").html(city_list_html);

  if (count == 0) {
    $("#city_table").html("You have no cities. Build new cities with the Settlers unit.");
  }

  $('#cities_scroll').css("height", $(window).height() - 200);

  $("#city_table").tablesorter({theme:"dark", sortList: sortList});
}

export function get_city_state(pcity: any): string | undefined { 
  if (pcity == null) return;

  if (pcity['was_happy'] && pcity['size'] >= 3) {
    return "Celebrating";
  } else if (pcity['unhappy']) {
    return "Disorder";
  } else {
    return "Peace";
  }
}

export function city_keyboard_listener(ev: any): void {
  // Check if focus is in chat field, where these keyboard events are ignored.
  if ($('input:focus').length > 0 || !keyboard_input) return;

  if (C_S_RUNNING != client_state()) return;

  if (!ev) ev = window.event;
  const keyboard_key: string = String.fromCharCode(ev.keyCode);

  if (active_city != null) {
     switch (keyboard_key) {
       case 'N':
         next_city();
         ev.stopPropagation();
         break;

       case 'B':
         request_city_buy();
         ev.stopPropagation();
         break;
      }
  }
}

export function set_citydlg_dimensions(pcity: any): void {
  const city_radius: number = pcity.city_radius_sq;

  const radius_tiles: number = Math.ceil(Math.sqrt(city_radius));

  citydlg_map_width = tileset_width + radius_tiles * tileset_width;
  citydlg_map_height = tileset_height + radius_tiles * tileset_height;

  $("#city_canvas_div").css({"width":citydlg_map_width, "height":citydlg_map_height});
  $("#city_canvas").attr('width', citydlg_map_width);
  $("#city_canvas").attr('height', citydlg_map_height);
}

// Dummy functions for external references that are not part of the provided JS
function show_city_traderoutes(): void {}
function get_specialist_image_sprite(key: string): any {}
function city_mapview_mouse_click(): void {}
function show_city_governor_tab(): void {}
function show_dialog_message(title: string, message: string): void {}
function get_unit_type_image_sprite(unit_type: any): any {}
function city_dialog_activate_unit(unit: any): void {}
