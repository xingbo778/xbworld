import { store } from '../data/store';
import { cityTile as city_tile, getCityDxyToIndex as get_city_dxy_to_index } from '../data/city';
import { game_find_city_by_number as find_city_by_number } from '../data/game';
import { unit_type, tile_units, get_unit_anim_offset, unit_has_goto, idex_lookup_unit as find_unit_by_number } from '../data/unit';
import { mapPosToTile as map_pos_to_tile, mapstep, mapDistanceVector as map_distance_vector } from '../data/map';
import { tileGetKnown as tile_get_known, tileHasExtra as tile_has_extra, tileResource as tile_resource } from '../data/tile';
import { tileTerrain as tile_terrain, tileTerrainNear as tile_terrain_near, isOceanTile as is_ocean_tile } from '../data/terrain';
import { unit_is_in_focus, should_ask_server_for_actions } from '../core/control';

// player_invention_state is not exported from tech.ts; declare as global
declare function player_invention_state(pplayer: any, techId: number): number;
// get_tileset_file_extention is a global function
declare function get_tileset_file_extention(): string;
import { TILE_KNOWN_SEEN, TILE_KNOWN_UNSEEN, TILE_UNKNOWN } from '../data/tile';
import {
  ACTIVITY_CLEAN, ACTIVITY_MINE, ACTIVITY_PLANT, ACTIVITY_IRRIGATE, ACTIVITY_CULTIVATE,
  ACTIVITY_FORTIFIED, ACTIVITY_BASE, ACTIVITY_SENTRY, ACTIVITY_PILLAGE, ACTIVITY_GOTO,
  ACTIVITY_TRANSFORM, ACTIVITY_FORTIFYING, ACTIVITY_GEN_ROAD, ACTIVITY_CONVERT
} from '../data/fcTypes';
import { ServerSideAgent } from '../data/unit';
import { UTYF_FLAGLESS } from '../data/unittype';

// SSA constants from ServerSideAgent enum
const SSA_NONE = ServerSideAgent.NONE;
const SSA_AUTOWORKER = ServerSideAgent.AUTOWORKER;
const SSA_AUTOEXPLORE = ServerSideAgent.AUTOEXPLORE;

// DIR8 constants - standard Freeciv direction enum
const DIR8_NORTH = 0;
const DIR8_NORTHEAST = 1;
const DIR8_EAST = 2;
const DIR8_SOUTHEAST = 3;
const DIR8_SOUTH = 4;
const DIR8_SOUTHWEST = 5;
const DIR8_WEST = 6;
const DIR8_NORTHWEST = 7;

// EXTRA_ constants are set at runtime from server data; declare as globals
declare const EXTRA_MINE: number;
declare const EXTRA_OIL_WELL: number;
declare const EXTRA_HUT: number;
declare const EXTRA_POLLUTION: number;
declare const EXTRA_FALLOUT: number;
declare const EXTRA_RIVER: number;
declare const EXTRA_ROAD: number;
declare const EXTRA_RAIL: number;
declare const EXTRA_MAGLEV: number;
declare const EXTRA_IRRIGATION: number;
declare const EXTRA_FARMLAND: number;
declare const EXTRA_FORTRESS: number;
declare const EXTRA_AIRBASE: number;
declare const EXTRA_BUOY: number;
declare const EXTRA_RUINS: number;

declare const sprites: any;
declare const tileset: any;
declare const tile_types_setup: any;
declare const cellgroup_map: any;
declare const fullfog: any;
declare const dither_offset_x: any;
declare const dither_offset_y: any;
declare const normal_tile_width: number;
declare const normal_tile_height: number;
declare const unit_offset_x: number;
declare const unit_offset_y: number;
declare const unit_activity_offset_x: number;
declare const unit_activity_offset_y: number;
declare const city_flag_offset_x: number;
declare const city_flag_offset_y: number;
declare const unit_flag_offset_x: number;
declare const unit_flag_offset_y: number;
declare const citybar_offset_x: number;
declare const citybar_offset_y: number;
declare const tilelabel_offset_x: number;
declare const tilelabel_offset_y: number;
declare const draw_units: boolean;
declare const draw_focus_unit: boolean;
declare const active_city: any; // TODO: Type City
declare const show_citybar: boolean;
declare const client: any; // TODO: Type Client
declare const observing: boolean;
declare const game_info: any; // TODO: Type GameInfo
declare const extras: any; // TODO: Type Extras
declare const players: any; // TODO: Type Players
declare const nations: any; // TODO: Type Nations
declare const city_rules: any; // TODO: Type CityRules
declare const tileset_name: string;
declare const ts: string; // Timestamp for cache busting

let num_cardinal_tileset_dirs: number = 4;
let cardinal_tileset_dirs: number[] = [DIR8_NORTH, DIR8_EAST, DIR8_SOUTH, DIR8_WEST];

let NUM_CORNER_DIRS: number = 4;

let DIR4_TO_DIR8: number[] = [DIR8_NORTH, DIR8_SOUTH, DIR8_EAST, DIR8_WEST];

let current_select_sprite: number = 0;
let max_select_sprite: number = 4;

export let explosion_anim_map: { [key: number]: number } = {};

/* Items on the mapview are drawn in layers. Each entry below represents
 * one layer. The names are basically arbitrary and just correspond to
 * groups of elements in fill_sprite_array(). Callers of fill_sprite_array
 * must call it once for each layer. */
export const LAYER_TERRAIN1: number = 0;
export const LAYER_TERRAIN2: number = 1;
export const LAYER_TERRAIN3: number = 2;
export const LAYER_ROADS: number = 3;
export const LAYER_SPECIAL1: number = 4;
export const LAYER_CITY1: number = 5;
export const LAYER_SPECIAL2: number = 6;
export const LAYER_UNIT: number = 7;
export const LAYER_FOG: number = 8;
export const LAYER_SPECIAL3: number = 9;
export const LAYER_TILELABEL: number = 10;
export const LAYER_CITYBAR: number = 11;
export const LAYER_GOTO: number = 12;
export const LAYER_COUNT: number = 13;

// these layers are not used at the moment, for performance reasons.
//var LAYER_BACKGROUND = ; (not in use)
//var LAYER_EDITOR = ; (not in use)
//var LAYER_GRID* = ; (not in use)

/* An edge is the border between two tiles. This structure represents one
 * edge. The tiles are given in the same order as the enumeration name. */
