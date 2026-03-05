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

// Globals from window (declared in global.d.ts)
declare const map: any;
declare const client: any;
declare const renderer: number;
declare const players: any;
declare const nations: any;
declare const terrains: any;
declare const bmp_lib: any;
declare const height_offset: number;

// Proper module imports
import { mapPosToTile } from '../data/map';
import { wrapHasFlag, WRAP_X, WRAP_Y } from '../data/map';
import { tileCity, tileGetKnown } from '../data/tile';
import { TILE_UNKNOWN } from '../data/tile';
import { tileTerrain } from '../data/terrain';
import { find_visible_unit } from './control';
import { cityOwnerPlayerId } from '../data/city';
import { center_tile_mapcanvas } from './control';
import { base_canvas_to_map_pos, canvas_pos_to_tile, mapview, mapview_slide } from '../renderer/mapviewCommon';
import { RENDERER_2DCANVAS } from './constants';
import { color_rbg_to_list } from '../renderer/tilespec';
import { clientState as client_state, C_S_RUNNING, C_S_OVER } from '../client/clientState';

// Alias snake_case names to camelCase imports
const map_pos_to_tile = mapPosToTile;
const tile_city = tileCity;
const tile_get_known = tileGetKnown;
const tile_terrain = tileTerrain;
const city_owner_player_id = cityOwnerPlayerId;
const wrap_has_flag = wrapHasFlag;

export let OVERVIEW_TILE_SIZE: number = 1;
export let overviewTimerId: number = -1;
export let min_overview_width: number = 200;
export let max_overview_width: number = 300;
export let max_overview_height: number = 300;

export let OVERVIEW_REFRESH: any;

export let palette: number[][] = [];
export let palette_color_offset: number = 0;
export let palette_terrain_offset: number = 0;

export let overview_active: boolean = false;

export const COLOR_OVERVIEW_UNKNOWN: number = 0; /* Black */
export const COLOR_OVERVIEW_MY_CITY: number = 1; /* white */
export const COLOR_OVERVIEW_ALLIED_CITY: number = 2;
export const COLOR_OVERVIEW_ENEMY_CITY: number = 3; /* cyan */
export const COLOR_OVERVIEW_MY_UNIT: number = 4; /* yellow */
export const COLOR_OVERVIEW_ALLIED_UNIT: number = 5;
export const COLOR_OVERVIEW_ENEMY_UNIT: number = 6; /* red */
export const COLOR_OVERVIEW_VIEWRECT: number = 7; /* white */

export let overview_hash: number = -1;
export let overview_current_state: any = null;


/****************************************************************************
  Initilaize the overview map.
****************************************************************************/
export function init_overview(): void {
  while (min_overview_width > OVERVIEW_TILE_SIZE * map['xsize']) {
    OVERVIEW_TILE_SIZE++;
  }

  overview_active = true;

  $("#game_overview_panel").attr("title", "World map");
  $("#game_overview_panel").dialog({
    bgiframe: true,
    modal: false,
    appendTo: '#tabs-map',
    resizable: false,
    closeOnEscape: false,
    dialogClass: 'overview_dialog no-close',
    autoResize:true,
    width: "auto",
    close: function(event: any, ui: any) { overview_active = false;}
  }).dialogExtend({
    "minimizable" : true,
    "maximizable" : true,
    "closable" : false,
    "minimize" : function(evt: any, dlg: any){
      overview_current_state = $("#game_overview_panel").dialogExtend("state");
    },
    "maximize" : function(evt: any, dlg: any){
      overview_current_state = $("#game_overview_panel").dialogExtend("state");
      $('#overview_map').width($("#game_overview_panel").width() - 20);
      $('#overview_map').height($("#game_overview_panel").height() - 20);
    },
    "restore" : function(evt: any, dlg: any){
      overview_current_state = $("#game_overview_panel").dialogExtend("state");
      let new_width = OVERVIEW_TILE_SIZE * map['xsize'];
      if (new_width > max_overview_width) new_width = max_overview_width;
      let new_height = OVERVIEW_TILE_SIZE * map['ysize'];
      if (new_height > max_overview_height) new_height = max_overview_height;
      $('#overview_map').width(new_width);
      $('#overview_map').height(new_height);
      $(".overview_dialog").position({my: 'left bottom', at: 'left bottom', of: window, within: $("#game_page")});
    },
    "icons" : {
      "minimize" : "ui-icon-circle-minus",
      "maximize" : "ui-icon-circle-plus",
      "restore" : "ui-icon-bullet"
    }});
  if (overview_current_state == "minimized") $("#game_overview_panel").dialogExtend("minimize");

  $("#game_overview_panel").parent().css("overflow", "hidden");

  palette = generate_palette();

  redraw_overview();

  let new_width = OVERVIEW_TILE_SIZE * map['xsize'];
  if (new_width > max_overview_width) new_width = max_overview_width;
  let new_height = OVERVIEW_TILE_SIZE * map['ysize'];
  if (new_height > max_overview_height) new_height = max_overview_height;
  $('#overview_map').width(new_width);
  $('#overview_map').height(new_height);
  $(".overview_dialog").position({my: 'left bottom', at: 'left bottom', of: window, within: $("#game_page")});

  $('#overview_map').on('dragstart', function(event: any) { event.preventDefault(); });
}

