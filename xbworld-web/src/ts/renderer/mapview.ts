import { store } from '../data/store';
import { cityOwner as city_owner, getCityProductionType as get_city_production_type } from '../data/city';
import { game_find_city_by_number as find_city_by_number } from '../data/game';
import { tileset_unit_type_graphic_tag } from '../renderer/tilespec';
import { tileset_ruleset_entity_tag_str_or_alt, get_city_flag_sprite, get_city_occupied_sprite } from '../renderer/tilespec';
import { orientation_changed } from '../utils/mobile';
import { mark_all_dirty, update_map_canvas_full, update_map_canvas, map_to_gui_pos } from './mapviewCommon';
import { tileset_tile_width, tileset_tile_height, normal_tile_width } from './tilesetConfig';

// DIR8 constants - defined locally since they're simple enums
const DIR8_NORTH = 0;
const DIR8_EAST = 2;
const DIR8_SOUTH = 4;
const DIR8_WEST = 6;

// webgl_preload is loaded from a separate WebGL module at runtime
declare function webgl_preload(): void;
// setup_window_size is a global function
declare function setup_window_size(): void;

declare const $: any; // jQuery
declare const swal: any; // SweetAlert
declare const tileset_image_count: number;
declare const tileset_name: string;
declare const get_tileset_file_extention: () => string;
declare const ts: any; // Timestamp or similar
declare const tileset: any; // Tileset configuration object
declare const mapview: any; // Global mapview object
declare let MAPVIEW_REFRESH_INTERVAL: number;
declare const renderer: any; // Renderer type
declare const RENDERER_WEBGL: any; // Renderer type constant
declare const RENDERER_2DCANVAS: any; // Renderer type constant
declare const active_city: any; // Active city object
declare const resize_enabled: boolean;
declare const citydlg_map_width: number;
declare const citydlg_map_height: number;
declare const overview_active: boolean;
declare const chatbox_active: boolean;
declare const mapview_slide: any; // mapview_slide object
declare const VUT_UTYPE: any; // Unit type constant
declare const nations: any; // Nations data

let mapview_canvas_ctx: CanvasRenderingContext2D | null = null;
let mapview_canvas: HTMLCanvasElement | null = null;
let buffer_canvas_ctx: CanvasRenderingContext2D | null = null;
let buffer_canvas: HTMLCanvasElement | null = null;
let city_canvas_ctx: CanvasRenderingContext2D | null = null;
let city_canvas: HTMLCanvasElement | null = null;

let tileset_images: HTMLImageElement[] = [];
let sprites: { [key: string]: HTMLCanvasElement } = {};
let loaded_images: number = 0;

let sprites_init: boolean = false;

let canvas_text_font: string = "16px Georgia, serif"; // with canvas text support

let fullfog: string[] = [];

const GOTO_DIR_DX: number[] = [0, 1, 2, -1, 1, -2, -1, 0];
const GOTO_DIR_DY: number[] = [-2, -1, 0, -1, 1, 0, 1, 2];
let dashedSupport: boolean = false;

/**************************************************************************
  ...
**************************************************************************/
export function init_mapview(): void {

  $("#canvas_div").append($('<canvas/>', { id: 'canvas' }));

  /* Loads the two tileset definition files */
  $.ajax({
    url: "/javascript/2dcanvas/tileset_config_amplio2.js",
    dataType: "script",
    async: false
  }).fail(function() {
    console.error("Unable to load tileset config.");
  });

  $.ajax({
    url: "/javascript/2dcanvas/tileset_spec_amplio2.js",
    dataType: "script",
    async: false
  }).fail(function() {
    console.error("Unable to load tileset spec. Run Freeciv-img-extract.");
  });

  mapview_canvas = document.getElementById('canvas') as HTMLCanvasElement;
  mapview_canvas_ctx = mapview_canvas.getContext("2d");
  buffer_canvas = document.createElement('canvas');
  buffer_canvas_ctx = buffer_canvas.getContext('2d');

  if (mapview_canvas_ctx && "imageSmoothingEnabled" in mapview_canvas_ctx) {
    // if this Boolean value is false, images won't be smoothed when scaled. This property is true by default.
    mapview_canvas_ctx.imageSmoothingEnabled = false;
  }
  if (mapview_canvas_ctx) {
    dashedSupport = ("setLineDash" in mapview_canvas_ctx);
  }

  setup_window_size();

  mapview['gui_x0'] = 0;
  mapview['gui_y0'] = 0;



  /* Initialize fog array. */
  let i: number;
  for (i = 0; i < 81; i++) {
    /* Unknown, fog, known. */
    const ids: string[] = ['u', 'f', 'k'];
    let buf: string = "t.fog";
    const values: number[] = [];
    let j: number, k: number = i;

    for (j = 0; j < 4; j++) {
      values[j] = k % 3;
      k = Math.floor(k / 3);

      buf += "_" + ids[values[j]];

    }

    fullfog[i] = buf;
  }

  if (is_small_screen()) MAPVIEW_REFRESH_INTERVAL = 12;

  orientation_changed();
  init_sprites();
  if (mapview_canvas) {
    requestAnimationFrame(update_map_canvas_check, mapview_canvas);
  }
}