export const EDGE_NS: number = 0; /* North and south */
export const EDGE_WE: number = 1; /* West and east */
export const EDGE_UD: number = 2; /* Up and down (nw/se), for hex_width tilesets */
export const EDGE_LR: number = 3; /* Left and right (ne/sw), for hex_height tilesets */
export const EDGE_COUNT: number = 4;

export const MATCH_NONE: number = 0;
export const MATCH_SAME: number = 1;		/* "boolean" match */
export const MATCH_PAIR: number = 2;
export const MATCH_FULL: number = 3;

export const CELL_WHOLE: number = 0;		/* entire tile */
export const CELL_CORNER: number = 1;	/* corner of tile */

/* Darkness style. Don't reorder this enum since tilesets depend on it. */
/* No darkness sprites are drawn. */
export const DARKNESS_NONE: number = 0;

/* 1 sprite that is split into 4 parts and treated as a darkness4. Only
 * works in iso-view. */
export const DARKNESS_ISORECT: number = 1;

/* 4 sprites, one per direction. More than one sprite per tile may be
 * drawn. */
export const DARKNESS_CARD_SINGLE: number = 2;

/* 15=2^4-1 sprites. A single sprite is drawn, chosen based on whether
 * there's darkness in _each_ of the cardinal directions. */
export const DARKNESS_CARD_FULL: number = 3;

/* Corner darkness & fog. 3^4 = 81 sprites. */
export const DARKNESS_CORNER: number = 4;

let terrain_match: { [key: string]: number } = {
  "t.l0.hills1": MATCH_NONE,
  "t.l0.mountains1": MATCH_NONE,
  "t.l0.plains1": MATCH_NONE,
  "t.l0.desert1": MATCH_NONE

};

/**************************************************************************
  Returns true iff the tileset has graphics for the specified tag.
**************************************************************************/
export function tileset_has_tag(tagname: string): boolean {
  return (sprites[tagname] != null);
}

