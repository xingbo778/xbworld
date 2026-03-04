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

import { is_wonder, get_improvement_requirements } from '../data/improvement';
import { unittype_ids_alphabetic } from '../data/unit';
import { U_NOT_OBSOLETED } from '../data/unittype';
import { get_unit_type_image_sprite, get_technology_image_sprite, get_improvement_image_sprite } from '../renderer/tilespec';
import { move_points_text } from '../data/unit';
import { ruledir_from_ruleset_name } from '../core/pregame';
declare const terrains: any;
declare const improvements: any;
declare const unit_types: any;
declare const techs: any;
declare const governments: any;
declare const get_advances_text: any;
declare function to_title_case(str: string): string;
declare function string_unqualify(str: string): string;

// The following variables are assumed to be declared elsewhere in the project and imported or global.
// For this conversion, we declare them as any or appropriate types to avoid TS errors.
declare const helpdata_order: string[];
declare const helpdata: { [key: string]: { text: string } };
declare const freeciv_wiki_docs: { [key: string]: any };
declare const ruleset_control: any;
declare const ruleset_summary: string | null;
declare const ruleset_description: string | null;

export const toplevel_menu_items: string[] = [
  "help_terrain",
  "help_economy",
  "help_cities",
  "help_city_improvements",
  "help_wonders_of_the_world",
  "help_units",
  "help_combat",
  "help_technology",
  "help_government",
];

export const hidden_menu_items: string[] = [
  "help_connecting",
  "help_languages",
  "help_governor",
  "help_chatline",
  "help_about",
  "help_worklist_editor",
];

/**************************************************************************
 Show the Freeciv-web Help Dialog
**************************************************************************/
export function show_help(): void {
  $("#tabs-hel").show();
  $("#help_menu").remove();
  $("#help_info_page").remove();
  $("<ul id='help_menu'></ul><div id='help_info_page'></div>").appendTo("#tabs-hel");
  for (const sec_id in helpdata_order) {
    const key: string = helpdata_order[sec_id];
    if (hidden_menu_items.indexOf(key) > -1) {
      continue;
    } else if (key.indexOf("help_gen") !== -1) {
      generate_help_menu(key);
    } else if (toplevel_menu_items.indexOf(key) > -1) {
      generate_help_toplevel(key);
    } else {
      const parent_key: string = find_parent_help_key(key);
      $("<li id='" + key + "' data-helptag='" + key + "'>" + helpdata_tag_to_title(key) + "</li>").appendTo(parent_key);
    }
  }

  $("#help_menu").menu({
    select: function(event: any, ui: any) {
      handle_help_menu_select(ui);
    },
  });

  show_help_intro();
  $("#tabs-hel").css("height", $(window).height() - 60);
  $("#help_info_page").css("max-width", $(window).width() - $("#help_menu").width() - 60);
}

/**************************************************************************
...
**************************************************************************/
export function show_help_intro(): void {
  $.get("/docs/help_intro.txt", function(data: string) {
    $("#help_info_page").html(data);
  });
}