/**************************************************************************
  ...
**************************************************************************/
export function is_small_screen(): boolean {
  if ($(window).width() <= 640 || $(window).height() <= 590) {
    return true;
  } else {
    return false;
  }

}

/**************************************************************************
  This will load the tileset, blocking the UI while loading.
**************************************************************************/
export function init_sprites(): void {
  $.blockUI({
    message: "<h1>Freeciv-web is loading. Please wait..."
      + "<br><center><img src='/images/loading.gif'></center></h1>"
  });

  if (loaded_images != tileset_image_count) {
    for (let i = 0; i < tileset_image_count; i++) {
      const tileset_image = new Image();
      tileset_image.onload = preload_check;
      tileset_image.src = '/tileset/freeciv-web-tileset-'
        + tileset_name + '-' + i + get_tileset_file_extention() + '?ts=' + ts;
      tileset_images[i] = tileset_image;
    }
  } else {
    // already loaded
    if (renderer == RENDERER_WEBGL) {
      webgl_preload();
    } else {
      $.unblockUI();
    }
  }

}

/**************************************************************************
  Determines when the whole tileset has been preloaded.
**************************************************************************/
export function preload_check(): void {
  loaded_images += 1;

  if (loaded_images == tileset_image_count) {
    init_cache_sprites();
    if (renderer == RENDERER_WEBGL) {
      webgl_preload();
    } else {
      $.unblockUI();
    }
  }
}

/**************************************************************************
  ...
**************************************************************************/
export function init_cache_sprites(): void {
  try {

    if (typeof tileset === 'undefined') {
      swal("Tileset not generated correctly. Run sync.sh in "
        + "freeciv-img-extract and recompile.");
      return;
    }

    for (const tile_tag in tileset) {
      const x = tileset[tile_tag][0];
      const y = tileset[tile_tag][1];
      const w = tileset[tile_tag][2];
      const h = tileset[tile_tag][3];
      const i = tileset[tile_tag][4];

      const newCanvas = document.createElement('canvas');
      newCanvas.height = h;
      newCanvas.width = w;
      const newCtx = newCanvas.getContext('2d');

      if (newCtx) {
        newCtx.drawImage(tileset_images[i], x, y,
          w, h, 0, 0, w, h);
        sprites[tile_tag] = newCanvas;
      }
    }

    sprites_init = true;
    tileset_images[0] = null as any; // Set to null to free memory
    tileset_images[1] = null as any; // Set to null to free memory
    tileset_images = null as any; // Set to null to free memory

  } catch (e: any) {
    console.log("Problem caching sprite: " + (e.message || e));
  }

}

/**************************************************************************
  ...
**************************************************************************/
export function mapview_window_resized(): void {
  if (active_city != null || !resize_enabled) return;
  setup_window_size();
  if (renderer == RENDERER_2DCANVAS) {
    if (typeof mark_all_dirty === 'function') mark_all_dirty();
    update_map_canvas_full();
  }
}

/**************************************************************************
  ...
**************************************************************************/
export function drawPath(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): void {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.lineTo(x1, y1);
}