/****************************************************************************
  Redraw the overview map.
****************************************************************************/
export function redraw_overview(): void {
  if (mapview_slide['active'] || C_S_RUNNING > client_state()
      || map['xsize'] == null || map['ysize'] == null
      || $("#overview_map").length == 0) return;

  const hash: number = generate_overview_hash(map['xsize'], map['ysize']);

  if (hash != overview_hash) {
    bmp_lib.render('overview_img',
                    generate_overview_grid(map['xsize'], map['ysize']),
                    palette);
    overview_hash = hash;
    render_viewrect();
  }
}


/****************************************************************************
  Creates a grid representing the image for the overview map.
****************************************************************************/
export function generate_overview_grid(cols: number, rows: number): number[][] {
  // Loop variables
  let row: number;

  if (cols & 1) cols -= 1;  //Bugfix, the overview map doesn't support map size which is odd.
  if (rows & 1) rows -= 1;

  // The grid of points that make up the image.
  const grid: number[][] = Array(rows*OVERVIEW_TILE_SIZE);
  for (row = 0; row < rows * OVERVIEW_TILE_SIZE; row++) {
    grid[row] = Array(cols * OVERVIEW_TILE_SIZE);
  }

  for (let x = 0; x < rows ; x++) {
    for (let y = 0; y < cols; y++) {
      const ocolor: number = overview_tile_color(y, x);
      render_multipixel(grid, x, y, ocolor);
    }
  }

  return grid;
}

/****************************************************************************
  Creates a hash of the current overview map.
****************************************************************************/
export function generate_overview_hash(cols: number, rows: number): number {

  let hash: number = 0;

  for (let x = 0; x < rows ; x++) {
    for (let y = 0; y < cols; y++) {
      hash += overview_tile_color(y, x);
    }
  }

  const r: any = base_canvas_to_map_pos(0, 0);
  if (r != null) {
    hash += r['map_x'];
    hash += r['map_y'];
  }
  return hash;
}

/****************************************************************************
  ...
****************************************************************************/
export function render_viewrect(): void {
  if (C_S_RUNNING != client_state() && C_S_OVER != client_state()) return;

  const path: number[][] = [];

  if (mapview['gui_x0'] != 0 && mapview['gui_y0'] != 0) {

    let point: any = base_canvas_to_map_pos(0, 0);
    path.push([point.map_x, point.map_y]);
    point = base_canvas_to_map_pos(mapview['width'], 0);
    path.push([point.map_x, point.map_y]);
    point = base_canvas_to_map_pos(mapview['width'], mapview['height']);
    path.push([point.map_x, point.map_y]);
    point = base_canvas_to_map_pos(0, mapview['height']);
    path.push([point.map_x, point.map_y]);

  }

  const viewrect_canvas: HTMLCanvasElement | null = document.getElementById('overview_viewrect') as HTMLCanvasElement | null;
  if (viewrect_canvas == null) return;

  const map_w: number = $('#overview_map').width();
  const map_h: number = $('#overview_map').height();
  viewrect_canvas.width = map_w;
  viewrect_canvas.height = map_h;

  const viewrect_ctx: CanvasRenderingContext2D | null = viewrect_canvas.getContext("2d");
  if (viewrect_ctx == null) return;

  viewrect_ctx.clearRect(0, 0, map_w, map_h);
  viewrect_ctx.strokeStyle = 'rgb(200,200,255)';
  viewrect_ctx.lineWidth = map.xsize / map_w;
  viewrect_ctx.scale(map_w/map.xsize, map_h/map.ysize);

  viewrect_ctx.beginPath();
  add_closed_path(viewrect_ctx, path);

  if (wrap_has_flag(WRAP_X)) {
    viewrect_ctx.save();
    viewrect_ctx.translate(map.xsize, 0);
    add_closed_path(viewrect_ctx, path);
    viewrect_ctx.translate(-2 * map.xsize, 0);
    add_closed_path(viewrect_ctx, path);
    viewrect_ctx.restore();
  }

  if (wrap_has_flag(WRAP_Y)) {
    viewrect_ctx.translate(0, map.ysize);
    add_closed_path(viewrect_ctx, path);
    viewrect_ctx.translate(0, -2 * map.ysize);
    add_closed_path(viewrect_ctx, path);
    if (wrap_has_flag(WRAP_X)) {
      viewrect_ctx.translate(-map.xsize, 0);
      add_closed_path(viewrect_ctx, path);
      viewrect_ctx.translate(0, 2 * map.ysize);
      add_closed_path(viewrect_ctx, path);
      viewrect_ctx.translate(2 * map.xsize, 0);
      add_closed_path(viewrect_ctx, path);
      viewrect_ctx.translate(0, -2 * map.ysize);
      add_closed_path(viewrect_ctx, path);
    }
  }

  viewrect_ctx.stroke();
}