/**************************************************************************
...
**************************************************************************/
export function generate_help_menu(key: string): void {
  let impr_id: string;
  let improvement: any;
  if (key === "help_gen_terrain") {
    for (const terrain_id in terrains) {
      const terrain = terrains[terrain_id];
      $("<li data-helptag='" + key + "_" + terrain["id"] + "'>" + terrain["name"] + "</li>").appendTo("#help_terrain_ul");
    }
  } else if (key === "help_gen_improvements") {
    for (impr_id in improvements) {
      improvement = improvements[impr_id];
      if (is_wonder(improvement)) continue;
      $("<li data-helptag='" + key + "_" + improvement["id"] + "'>" + improvement["name"] + "</li>").appendTo("#help_city_improvements_ul");
    }
  } else if (key === "help_gen_wonders") {
    for (impr_id in improvements) {
      improvement = improvements[impr_id];
      if (!is_wonder(improvement)) continue;
      $("<li data-helptag='" + key + "_" + improvement["id"] + "'>" + improvement["name"] + "</li>").appendTo("#help_wonders_of_the_world_ul");
    }
  } else if (key === "help_gen_units") {
    const unit_ids = unittype_ids_alphabetic();
    for (let i = 0; i < unit_ids.length; i++) {
      const unit_id = unit_ids[i];
      const punit_type = unit_types[unit_id];

      $("<li data-helptag='" + key + "_" + punit_type["id"] + "'>" + punit_type["name"] + "</li>").appendTo("#help_units_ul");
    }
  } else if (key === "help_gen_techs") {
    for (const tech_id in techs) {
      if (tech_id === "0") continue;
      const tech = techs[tech_id];
      $("<li data-helptag='" + key + "_" + tech["id"] + "'>" + tech["name"] + "</li>").appendTo("#help_technology_ul");
    }
  } else if (key === "help_gen_governments") {
    for (const gov_id in governments) {
      const pgov = governments[gov_id];

      $("<li data-helptag='" + key + "_" + pgov["id"] + "'>" + pgov["name"] + "</li>").appendTo("#help_government_ul");
    }
  } else if (key === "help_gen_ruleset") {
    $("<li id='" + key + "' data-helptag='" + key + "'>" + "About Current Ruleset" + "</li>").appendTo(find_parent_help_key(key));
  }
}

/**************************************************************************
...
**************************************************************************/
export function render_sprite(sprite: any): string {
  const msg =
    "<div class='help_unit_image' style=' background: transparent url(" +
    sprite["image-src"] +
    ");background-position:-" +
    sprite["tileset-x"] +
    "px -" +
    sprite["tileset-y"] +
    "px;  width: " +
    sprite["width"] +
    "px;height: " +
    sprite["height"] +
    "px;'" +
    "></div>";
  return msg;
}

/**************************************************************************
...
**************************************************************************/
export function generate_help_toplevel(key: string): void {
  const parent_key = find_parent_help_key(key);
  $("<li id='" + key + "' data-helptag='" + key + "'>" + helpdata_tag_to_title(key) + "</li>").appendTo(parent_key);
  $("<ul id='" + key + "_ul' class='help_submenu'></ul>").appendTo("#" + key);
}

/**************************************************************************
...
**************************************************************************/
export function find_parent_help_key(key: string): string {
  if (key === "help_terrain_alterations") {
    return "#help_terrain_ul";
  } else if (key === "help_villages" || key === "help_borders") {
    return "#help_terrain_ul";
  } else if (key === "help_food" || key === "help_production" || key === "help_trade") {
    return "#help_economy_ul";
  } else if (
    key === "help_specialists" ||
    key === "help_happiness" ||
    key === "help_pollution" ||
    key === "help_plague" ||
    key === "help_migration"
  ) {
    return "#help_cities_ul";
  } else if (key === "help_combat_example_1" || key === "help_combat_example_2") {
    return "#help_combat_ul";
  } else {
    return "#help_menu";
  }
}

/**************************************************************************
...
**************************************************************************/
export function handle_help_menu_select(ui: any): void {
  const selected_tag: string = $(ui.item).data("helptag");
  if (selected_tag.indexOf("help_gen") !== -1) {
    generate_help_text(selected_tag);
  } else if (selected_tag === "help_copying") {
    $.get("/docs/LICENSE.txt", function(data: string) {
      $("#help_info_page").html("<h1>Freeciv-Web License</h1>" + data.replace(/\n/g, "<br>"));
    });
  } else if (selected_tag === "help_controls") {
    $.get("/docs/controls.txt", function(data: string) {
      $("#help_info_page").html(data.replace(/\n/g, "<br>"));
    });
  } else {
    const msg = "<h1>" + helpdata_tag_to_title(selected_tag) + "</h1>" + helpdata[selected_tag]["text"];
    $("#help_info_page").html(msg);
  }

  $("#help_info_page").focus();
}