/**************************************************************************
  ...
**************************************************************************/
export function mapview_put_tile(pcanvas: CanvasRenderingContext2D, tag: string, canvas_x: number, canvas_y: number): void {
  if (sprites[tag] == null) {
    //console.log("Missing sprite " + tag);
    return;
  }

  pcanvas.drawImage(sprites[tag], canvas_x, canvas_y);

}

/****************************************************************************
  Draw a filled-in colored rectangle onto the mapview or citydialog canvas.
****************************************************************************/
export function canvas_put_rectangle(canvas_context: CanvasRenderingContext2D, pcolor: string, canvas_x: number, canvas_y: number, width: number, height: number): void {
  canvas_context.fillStyle = pcolor;
  canvas_context.fillRect(canvas_x, canvas_y, width, height); // Corrected width/height for fillRect
}

/****************************************************************************
  Draw a colored rectangle onto the mapview.
****************************************************************************/
export function canvas_put_select_rectangle(canvas_context: CanvasRenderingContext2D, canvas_x: number, canvas_y: number, width: number, height: number): void {
  canvas_context.beginPath();
  canvas_context.strokeStyle = "rgb(255,0,0)";
  canvas_context.rect(canvas_x, canvas_y, width, height);
  canvas_context.stroke();

}


/**************************************************************************
  Draw city text onto the canvas.
**************************************************************************/
export function mapview_put_city_bar(pcanvas: CanvasRenderingContext2D, city: any, canvas_x: number, canvas_y: number): void {
  const text: string = decodeURIComponent(city['name']).toUpperCase();
  const size: number = city['size'];
  const color: string = nations[city_owner(city)['nation']]['color'];
  const prod_type: any = get_city_production_type(city);

  const txt_measure = pcanvas.measureText(text);
  const size_measure = pcanvas.measureText(size.toString());
  pcanvas.globalAlpha = 0.7;
  pcanvas.fillStyle = "rgba(0, 0, 0, 0.5)";
  pcanvas.fillRect(canvas_x - Math.floor(txt_measure.width / 2) - 14, canvas_y - 17,
    txt_measure.width + 20, 20);

  pcanvas.fillStyle = color;
  pcanvas.fillRect(canvas_x + Math.floor(txt_measure.width / 2) + 5, canvas_y - 19,
    (prod_type != null) ? size_measure.width + 35 : size_measure.width + 8, 24);

  const city_flag = get_city_flag_sprite(city);
  pcanvas.drawImage(sprites[city_flag['key']],
    canvas_x - Math.floor(txt_measure.width / 2) - 45, canvas_y - 17);

  pcanvas.drawImage(sprites[get_city_occupied_sprite(city)],
    canvas_x - Math.floor(txt_measure.width / 2) - 12, canvas_y - 16);

  pcanvas.strokeStyle = color;
  pcanvas.lineWidth = 1.5;
  pcanvas.beginPath();
  pcanvas.moveTo(canvas_x - Math.floor(txt_measure.width / 2) - 46, canvas_y - 18);
  pcanvas.lineTo(canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 13,
    canvas_y - 18);
  pcanvas.moveTo(canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 13,
    canvas_y + 4);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 46, canvas_y + 4);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 46, canvas_y - 18);
  pcanvas.moveTo(canvas_x - Math.floor(txt_measure.width / 2) - 15, canvas_y - 17);
  pcanvas.lineTo(canvas_x - Math.floor(txt_measure.width / 2) - 15, canvas_y + 3);
  pcanvas.stroke();

  pcanvas.globalAlpha = 1.0;

  if (prod_type != null) {
    let tag: string | null;
    if (city['production_kind'] == VUT_UTYPE) {
      tag = tileset_unit_type_graphic_tag(prod_type);
    } else {
      tag = tileset_ruleset_entity_tag_str_or_alt(prod_type, "building");
    }

    if (tag == null) {
      return;
    }

    pcanvas.drawImage(sprites[tag],
      canvas_x + Math.floor(txt_measure.width / 2) + size_measure.width + 13,
      canvas_y - 19, 28, 24);
  }

  pcanvas.fillStyle = "rgba(0, 0, 0, 1)";
  pcanvas.fillText(size.toString(), canvas_x + Math.floor(txt_measure.width / 2) + 10, canvas_y + 1);

  pcanvas.fillStyle = "rgba(255, 255, 255, 1)";
  pcanvas.fillText(text, canvas_x - Math.floor(txt_measure.width / 2) - 2, canvas_y - 1);
  pcanvas.fillText(size.toString(), canvas_x + Math.floor(txt_measure.width / 2) + 8, canvas_y - 1);
}