export function add_closed_path(ctx: CanvasRenderingContext2D, path: number[][]): void {
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i][0], path[i][1]);
  }
  ctx.lineTo(path[0][0], path[0][1]);
}

/****************************************************************************
  ...
****************************************************************************/
export function render_multipixel(grid: number[][], x: number, y: number, ocolor: number): void {
  if (x >= 0 && y >= 0 && x < map['ysize'] && y < map['xsize']) {
    for (let px = 0; px < OVERVIEW_TILE_SIZE; px++) {
      for (let py = 0; py < OVERVIEW_TILE_SIZE; py++) {
          grid[(OVERVIEW_TILE_SIZE*x)+px][(OVERVIEW_TILE_SIZE*y)+py] = ocolor;
      }
    }
  }
}

/****************************************************************************
  Creates the palette for the overview map.
****************************************************************************/
export function generate_palette(): number[][] {
  const palette: number[][] = [];
  palette[COLOR_OVERVIEW_UNKNOWN] = [0,0,0];
  palette[COLOR_OVERVIEW_MY_CITY] = [255,255,255];
  palette[COLOR_OVERVIEW_ALLIED_CITY] = [0,255,255];
  palette[COLOR_OVERVIEW_ENEMY_CITY] = [0,255,255];
  palette[COLOR_OVERVIEW_MY_UNIT] = [255,255,0];
  palette[COLOR_OVERVIEW_ALLIED_UNIT] = [255,0,0];
  palette[COLOR_OVERVIEW_ENEMY_UNIT] = [255,0,0];
  palette[COLOR_OVERVIEW_VIEWRECT] = [200,200,255];
  palette_terrain_offset = palette.length;
  for (const terrain_id in terrains) {
    const terrain: any = terrains[terrain_id];
    palette.push([terrain['color_red'], terrain['color_green'], terrain['color_blue']]);
  }

  palette_color_offset = palette.length;
  const player_count: number = Object.keys(players).length;

  for (const player_id_str in players) {
    const player_id = Number(player_id_str);
    const pplayer: any = players[player_id];
    if (pplayer['nation'] == -1) {
      palette[palette_color_offset+(player_id % player_count)] = [0,0,0];
    } else {
      const pcolor: any = nations[pplayer['nation']]['color'];
      if (pcolor != null) {
        palette[palette_color_offset+(player_id % player_count)] = color_rbg_to_list(pcolor);
      } else {
        palette[palette_color_offset+(player_id % player_count)] = [0,0,0];
      }
    }
  }
  return palette;
}

/****************************************************************************
  Returns the color of the tile at the given map position.
****************************************************************************/
export function overview_tile_color(map_x: number, map_y: number): number {
  const ptile: any = map_pos_to_tile(map_x, map_y);

  const pcity: any = tile_city(ptile);

  if (pcity != null) {
    if (client.conn.playing == null) {
      return COLOR_OVERVIEW_ENEMY_CITY;
    } else if (city_owner_player_id(pcity) == client.conn.playing['id']) {
      return COLOR_OVERVIEW_MY_CITY;
    } else {
      return COLOR_OVERVIEW_ENEMY_CITY;
    }
  }

  const punit: any = find_visible_unit(ptile);
  if (punit != null) {
    if (client.conn.playing == null) {
      return COLOR_OVERVIEW_ENEMY_UNIT;
    } else if (punit['owner'] == client.conn.playing['id']) {
      return COLOR_OVERVIEW_MY_UNIT;
    } else if (punit['owner'] != null && punit['owner'] != 255) {
      return palette_color_offset + punit['owner'];
    } else {
      return COLOR_OVERVIEW_ENEMY_UNIT;
    }
  }

  if (tile_get_known(ptile) != TILE_UNKNOWN) {
    if (ptile['owner'] != null && ptile['owner'] != 255) {
      return palette_color_offset + ptile['owner'];
    } else {
      return palette_terrain_offset + tile_terrain(ptile)['id'];
    }
  }

  return COLOR_OVERVIEW_UNKNOWN;
}


/****************************************************************************
  ...
****************************************************************************/
export function overview_clicked (x: number, y: number): void {
  const width: number = $("#overview_map").width();
  const height: number = $("#overview_map").height();

  const x1: number = Math.floor((x * map['xsize']) / width);
  const y1: number = Math.floor((y * map['ysize']) / height);

  const ptile: any = map_pos_to_tile(x1, y1);
  if (ptile != null) {
    center_tile_mapcanvas(ptile);
  }

  redraw_overview();
}