/**************************************************************************
  Returns a button that shows the extracted Wikipedia data about an item.

  Returns an empty string ("") if no such data exists.
**************************************************************************/
export function wiki_on_item_button(item_name: string): string {
  /* Item name shouldn't be a qualified string. */
  item_name = string_unqualify(item_name);

  if (freeciv_wiki_docs[item_name] == null) {
    console.log("No wiki data about " + item_name);
    return "";
  }

  return (
    "<button class='help_button' onclick=\"show_wikipedia_dialog('" +
    item_name.replace(/\\/g, "\\\\").replace(/'/g, "\\'") +
    "');\">Wikipedia on " +
    item_name +
    "</button>"
  );
}

/**************************************************************************
  Format a long text description of the current ruleset.
**************************************************************************/
export function helpdata_format_current_ruleset(): string {
  let msg = "";
  if (ruleset_control != null) {
    msg += "<h1>" + ruleset_control["name"] + "</h1>";
  }
  if (ruleset_summary != null) {
    msg += "<p>" + ruleset_summary.replace(/\n/g, "<br>") + "</p>";
  }
  if (ruleset_description != null) {
    msg += "<p>" + ruleset_description.replace(/\n/g, "<br>") + "</p>";
  }
  return msg;
}

/**************************************************************************
...
**************************************************************************/
export function generate_help_text(key: string): void {
  const rulesetdir: string = ruledir_from_ruleset_name(ruleset_control["name"], "");
  let msg = "";

  if (key.indexOf("help_gen_terrain") !== -1) {
    const terrain = terrains[parseInt(key.replace("help_gen_terrain_", ""))];
    msg =
      "<h1>" +
      terrain["name"] +
      "</h1>" +
      terrain["helptext"] +
      "<br><br>Movement cost: " +
      terrain["movement_cost"] +
      "<br>Defense bonus: " +
      terrain["defense_bonus"] +
      "<br>Food/Prod/Trade: " +
      terrain["output"][0] +
      "/" +
      terrain["output"][1] +
      "/" +
      terrain["output"][2];
  } else if (key.indexOf("help_gen_improvements") !== -1 || key.indexOf("help_gen_wonders") !== -1) {
    const improvement = improvements[
      parseInt(key.replace("help_gen_wonders_", "").replace("help_gen_improvements_", ""))
    ];
    msg =
      "<h1>" +
      improvement["name"] +
      "</h1>" +
      render_sprite(get_improvement_image_sprite(improvement)) +
      "<br>" +
      improvement["helptext"] +
      "<br><br>Cost: " +
      improvement["build_cost"] +
      "<br>Upkeep: " +
      improvement["upkeep"];
    const reqs = get_improvement_requirements(improvement["id"]);
    if (reqs != null) {
      msg += "<br>Requirements: ";
      for (let n = 0; n < reqs.length; n++) {
        msg += techs[reqs[n]]["name"] + " ";
      }
    }
    msg += "<br><br>";
    msg += wiki_on_item_button(improvement["name"]);
  } else if (key.indexOf("help_gen_units") !== -1) {
    let obsolete_by: any;
    const punit_type = unit_types[parseInt(key.replace("help_gen_units_", ""))];

    msg = "<h1>" + punit_type["name"] + "</h1>";
    msg += render_sprite(get_unit_type_image_sprite(punit_type));
    msg += "<br>";
    msg += "<div id='manual_non_helptext_facts'>";
    msg += "<div id='utype_fact_cost'>";
    msg += "Cost: " + punit_type["build_cost"];
    msg += "</div>";
    msg += "<div id='utype_fact_upkeep'>";
    msg += "</div>";
    msg += "<div id='utype_fact_attack_str'>";
    msg += "Attack: " + punit_type["attack_strength"];
    msg += "</div>";
    msg += "<div id='utype_fact_defense_str'>";
    msg += "Defense: " + punit_type["defense_strength"];
    msg += "</div>";
    msg += "<div id='utype_fact_firepower'>";
    msg += "Firepower: " + punit_type["firepower"];
    msg += "</div>";
    msg += "<div id='utype_fact_hp'>";
    msg += "Hitpoints: " + punit_type["hp"];
    msg += "</div>";
    msg += "<div id='utype_fact_move_rate'>";
    msg += "Moves: " + move_points_text(punit_type["move_rate"]);
    msg += "</div>";
    msg += "<div id='utype_fact_vision'>";
    msg += "Vision: " + punit_type["vision_radius_sq"];
    msg += "</div>";

    const ireqs = get_improvement_requirements(punit_type["impr_requirement"]);
    if (ireqs != null && techs[ireqs] != null) {
      msg += "<div id='utype_fact_req_building'>";
      msg += "Building Requirements: ";
      for (let m = 0; m < ireqs.length; m++) {
        msg += techs[ireqs[m]]["name"] + " ";
      }
      msg += "</div>";
    }

    const treq = punit_type["tech_requirement"];
    if (treq != null && techs[treq] != null) {
      msg += "<div id='utype_fact_req_tech'>";
      msg += "Tech Requirements: " + techs[treq]["name"];
      msg += "</div>";
    }

    obsolete_by = unit_types[punit_type["obsoleted_by"]];
    msg += "<div id='utype_fact_obsolete'>";
    msg += "Obsolete by: ";
    if (obsolete_by === U_NOT_OBSOLETED) {
      msg += "None";
    } else {
      msg += obsolete_by["name"];
    }
    msg += "</div>";

    msg += "</div>";

    msg += "<div id='helptext'><p>" + punit_type["helptext"] + "</p></div>";

    msg += wiki_on_item_button(punit_type["name"]);

    msg += "<div id='datastore' hidden='true'></div>";
  } else if (key.indexOf("help_gen_techs") !== -1) {
    const tech = techs[parseInt(key.replace("help_gen_techs_", ""))];
    msg =
      "<h1>" +
      tech["name"] +
      "</h1>" +
      render_sprite(get_technology_image_sprite(tech)) +
      "<br>" +
      get_advances_text(tech["id"]);
    msg += "<br><br>";
    msg += wiki_on_item_button(tech["name"]);
  } else if (key === "help_gen_ruleset") {
    msg = helpdata_format_current_ruleset();
  } else if (key.indexOf("help_gen_governments") !== -1) {
    const pgov = governments[parseInt(key.replace("help_gen_governments_", ""))];

    msg = "<h1>" + pgov["name"] + "</h1>";
    msg += "<div id='helptext'><p>" + pgov["helptext"] + "</p></div>";

    msg += wiki_on_item_button(pgov["name"]);
  }

  $("#help_info_page").html(msg);

  /* Freeciv has code that generates certain help texts based on the
   * ruleset. This code is written in C. It is huge. Replicating it in
   * JavaScript would be a huge task and probably introduce bugs. Even if
   * someone did it it would be hard to keep the replicated code in sync as
   * the corresponding Freeciv C code kept evolving.
   *
   * Freeciv has the tool freeciv-manual. It can use the ruleset based auto
   * help text generation. It can output HTML. Some of its HTML output is
   * machine readable enough to be usable for Freeciv-web.
   *
   * Use the machine readable and wanted parts of freeciv-manual's output to
   * add auto generated help texts for the current ruleset. */
  if (rulesetdir.length !== 0) {
    if (key.indexOf("help_gen_units") !== -1) {
      const utype_id = parseInt(key.replace("help_gen_units_", ""));

      /* Add the auto generated unit type facts freeciv-manual prepends to
       * the unit type's help text. */
      $("#helptext").load("../man/" + rulesetdir + "7.html #utype" + utype_id + " .helptext");

      /* Add the utype upkeep from freeciv-manual. */
      $("#datastore").load("../man/" + rulesetdir + "7.html #utype" + utype_id + " .upkeep", function() {
        $("#utype_fact_upkeep")[0].innerHTML = $("#datastore")[0].children[0].innerHTML;
      });
    } else if (key.indexOf("help_gen_governments") !== -1) {
      const gov_id = parseInt(key.replace("help_gen_governments_", ""));

      /* Add the auto generated government facts freeciv-manual prepends to
       * the government type's help text. */
      $("#helptext").load("../man/" + rulesetdir + "6.html #gov" + gov_id + " .helptext");
    }
  }

  $(".help_button").button();
}

/**************************************************************************
...
**************************************************************************/
export function helpdata_tag_to_title(tag: string): string {
  const result = tag
    .replace("_of_the_world", "")
    .replace("help_", "")
    .replace("gen_", "")
    .replace("misc_", "")
    .replace(/_/g, " ");
  return to_title_case(result);
}