/**************************************************************************
  Draw tile label onto the canvas.
**************************************************************************/
export function mapview_put_tile_label(pcanvas: CanvasRenderingContext2D, tile: any, canvas_x: number, canvas_y: number): void {
  const text: string = tile['label'];
  if (text != null && text.length > 0) {
    const txt_measure = pcanvas.measureText(text);

    pcanvas.fillStyle = "rgba(255, 255, 255, 1)";
    pcanvas.fillText(text, canvas_x + normal_tile_width / 2 - Math.floor(txt_measure.width / 2), canvas_y - 1);
  }
}

/**************************************************************************
  Renders the national border lines onto the canvas.
**************************************************************************/
export function mapview_put_border_line(pcanvas: CanvasRenderingContext2D, dir: number, color: string, canvas_x: number, canvas_y: number): void {
  const x: number = canvas_x + 47;
  const y: number = canvas_y + 3;
  pcanvas.strokeStyle = color;
  pcanvas.beginPath();

  if (dir == DIR8_NORTH) {
    pcanvas.moveTo(x, y - 2);
    pcanvas.lineTo(x + (tileset_tile_width / 2), y + (tileset_tile_height / 2) - 2);
  } else if (dir == DIR8_EAST) {
    pcanvas.moveTo(x - 3, y + tileset_tile_height - 3);
    pcanvas.lineTo(x + (tileset_tile_width / 2) - 3, y + (tileset_tile_height / 2) - 3);
  } else if (dir == DIR8_SOUTH) {
    pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
    pcanvas.lineTo(x + 3, y + tileset_tile_height - 3);
  } else if (dir == DIR8_WEST) {
    pcanvas.moveTo(x - (tileset_tile_width / 2) + 3, y + (tileset_tile_height / 2) - 3);
    pcanvas.lineTo(x + 3, y - 3);
  }
  pcanvas.closePath();
  pcanvas.stroke();

}

/**************************************************************************
...
**************************************************************************/
export function mapview_put_goto_line(pcanvas: CanvasRenderingContext2D, dir: number, canvas_x: number, canvas_y: number): void {

  const x0: number = canvas_x + (tileset_tile_width / 2);
  const y0: number = canvas_y + (tileset_tile_height / 2);
  const x1: number = x0 + GOTO_DIR_DX[dir] * (tileset_tile_width / 2);
  const y1: number = y0 + GOTO_DIR_DY[dir] * (tileset_tile_height / 2);

  pcanvas.strokeStyle = 'rgba(0,168,255,0.9)';
  pcanvas.lineWidth = 10;
  pcanvas.lineCap = "round";
  pcanvas.beginPath();
  pcanvas.moveTo(x0, y0);
  pcanvas.lineTo(x1, y1);
  pcanvas.stroke();

}

/**************************************************************************
  ...
**************************************************************************/
export function set_city_mapview_active(): void {
  city_canvas = document.getElementById('city_canvas') as HTMLCanvasElement;
  if (city_canvas == null) return;
  city_canvas_ctx = city_canvas.getContext('2d');
  if (city_canvas_ctx) {
    city_canvas_ctx.font = canvas_text_font;
  }

  mapview_canvas_ctx = city_canvas.getContext("2d");

  mapview['width'] = citydlg_map_width;
  mapview['height'] = citydlg_map_height;
  mapview['store_width'] = citydlg_map_width;
  mapview['store_height'] = citydlg_map_height;

  set_default_mapview_inactive();
}

/**************************************************************************
  ...
**************************************************************************/
export function set_default_mapview_inactive(): void {
  if (overview_active) $("#game_overview_panel").parent().hide();
  $("#game_unit_panel").parent().hide();
  if (chatbox_active) $("#game_chatbox_panel").parent().hide();
}