/**************************************************************************
  Returns the tag name of the sprite of a ruleset entity where the
  preferred tag name is in the 'graphic_str' field, the fall back tag in
  case the tileset don't support the first tag is the 'graphic_alt' field
  and the entity name is stored in the 'name' field.
**************************************************************************/
export function tileset_ruleset_entity_tag_str_or_alt(entity: any, kind_name: string): string | null {
  if (entity == null) {
    console.log("No " + kind_name + " to return tag for.");
    return null;
  }

  if (tileset_has_tag(entity['graphic_str'])) {
    return entity['graphic_str'];
  }

  if (tileset_has_tag(entity['graphic_alt'])) {
    return entity['graphic_alt'];
  }

  console.log("No graphic for " + kind_name + " " + entity['name']);
  return null;
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified Extra on the
  map.
**************************************************************************/
export function tileset_extra_graphic_tag(extra: any): string | null {
  return tileset_ruleset_entity_tag_str_or_alt(extra, "extra");
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified unit type.
**************************************************************************/
export function tileset_unit_type_graphic_tag(utype: any): string | null {
  if (tileset_has_tag(utype['graphic_str'] + "_Idle")) {
    return utype['graphic_str'] + "_Idle";
  }

  if (tileset_has_tag(utype['graphic_alt'] + "_Idle")) {
    return utype['graphic_alt'] + "_Idle";
  }

  console.log("No graphic for unit " + utype['name']);
  return null;
}

/**************************************************************************
  Returns the tag name of the graphic for the unit.
**************************************************************************/
export function tileset_unit_graphic_tag(punit: any): string | null {
  /* Currently always uses the default "_Idle" sprite */
  return tileset_unit_type_graphic_tag(unit_type(punit));
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified building.
**************************************************************************/
export function tileset_building_graphic_tag(pimprovement: any): string | null {
  return tileset_ruleset_entity_tag_str_or_alt(pimprovement, "building");
}

/**************************************************************************
  Returns the tag name of the graphic showing the specified tech.
**************************************************************************/
export function tileset_tech_graphic_tag(ptech: any): string | null {
  return tileset_ruleset_entity_tag_str_or_alt(ptech, "tech");
}

/**************************************************************************
  Returns the tag name of the graphic showing the Extra specified by ID on
  the map.
**************************************************************************/
export function tileset_extra_id_graphic_tag(extra_id: number): string | null {
  return tileset_extra_graphic_tag(extras[extra_id]);
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is building the
  specified Extra.
**************************************************************************/
export function tileset_extra_activity_graphic_tag(extra: any): string | null {
  if (extra == null) {
    console.log("No extra to return tag for.");
    return null;
  }

  if (tileset_has_tag(extra['activity_gfx'])) {
    return extra['activity_gfx'];
  }

  if (tileset_has_tag(extra['act_gfx_alt'])) {
    return extra['act_gfx_alt'];
  }

  if (tileset_has_tag(extra['act_gfx_alt2'])) {
    return extra['act_gfx_alt2'];
  }

  console.log("No activity graphic for extra " + extra['name']);

  return null;
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is building the
  Extra specified by the id.
**************************************************************************/
export function tileset_extra_id_activity_graphic_tag(extra_id: number): string | null {
  return tileset_extra_activity_graphic_tag(extras[extra_id]);
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is removing the
  specified Extra.
**************************************************************************/
export function tileset_extra_rmactivity_graphic_tag(extra: any): string | null {
  if (extra == null) {
    console.log("No extra to return tag for.");
    return null;
  }

  if (tileset_has_tag(extra['rmact_gfx'])) {
    return extra['rmact_gfx'];
  }

  if (tileset_has_tag(extra['rmact_gfx_alt'])) {
    return extra['rmact_gfx_alt'];
  }

  if (tileset_has_tag(extra['rmact_gfx_alt2'])) {
    return extra['rmact_gfx_alt2'];
  }

  console.log("No removal activity graphic for extra " + extra['name']);

  return null;
}

/**************************************************************************
  Returns the tag name of the graphic showing that a unit is removing the
  Extra specified by the id.
**************************************************************************/
export function tileset_extra_id_rmactivity_graphic_tag(extra_id: number): string | null {
  return tileset_extra_rmactivity_graphic_tag(extras[extra_id]);
}

/****************************************************************************
  Fill in the sprite array for the given tile, city, and unit.

  ptile, if specified, gives the tile. If specified the terrain and specials
  will be drawn for this tile. In this case (map_x,map_y) should give the
  location of the tile.

  punit, if specified, gives the unit. For tile drawing this should
  generally be get_drawable_unit(); otherwise it can be any unit.

  pcity, if specified, gives the city. For tile drawing this should
  generally be tile_city(ptile); otherwise it can be any city.

  citymode specifies whether this is part of a citydlg. If so some drawing
  is done differently.
****************************************************************************/
export function fill_sprite_array(layer: number, ptile: any, pedge: any, pcorner: any, punit: any, pcity: any, citymode: boolean): any[] {
  let sprite_array: any[] = [];

  switch (layer) {
    case LAYER_TERRAIN1:
      if (ptile != null) {
        const tterrain_near = tile_terrain_near(ptile);
        const pterrain = tile_terrain(ptile);
        sprite_array = sprite_array.concat(fill_terrain_sprite_layer(0, ptile, pterrain, tterrain_near));

      }
      break;

    case LAYER_TERRAIN2:
      if (ptile != null) {
        const tterrain_near = tile_terrain_near(ptile);
        const pterrain = tile_terrain(ptile);
        sprite_array = sprite_array.concat(fill_terrain_sprite_layer(1, ptile, pterrain, tterrain_near));

      }
      break;

    case LAYER_TERRAIN3:
      if (ptile != null) {
        const tterrain_near = tile_terrain_near(ptile);
        const pterrain = tile_terrain(ptile);
        sprite_array = sprite_array.concat(fill_terrain_sprite_layer(2, ptile, pterrain, tterrain_near));

        sprite_array = sprite_array.concat(fill_irrigation_sprite_array(ptile, pcity));
      }
      break;

    case LAYER_ROADS:
      if (ptile != null) {
        sprite_array = sprite_array.concat(fill_path_sprite_array(ptile, pcity));
      }
      break;

    case LAYER_SPECIAL1:
      if (ptile != null) {

        const river_sprite = get_tile_river_sprite(ptile);
        if (river_sprite != null) sprite_array.push(river_sprite);

        const spec_sprite = get_tile_specials_sprite(ptile);
        if (spec_sprite != null) sprite_array.push(spec_sprite);


        if (tile_has_extra(ptile, EXTRA_MINE)) {
          sprite_array.push({
            "key":
              tileset_extra_id_graphic_tag(EXTRA_MINE)
          });
        }
        if (tile_has_extra(ptile, EXTRA_OIL_WELL)) {
          sprite_array.push({
            "key":
              tileset_extra_id_graphic_tag(EXTRA_OIL_WELL)
          });
        }

        sprite_array = sprite_array.concat(fill_layer1_sprite_array(ptile, pcity));

        if (tile_has_extra(ptile, EXTRA_HUT)) {
          sprite_array.push({
            "key":
              tileset_extra_id_graphic_tag(EXTRA_HUT)
          });
        }

        if (tile_has_extra(ptile, EXTRA_POLLUTION)) {
          sprite_array.push({
            "key":
              tileset_extra_id_graphic_tag(EXTRA_POLLUTION)
          });
        }

        if (tile_has_extra(ptile, EXTRA_FALLOUT)) {
          sprite_array.push({
            "key":
              tileset_extra_id_graphic_tag(EXTRA_FALLOUT)
          });
        }

        sprite_array = sprite_array.concat(get_border_line_sprites(ptile));

      }
      break;

    case LAYER_CITY1:
      if (pcity != null) {
        sprite_array.push(get_city_sprite(pcity));
        if (pcity['unhappy']) {
          sprite_array.push({ "key": "city.disorder" });
        }
      }


      break;

    case LAYER_SPECIAL2:
      if (ptile != null) {
        sprite_array = sprite_array.concat(fill_layer2_sprite_array(ptile, pcity));
      }
      break;

    case LAYER_UNIT:
      const do_draw_unit = (punit != null && (draw_units || ptile == null || (draw_focus_unit
        && unit_is_in_focus(punit))));

      if (do_draw_unit && active_city == null) {
        const stacked = (ptile['units'] != null && ptile['units'].length > 1);
        // const backdrop = false; /* !pcity;*/

        if (unit_is_in_focus(punit)) {
          sprite_array.push(get_select_sprite());
        }

        /* TODO: Special case for drawing the selection rectangle. The blinking
        * unit is handled separately, inside get_drawable_unit(). */
        sprite_array = sprite_array.concat(fill_unit_sprite_array(punit, stacked, false));

      }

      /* show explosion animation on current tile.*/
      if (ptile != null && explosion_anim_map[ptile['index']] != null) {
        let explode_step = explosion_anim_map[ptile['index']];
        explosion_anim_map[ptile['index']] = explode_step - 1;
        if (explode_step > 20) {
          sprite_array.push({
            "key": "explode.unit_0",
            "offset_x": unit_offset_x,
            "offset_y": unit_offset_y
          });
        } else if (explode_step > 15) {
          sprite_array.push({
            "key": "explode.unit_1",
            "offset_x": unit_offset_x,
            "offset_y": unit_offset_y
          });
        } else if (explode_step > 10) {
          sprite_array.push({
            "key": "explode.unit_2",
            "offset_x": unit_offset_x,
            "offset_y": unit_offset_y
          });
        } else if (explode_step > 5) {
          sprite_array.push({
            "key": "explode.unit_3",
            "offset_x": unit_offset_x,
            "offset_y": unit_offset_y
          });
        } else if (explode_step > 0) {
          sprite_array.push({
            "key": "explode.unit_4",
            "offset_x": unit_offset_x,
            "offset_y": unit_offset_y
          });
        } else {
          delete explosion_anim_map[ptile['index']];
        }

      }


      break;

    case LAYER_FOG:
      sprite_array = sprite_array.concat(fill_fog_sprite_array(ptile, pedge, pcorner));

      break;

    case LAYER_SPECIAL3:
      if (ptile != null) {
        sprite_array = sprite_array.concat(fill_layer3_sprite_array(ptile, pcity));
      }
      break;

    case LAYER_TILELABEL:
      if (ptile != null && ptile['label'] != null && ptile['label'].length > 0) {
        sprite_array.push(get_tile_label_text(ptile));
      }
      break;

    case LAYER_CITYBAR:
      if (pcity != null && show_citybar) {
        sprite_array.push(get_city_info_text(pcity));
      }

      if (active_city != null && ptile != null && ptile['worked'] != null
        && active_city['id'] == ptile['worked'] && active_city['output_food'] != null) {
        const ctile = city_tile(active_city);
        const d = map_distance_vector(ctile, ptile);
        const idx = get_city_dxy_to_index(d[0], d[1], active_city);

        let food_output = active_city['output_food'][idx];
        let shield_output = active_city['output_shield'][idx];
        let trade_output = active_city['output_trade'][idx];

        /* The ruleset may use large values scaled down to get greater
         * granularity. */
        food_output = Math.floor(food_output / game_info.granularity);
        shield_output = Math.floor(shield_output / game_info.granularity);
        trade_output = Math.floor(trade_output / game_info.granularity);

        sprite_array.push(get_city_food_output_sprite(food_output));
        sprite_array.push(get_city_shields_output_sprite(shield_output));
        sprite_array.push(get_city_trade_output_sprite(trade_output));
      } else if (active_city != null && ptile != null && ptile['worked'] != 0) {
        sprite_array.push(get_city_invalid_worked_sprite());
      }
      break;

    case LAYER_GOTO:
      if (ptile != null && ptile['goto_dir'] != null) {
        sprite_array = sprite_array.concat(fill_goto_line_sprite_array(ptile));
      }

      if (ptile != null && ptile['nuke'] > 0) {
        ptile['nuke'] = ptile['nuke'] - 1;
        sprite_array.push({
          "key": "explode.nuke",
          "offset_x": -45,
          "offset_y": -45
        });
      }

      break;
  }


  return sprite_array;

}


/****************************************************************************
  Add sprites for the base tile to the sprite list. This doesn't
  include specials or rivers.
****************************************************************************/
export function fill_terrain_sprite_layer(layer_num: number, ptile: any, pterrain: any, tterrain_near: any): any[] {
  /* FIXME: handle blending and darkness. */

  return fill_terrain_sprite_array(layer_num, ptile, pterrain, tterrain_near);

}

/****************************************************************************
  Helper function for fill_terrain_sprite_layer.
****************************************************************************/
export function fill_terrain_sprite_array(l: number, ptile: any, pterrain: any, tterrain_near: any): any[] {

  if (tile_types_setup["l" + l + "." + pterrain['graphic_str']] == null) {
    //console.log("missing " + "l" + l + "." + pterrain['graphic_str']);
    return [];
  }

  const dlp = tile_types_setup["l" + l + "." + pterrain['graphic_str']];

  switch (dlp['sprite_type']) {
    case CELL_WHOLE:
      {
        switch (dlp['match_style']) {
          case MATCH_NONE:
            {
              const result_sprites: any[] = [];
              if (dlp['dither'] == true) {
                for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
                  if (ts_tiles[tterrain_near[DIR4_TO_DIR8[i]]['graphic_str']] == null) continue;
                  const near_dlp = tile_types_setup["l" + l + "." + tterrain_near[DIR4_TO_DIR8[i]]['graphic_str']];
                  const terrain_near = (near_dlp['dither'] == true) ? tterrain_near[DIR4_TO_DIR8[i]]['graphic_str'] : pterrain['graphic_str'];
                  const dither_tile = i + pterrain['graphic_str'] + "_" + terrain_near;
                  const x = dither_offset_x[i];
                  const y = dither_offset_y[i];
                  result_sprites.push({ "key": dither_tile, "offset_x": x, "offset_y": y });
                }
                return result_sprites;

              } else {
                return [{ "key": "t.l" + l + "." + pterrain['graphic_str'] + 1 }];
              }
            }

          case MATCH_SAME:
            {
              let tileno = 0;
              const this_match_type = ts_tiles[pterrain['graphic_str']]['layer' + l + '_match_type'];

              for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
                if (ts_tiles[tterrain_near[i]['graphic_str']] == null) continue;
                const that = ts_tiles[tterrain_near[i]['graphic_str']]['layer' + l + '_match_type'];
                if (that == this_match_type) {
                  tileno |= 1 << i;
                }
              }
              const gfx_key = "t.l" + l + "." + pterrain['graphic_str'] + "_" + cardinal_index_str(tileno);
              const y = tileset_tile_height - tileset[gfx_key][3];

              return [{ "key": gfx_key, "offset_x": 0, "offset_y": y }];
            }
        }
      }

    case CELL_CORNER:
      {
        /* Divide the tile up into four rectangular cells. Each of these
         * cells covers one corner, and each is adjacent to 3 different
         * tiles. For each cell we pick a sprite based upon the adjacent
         * terrains at each of those tiles. Thus, we have 8 different sprites
         * for each of the 4 cells (32 sprites total).
         *
         * These arrays correspond to the direction4 ordering. */

        const W = normal_tile_width;
        const H = normal_tile_height;
        const iso_offsets = [[W / 4, 0], [W / 4, H / 2], [W / 2, H / 4], [0, H / 4]];
        const this_match_index = ('l' + l + '.' + pterrain['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + pterrain['graphic_str']]['match_index'][0] : -1;
        /* var that_match_index = ('l' + l + '.' + pterrain['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + pterrain['graphic_str']]['match_index'][1] : -1; */
        const result_sprites: any[] = [];

        /* Put corner cells */
        for (let i = 0; i < NUM_CORNER_DIRS; i++) {
          const count = dlp['match_indices'];
          let array_index = 0;
          const dir = dir_ccw(DIR4_TO_DIR8[i]); // Assuming dir_ccw exists
          const x = iso_offsets[i][0];
          const y = iso_offsets[i][1];

          const m = [('l' + l + '.' + tterrain_near[dir_ccw(dir)]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir_ccw(dir)]['graphic_str']]['match_index'][0] : -1,
          ('l' + l + '.' + tterrain_near[dir]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir]['graphic_str']]['match_index'][0] : -1,
          ('l' + l + '.' + tterrain_near[dir_cw(dir)]['graphic_str'] in tile_types_setup) ? tile_types_setup['l' + l + '.' + tterrain_near[dir_cw(dir)]['graphic_str']]['match_index'][0] : -1]; // Assuming dir_cw exists

          /* synthesize 4 dimensional array? */
          switch (dlp['match_style']) {
            case MATCH_NONE:
              /* We have no need for matching, just plug the piece in place. */
              break;
            case MATCH_SAME:
              const b1 = (m[2] != this_match_index) ? 1 : 0;
              const b2 = (m[1] != this_match_index) ? 1 : 0;
              const b3 = (m[0] != this_match_index) ? 1 : 0;
              array_index = array_index * 2 + b1;
              array_index = array_index * 2 + b2;
              array_index = array_index * 2 + b3;
              break;
            case MATCH_PAIR:
              // FIXME: This doesn't work!
              /*var b1 = (m[2] == that_match_index) ? 1 : 0;
              var b2 = (m[1] == that_match_index) ? 1 : 0;
              var b3 = (m[0] == that_match_index) ? 1 : 0;
              array_index = array_index * 2 + b1;
              array_index = array_index * 2 + b2;
              array_index = array_index * 2 + b3;*/

              return [];

            case MATCH_FULL:
              {
                const n: number[] = [];
                let j = 0;
                for (; j < 3; j++) {
                  let k = 0;
                  for (; k < count; k++) {
                    n[j] = k; /* default to last entry */
                    if (m[j] == dlp['match_index'][k]) {
                      break;
                    }
                  }
                }
                array_index = array_index * count + n[2];
                array_index = array_index * count + n[1];
                array_index = array_index * count + n[0];
              }
              break;
          };
          array_index = array_index * NUM_CORNER_DIRS + i;
          result_sprites.push({ "key": cellgroup_map[pterrain['graphic_str'] + "." + array_index] + "." + i, "offset_x": x, "offset_y": y });

        }

        return result_sprites;
      }
  }

  return [];

}


/**********************************************************************
  Determine the sprite_type string.
***********************************************************************/
export function check_sprite_type(sprite_type: string): number {
  if (sprite_type == "corner") {
    return CELL_CORNER;
  }
  if (sprite_type == "single") {
    return CELL_WHOLE;
  }
  if (sprite_type == "whole") {
    return CELL_WHOLE;
  }
  return CELL_WHOLE;
}


/**************************************************************************
 ...
**************************************************************************/
export function fill_unit_sprite_array(punit: any, stacked: boolean, backdrop: boolean): any[] {
  const unit_offset = get_unit_anim_offset(punit);
  const result: any[] = [get_unit_nation_flag_sprite(punit),
  {
    "key": tileset_unit_graphic_tag(punit),
    "offset_x": unit_offset['x'] + unit_offset_x,
    "offset_y": unit_offset['y'] - unit_offset_y
  }];
  const activities = get_unit_activity_sprite(punit);
  if (activities != null) {
    activities['offset_x'] = activities['offset_x'] + unit_offset['x'];
    activities['offset_y'] = activities['offset_y'] + unit_offset['y'];
    result.push(activities);
  }
  const agent = get_unit_agent_sprite(punit);
  if (agent != null) {
    agent['offset_x'] = agent['offset_x'] + unit_offset['x'];
    agent['offset_y'] = agent['offset_y'] + unit_offset['y'];
    result.push(agent);
  }

  if (should_ask_server_for_actions(punit)) {
    result.push({
      "key": "unit.action_decision_want",
      "offset_x": unit_activity_offset_x + unit_offset['x'],
      "offset_y": -unit_activity_offset_y + unit_offset['y'],
    });
  }

  result.push(get_unit_hp_sprite(punit));
  if (stacked) result.push(get_unit_stack_sprite());
  if (punit['veteran'] > 0) result.push(get_unit_veteran_sprite(punit));

  return result;
}

/**************************************************************************
  Return the tileset name of the direction. This is similar to
  dir_get_name but you shouldn't change this or all tilesets will break.
**************************************************************************/
export function dir_get_tileset_name(dir: number): string {
  switch (dir) {
    case DIR8_NORTH:
      return "n";
    case DIR8_NORTHEAST:
      return "ne";
    case DIR8_EAST:
      return "e";
    case DIR8_SOUTHEAST:
      return "se";
    case DIR8_SOUTH:
      return "s";
    case DIR8_SOUTHWEST:
      return "sw";
    case DIR8_WEST:
      return "w";
    case DIR8_NORTHWEST:
      return "nw";
  }

  return "";
}


/****************************************************************************
  Return a directional string for the cardinal directions. Normally the
  binary value 1000 will be converted into "n1e0s0w0". This is in a
  clockwise ordering.
****************************************************************************/
export function cardinal_index_str(idx: number): string {
  let c = "";

  for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
    const value = (idx >> i) & 1;

    c += dir_get_tileset_name(cardinal_tileset_dirs[i]) + value;
  }

  return c;
}


/***********************************************************************
  Return the flag graphic to be used by the city.
***********************************************************************/
export function get_city_flag_sprite(pcity: any): any {
  const owner_id = pcity['owner'];
  if (owner_id == null) return {};
  const owner = players[owner_id];
  if (owner == null) return {};
  const nation_id = owner['nation'];
  if (nation_id == null) return {};
  const nation = nations[nation_id];
  if (nation == null) return {};
  return {
    "key": "f." + nation['graphic_str'],
    "offset_x": city_flag_offset_x,
    "offset_y": - city_flag_offset_y
  };
}

/***********************************************************************
  Return the flag graphic to be used by the base on tile
***********************************************************************/
export function get_base_flag_sprite(ptile: any): any {
  const owner_id = ptile['extras_owner'];
  if (owner_id == null) return {};
  const owner = players[owner_id];
  if (owner == null) return {};
  const nation_id = owner['nation'];
  if (nation_id == null) return {};
  const nation = nations[nation_id];
  if (nation == null) return {};
  return {
    "key": "f." + nation['graphic_str'],
    "offset_x": city_flag_offset_x,
    "offset_y": - city_flag_offset_y
  };
}

/***********************************************************************
  Returns the sprite key for the number of defending units in a city.
***********************************************************************/
export function get_city_occupied_sprite(pcity: any): string {
  const owner_id = pcity['owner'];
  const ptile = city_tile(pcity);
  const punits = tile_units(ptile);

  if (!observing && client.conn.playing != null
    && owner_id != client.conn.playing.playerno && pcity['occupied']) {
    return "citybar.occupied";
  } else if (punits.length == 1) {
    return "citybar.occupancy_1";
  } else if (punits.length == 2) {
    return "citybar.occupancy_2";
  } else if (punits.length >= 3) {
    return "citybar.occupancy_3";
  } else {
    return "citybar.occupancy_0";
  }
}

/***********************************************************************
  ...
***********************************************************************/
export function get_city_food_output_sprite(num: number): any {
  return {
    "key": "city.t_food_" + num,
    "offset_x": normal_tile_width / 4,
    "offset_y": -normal_tile_height / 4
  };
}

/***********************************************************************
...
***********************************************************************/
export function get_city_shields_output_sprite(num: number): any {
  return {
    "key": "city.t_shields_" + num,
    "offset_x": normal_tile_width / 4,
    "offset_y": -normal_tile_height / 4
  };
}

/***********************************************************************
...
***********************************************************************/
export function get_city_trade_output_sprite(num: number): any {
  return {
    "key": "city.t_trade_" + num,
    "offset_x": normal_tile_width / 4,
    "offset_y": -normal_tile_height / 4
  };
}


/***********************************************************************
  Return the sprite for an invalid city worked tile.
***********************************************************************/
export function get_city_invalid_worked_sprite(): any {
  return {
    "key": "grid.unavailable",
    "offset_x": 0,
    "offset_y": 0
  };
}


/***********************************************************************
...
***********************************************************************/
export function fill_goto_line_sprite_array(ptile: any): any {
  return { "key": "goto_line", "goto_dir": ptile['goto_dir'] };
}

/***********************************************************************
...
***********************************************************************/
export function get_border_line_sprites(ptile: any): any[] {
  const result: any[] = [];

  for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
    const dir = cardinal_tileset_dirs[i];
    const checktile = mapstep(ptile, dir);

    if (checktile != null && checktile['owner'] != null
      && ptile['owner'] != null
      && ptile['owner'] != checktile['owner']
      && ptile['owner'] != 255 /* 255 is a special constant indicating that the tile is not owned by anyone. */
      && players[ptile['owner']] != null) {
      const pnation = nations[players[ptile['owner']]['nation']];
      result.push({
        "key": "border", "dir": dir,
        "color": pnation['color']
      });
    }
  }

  return result;
}


/***********************************************************************
  ...
***********************************************************************/
export function get_unit_nation_flag_sprite(punit: any): any {
  const owner_id = punit['owner'];

  if (unit_type(punit)['flags'].isSet(UTYF_FLAGLESS)
    && client.conn.playing != null
    && owner_id != client.conn.playing.playerno) {
    return [];
  } else {
    const owner = players[owner_id];
    const nation_id = owner['nation'];
    const nation = nations[nation_id];
    const unit_offset = get_unit_anim_offset(punit);

    return {
      "key": "f.shield." + nation['graphic_str'],
      "offset_x": unit_flag_offset_x + unit_offset['x'],
      "offset_y": - unit_flag_offset_y + unit_offset['y']
    };
  }
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_nation_flag_normal_sprite(punit: any): any {
  const owner_id = punit['owner'];
  const owner = players[owner_id];
  const nation_id = owner['nation'];
  const nation = nations[nation_id];
  const unit_offset = get_unit_anim_offset(punit);

  return {
    "key": "f." + nation['graphic_str'],
    "offset_x": unit_flag_offset_x + unit_offset['x'],
    "offset_y": - unit_flag_offset_y + unit_offset['y']
  };
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_stack_sprite(punit?: any): any {
  return {
    "key": "unit.stack",
    "offset_x": unit_flag_offset_x + -25,
    "offset_y": - unit_flag_offset_y - 15
  };
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_hp_sprite(punit: any): any {
  const hp = punit['hp'];
  const utype = unit_type(punit);
  const max_hp = utype['hp'];
  const healthpercent = 10 * Math.floor((10 * hp) / max_hp);
  const unit_offset = get_unit_anim_offset(punit);

  return {
    "key": "unit.hp_" + healthpercent,
    "offset_x": unit_flag_offset_x + -25 + unit_offset['x'],
    "offset_y": - unit_flag_offset_y - 15 + unit_offset['y']
  };
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_veteran_sprite(punit: any): any {
  return {
    "key": "unit.vet_" + punit['veteran'],
    "offset_x": unit_activity_offset_x - 20,
    "offset_y": - unit_activity_offset_y - 10
  };
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_activity_sprite(punit: any): any | null {
  if (punit['ssa_controller'] == SSA_AUTOEXPLORE) {
    // FIXME: Currently can't have SSA_AUTOEXPLORE sprite with activity sprites
    return null;
  }

  const activity = punit['activity'];
  const act_tgt = punit['activity_tgt'];

  switch (activity) {
    case ACTIVITY_CLEAN:
      return {
        "key": -1 == act_tgt ?
          "unit.pollution" :
          tileset_extra_id_rmactivity_graphic_tag(act_tgt),
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_MINE:
      return {
        "key": -1 == act_tgt ?
          "unit.plant" :
          tileset_extra_id_activity_graphic_tag(act_tgt),
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_PLANT:
      return {
        "key": "unit.plant",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_IRRIGATE:
      return {
        "key": -1 == act_tgt ?
          "unit.irrigate" :
          tileset_extra_id_activity_graphic_tag(act_tgt),
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_CULTIVATE:
      return {
        "key": "unit.cultivate",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_FORTIFIED:
      return {
        "key": "unit.fortified",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_BASE:
      return {
        "key": tileset_extra_id_activity_graphic_tag(act_tgt),
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_SENTRY:
      return {
        "key": "unit.sentry",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_PILLAGE:
      return {
        "key": "unit.pillage",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_GOTO:
      return {
        "key": "unit.goto",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_TRANSFORM:
      return {
        "key": "unit.transform",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_FORTIFYING:
      return {
        "key": "unit.fortifying",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_GEN_ROAD:
      return {
        "key": tileset_extra_id_activity_graphic_tag(act_tgt),
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };

    case ACTIVITY_CONVERT:
      return {
        "key": "unit.convert",
        "offset_x": unit_activity_offset_x,
        "offset_y": - unit_activity_offset_y
      };
  }

  if (unit_has_goto(punit)) {
    return {
      "key": "unit.goto",
      "offset_x": unit_activity_offset_x,
      "offset_y": - unit_activity_offset_y
    };
  }

  return null;
}

/***********************************************************************
  ...
***********************************************************************/
export function get_unit_agent_sprite(punit: any): any | null {
  switch (punit['ssa_controller']) {
    case SSA_NONE:
      break;
    case SSA_AUTOWORKER:
      return {
        "key": "unit.auto_worker",
        "offset_x": 0,
        "offset_y": 0
      };
    case SSA_AUTOEXPLORE:
      // Treated like an activity in the tilespec format
      return {
        "key": "unit.auto_explore",
        "offset_x": unit_activity_offset_x,
        "offset_y": -unit_activity_offset_y
      };
  }

  return null;
}

/****************************************************************************
  Return the sprite in the city_sprite listing that corresponds to this
  city - based on city style and size.

  See also load_city_sprite, free_city_sprite.
****************************************************************************/
export function get_city_sprite(pcity: any): any {
  let style_id = pcity['style'];
  if (style_id == -1) style_id = 0;   /* Sometimes a player has no city_style. */
  const city_rule = city_rules[style_id];

  let size = 0;
  if (pcity['size'] >= 4 && pcity['size'] <= 7) {
    size = 1;
  } else if (pcity['size'] >= 8 && pcity['size'] <= 11) {
    size = 2;
  } else if (pcity['size'] >= 12 && pcity['size'] <= 15) {
    size = 3;
  } else if (pcity['size'] >= 16) {
    size = 4;
  }

  const city_walls = pcity['walls'] ? "wall" : "city";

  let tag = city_rule['graphic'] + "_" + city_walls + "_" + size;
  if (sprites[tag] == null) {
    tag = city_rule['graphic_alt'] + "_" + city_walls + "_" + size;
  }

  return { "key": tag, "offset_x": 0, "offset_y": -unit_offset_y };
}


/****************************************************************************
  Add sprites for fog (and some forms of darkness).
****************************************************************************/
export function fill_fog_sprite_array(ptile: any, pedge: any, pcorner: any): any[] {

  let i, tileno = 0;

  if (pcorner == null) return [];

  for (i = 3; i >= 0; i--) {
    const unknown = 0, fogged = 1, known = 2;
    let value = -1;

    if (pcorner['tile'][i] == null) {
      value = unknown;
    } else {
      switch (tile_get_known(pcorner['tile'][i])) {
        case TILE_KNOWN_SEEN:
          value = known;
          break;
        case TILE_KNOWN_UNSEEN:
          value = fogged;
          break;
        case TILE_UNKNOWN:
          value = unknown;
          break;
      }
    }
    tileno = tileno * 3 + value;
  }

  if (tileno >= 80) return [];

  return [{ "key": fullfog[tileno] }];

}

/****************************************************************************
 ...
****************************************************************************/
export function get_select_sprite(): any {
  // update selected unit sprite 6 times a second.
  current_select_sprite = (Math.floor(new Date().getTime() * 6 / 1000) % max_select_sprite);
  return { "key": "unit.select" + current_select_sprite };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_city_info_text(pcity: any): any {
  return {
    "key": "city_text", "city": pcity,
    "offset_x": citybar_offset_x, "offset_y": citybar_offset_y
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_tile_label_text(ptile: any): any {
  return {
    "key": "tile_label", "tile": ptile,
    "offset_x": tilelabel_offset_x, "offset_y": tilelabel_offset_y
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_tile_specials_sprite(ptile: any): any | null {
  const extra_id = tile_resource(ptile);

  if (extra_id !== null) {
    const extra = extras[extra_id];
    if (extra != null) {
      return { "key": extra['graphic_str'] };
    }
  }
  return null;
}

/****************************************************************************
 ...
****************************************************************************/
export function get_tile_river_sprite(ptile: any): any | null {
  if (ptile == null) {
    return null;
  }

  if (tile_has_extra(ptile, EXTRA_RIVER)) {
    let river_str = "";
    for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
      const dir = cardinal_tileset_dirs[i];
      const checktile = mapstep(ptile, dir);
      if (checktile
        && (tile_has_extra(checktile, EXTRA_RIVER) || is_ocean_tile(checktile))) {
        river_str = river_str + dir_get_tileset_name(dir) + "1";
      } else {
        river_str = river_str + dir_get_tileset_name(dir) + "0";
      }

    }
    return { "key": "road.river_s_" + river_str };
  }

  const pterrain = tile_terrain(ptile);
  if (pterrain['graphic_str'] == "coast") {
    for (let i = 0; i < num_cardinal_tileset_dirs; i++) {
      const dir = cardinal_tileset_dirs[i];
      const checktile = mapstep(ptile, dir);
      if (checktile != null && tile_has_extra(checktile, EXTRA_RIVER)) {
        return { "key": "road.river_outlet_" + dir_get_tileset_name(dir) };
      }
    }
  }

  return null;

}

/****************************************************************************
 ...
****************************************************************************/
export function get_unit_image_sprite(punit: any): any {
  const from_type = get_unit_type_image_sprite(unit_type(punit));

  /* TODO: Find out what the purpose of this is, if it is needed here and if
   * it is needed in get_unit_type_image_sprite() too. It was the only
   * difference from get_unit_type_image_sprite() before
   * get_unit_image_sprite() started to use it. It was added in
   * f4a3ef358d1462d1f0ef7529982c417ddc402583 but that commit is to huge for
   * me to figure out what it does. */
  from_type["height"] = from_type["height"] - 2;

  return from_type;
}


/****************************************************************************
 ...
****************************************************************************/
export function get_unit_type_image_sprite(punittype: any): any | null {
  const tag = tileset_unit_type_graphic_tag(punittype);

  if (tag == null) {
    return null;
  }

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_improvement_image_sprite(pimprovement: any): any | null {
  const tag = tileset_building_graphic_tag(pimprovement);

  if (tag == null) {
    return null;
  }

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_specialist_image_sprite(tag: string): any | null {
  if (tileset[tag] == null) return null;

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}


/****************************************************************************
 ...
****************************************************************************/
export function get_technology_image_sprite(ptech: any): any | null {
  const tag = tileset_tech_graphic_tag(ptech);

  if (tag == null) return null;

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_nation_flag_sprite(pnation: any): any | null {
  const tag = "f." + pnation['graphic_str'];

  if (tileset[tag] == null) return null;

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_treaty_agree_thumb_up(): any {
  const tag = "treaty.agree_thumb_up";

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}

/****************************************************************************
 ...
****************************************************************************/
export function get_treaty_disagree_thumb_down(): any {
  const tag = "treaty.disagree_thumb_down";

  const tileset_x = tileset[tag][0];
  const tileset_y = tileset[tag][1];
  const width = tileset[tag][2];
  const height = tileset[tag][3];
  const i = tileset[tag][4];
  return {
    "tag": tag,
    "image-src": "/tileset/freeciv-web-tileset-" + tileset_name + "-" + i + get_tileset_file_extention() + "?ts=" + ts,
    "tileset-x": tileset_x,
    "tileset-y": tileset_y,
    "width": width,
    "height": height
  };
}


/****************************************************************************
  Returns a list of tiles to draw to render roads, railroads, and maglevs.
  TODO:
    - Support generic road types
    - Properly support generic extra hiding properties
****************************************************************************/
export function fill_path_sprite_array(ptile: any, pcity: any): any[] {
  const rs_maglev = typeof EXTRA_MAGLEV !== 'undefined';
  const road = tile_has_extra(ptile, EXTRA_ROAD);
  const rail = tile_has_extra(ptile, EXTRA_RAIL);
  const maglev = rs_maglev && tile_has_extra(ptile, EXTRA_MAGLEV);
  const road_near: boolean[] = [];
  const rail_near: boolean[] = [];
  const maglev_near: boolean[] = [];
  const draw_rail: boolean[] = [];
  const draw_road: boolean[] = [];
  const draw_maglev: boolean[] = [];
  const result_sprites: any[] = [];
  let draw_single_road: boolean;
  let draw_single_rail: boolean;
  let draw_single_maglev: boolean;

  if (pcity != null) {
    draw_single_road = draw_single_rail = draw_single_maglev = false;
  } else if (maglev) {
    draw_single_road = draw_single_rail = false;
    draw_single_maglev = maglev;
  } else {
    draw_single_road = road && rail == false;
    draw_single_rail = rail;
    draw_single_maglev = false;
  }

  for (let dir = 0; dir < 8; dir++) {
    /* Check if there is adjacent road/rail/maglev. */
    const tile1 = mapstep(ptile, dir);
    if (tile1 != null && tile_get_known(tile1) != TILE_UNKNOWN) {
      road_near[dir] = tile_has_extra(tile1, EXTRA_ROAD);
      rail_near[dir] = tile_has_extra(tile1, EXTRA_RAIL);
      maglev_near[dir] = rs_maglev && tile_has_extra(tile1, EXTRA_MAGLEV);

      /* Draw path if there is a connection from this tile to the
       * adjacent tile. But don't draw path if there is also an extra
       * hiding it. */
      draw_maglev[dir] = maglev && maglev_near[dir];
      draw_rail[dir] = rail && rail_near[dir] && !draw_maglev[dir];
      draw_road[dir] = road && road_near[dir] && !draw_rail[dir] && !draw_maglev[dir];
    }
  }

  return result_sprites;
}

/**************************************************************************
  Fill layer 1 sprite array (fortress background).
**************************************************************************/
export function fill_layer1_sprite_array(ptile: any, pcity: any): any[] {
  const result_sprites: any[] = [];

  if (pcity == null) {
    if (tile_has_extra(ptile, EXTRA_FORTRESS)) {
      result_sprites.push({"key": "base.fortress_bg",
                           "offset_y": -normal_tile_height / 2});
    }
  }

  return result_sprites;
}

/**************************************************************************
  Fill layer 2 sprite array (airbase, buoy, ruins).
**************************************************************************/
export function fill_layer2_sprite_array(ptile: any, pcity: any): any[] {
  const result_sprites: any[] = [];

  if (pcity == null) {
    if (tile_has_extra(ptile, EXTRA_AIRBASE)) {
      result_sprites.push({"key": "base.airbase_mg",
                           "offset_y": -normal_tile_height / 2});
    }
    if (tile_has_extra(ptile, EXTRA_BUOY)) {
      result_sprites.push((window as any).get_base_flag_sprite(ptile));
      result_sprites.push({"key": "base.buoy_mg",
                           "offset_y": -normal_tile_height / 2});
    }
    if (tile_has_extra(ptile, EXTRA_RUINS)) {
      result_sprites.push({"key": "extra.ruins_mg",
                           "offset_y": -normal_tile_height / 2});
    }
  }

  return result_sprites;
}

/**************************************************************************
  Fill layer 3 sprite array (fortress foreground).
**************************************************************************/
export function fill_layer3_sprite_array(ptile: any, pcity: any): any[] {
  const result_sprites: any[] = [];

  if (pcity == null) {
    if (tile_has_extra(ptile, EXTRA_FORTRESS)) {
      result_sprites.push({"key": "base.fortress_fg",
                           "offset_y": -normal_tile_height / 2});
    }
  }

  return result_sprites;
}

/**************************************************************************
  Assigns the nation's color based on the color of the flag.
**************************************************************************/
export function assign_nation_color(nation_id: number): void {
  const nation = nations[nation_id];
  if (nation == null || nation['color'] != null) return;

  const flag_key = "f." + nation['graphic_str'];
  const flag_sprite = sprites[flag_key];
  if (flag_sprite == null) return;
  const c = flag_sprite.getContext('2d');
  const width = tileset[flag_key][2];
  const height = tileset[flag_key][3];
  const color_counts: Record<string, number> = {};
  if (c == null) return;
  const img_data = c.getImageData(1, 1, width - 2, height - 2).data;

  for (let i = 0; i < img_data.length; i += 4) {
    const current_color = "rgb(" + img_data[i] + "," + img_data[i + 1] + ","
                        + img_data[i + 2] + ")";
    if (current_color in color_counts) {
      color_counts[current_color] = color_counts[current_color] + 1;
    } else {
      color_counts[current_color] = 1;
    }
  }

  let max = -1;
  let max_color: string | null = null;

  for (const current_color in color_counts) {
    if (color_counts[current_color] > max) {
      max = color_counts[current_color];
      max_color = current_color;
    }
  }

  nation['color'] = max_color;
}

/**************************************************************************
  Check if two colors are too similar.
**************************************************************************/
export function is_color_collision(color_a: string | null, color_b: string | null): boolean {
  const distance_threshold = 20;

  if (color_a == null || color_b == null) return false;

  const pcolor_a = color_rbg_to_list(color_a);
  const pcolor_b = color_rbg_to_list(color_b);
  if (!pcolor_a || !pcolor_b) return false;

  const color_distance = Math.sqrt(
    Math.pow(pcolor_a[0] - pcolor_b[0], 2)
    + Math.pow(pcolor_a[1] - pcolor_b[1], 2)
    + Math.pow(pcolor_a[2] - pcolor_b[2], 2));

  return (color_distance <= distance_threshold);
}

/**************************************************************************
  Convert RGB color string to number array.
**************************************************************************/
export function color_rbg_to_list(pcolor: string | null): number[] | null {
  if (pcolor == null) return null;
  const color_rgb = pcolor.match(/\d+/g);
  if (!color_rgb) return null;
  return [parseFloat(color_rgb[0]), parseFloat(color_rgb[1]), parseFloat(color_rgb[2])];
}