/**************************************************************************
 Initializes mapview sliding. This is done by rendering the area to scroll
 across to a new canvas (buffer_canvas), and clip a region of this
 buffer_canvas to the mapview canvas so it looks like scrolling.
**************************************************************************/
export function enable_mapview_slide(ptile: any): void {
  const r = map_to_gui_pos(ptile['x'], ptile['y']);
  let gui_x: number = r['gui_dx'];
  let gui_y: number = r['gui_dy'];

  gui_x -= (mapview['width'] - tileset_tile_width) >> 1;
  gui_y -= (mapview['height'] - tileset_tile_height) >> 1;

  const dx: number = gui_x - mapview['gui_x0'];
  const dy: number = gui_y - mapview['gui_y0'];
  mapview_slide['dx'] = dx;
  mapview_slide['dy'] = dy;
  mapview_slide['i'] = mapview_slide['max'];
  mapview_slide['start'] = new Date().getTime();

  if ((dx == 0 && dy == 0) || mapview_slide['active']
    || Math.abs(dx) > mapview['width'] || Math.abs(dy) > mapview['height']) {
    // sliding across map edge: don't slide, just go there directly.
    mapview_slide['active'] = false;
    update_map_canvas_full();
    return;
  }

  mapview_slide['active'] = true;

  const new_width: number = mapview['width'] + Math.abs(dx);
  const new_height: number = mapview['height'] + Math.abs(dy);
  const old_width: number = mapview['store_width'];
  const old_height: number = mapview['store_height'];

  mapview_canvas = buffer_canvas;
  mapview_canvas_ctx = buffer_canvas_ctx;

  if (dx >= 0 && dy <= 0) {
    mapview['gui_y0'] -= Math.abs(dy);
  } else if (dx <= 0 && dy >= 0) {
    mapview['gui_x0'] -= Math.abs(dx);
  } else if (dx <= 0 && dy <= 0) {
    mapview['gui_x0'] -= Math.abs(dx);
    mapview['gui_y0'] -= Math.abs(dy);
  }

  mapview['store_width'] = new_width;
  mapview['store_height'] = new_height;
  mapview['width'] = new_width;
  mapview['height'] = new_height;

  /* redraw mapview on large back buffer. */
  if (dx >= 0 && dy >= 0) {
    update_map_canvas(old_width, 0, dx, new_height);
    update_map_canvas(0, old_height, old_width, dy);
  } else if (dx <= 0 && dy <= 0) {
    update_map_canvas(0, 0, Math.abs(dx), new_height);
    update_map_canvas(Math.abs(dx), 0, old_width, Math.abs(dy));
  } else if (dx <= 0 && dy >= 0) {
    update_map_canvas(0, 0, Math.abs(dx), new_height);
    update_map_canvas(Math.abs(dx), old_height, old_width, Math.abs(dy));
  } else if (dx >= 0 && dy <= 0) {
    update_map_canvas(0, 0, new_width, Math.abs(dy));
    update_map_canvas(old_width, Math.abs(dy), Math.abs(dx), old_height);
  }

  /* restore default mapview. */
  mapview_canvas = document.getElementById('canvas') as HTMLCanvasElement;
  mapview_canvas_ctx = mapview_canvas.getContext("2d");

  if (buffer_canvas_ctx && mapview_canvas) {
    if (dx >= 0 && dy >= 0) {
      buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, 0, 0, old_width, old_height);
    } else if (dx <= 0 && dy <= 0) {
      buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, Math.abs(dx), Math.abs(dy), old_width, old_height);
    } else if (dx <= 0 && dy >= 0) {
      buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, Math.abs(dx), 0, old_width, old_height);
    } else if (dx >= 0 && dy <= 0) {
      buffer_canvas_ctx.drawImage(mapview_canvas, 0, 0, old_width, old_height, 0, Math.abs(dy), old_width, old_height);
    }
  }
  mapview['store_width'] = old_width;
  mapview['store_height'] = old_height;
  mapview['width'] = old_width;
  mapview['height'] = old_height;
}

// TODO: update_map_canvas_check needs to be imported or defined.
declare function update_map_canvas_check(time: DOMHighResTimeStamp): void;
