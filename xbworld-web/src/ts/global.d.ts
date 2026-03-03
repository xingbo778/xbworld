/**
 * Type declarations for legacy global variables and functions.
 *
 * These declarations let TypeScript code safely reference globals that
 * are defined in the legacy webclient.min.js bundle. As modules are
 * migrated to TS, their declarations should be removed from this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Client state constants
// ---------------------------------------------------------------------------
declare const C_S_INITIAL: 0;
declare const C_S_PREPARING: 1;
declare const C_S_RUNNING: 2;
declare const C_S_OVER: 3;

declare const RENDERER_2DCANVAS: 1;
declare const RENDERER_WEBGL: 2;

// ---------------------------------------------------------------------------
// Core game state (mutable globals set by packhand.js)
// ---------------------------------------------------------------------------
declare let tiles: Record<number, any>;
declare let units: Record<number, any>;
declare let cities: Record<number, any>;
declare let players: Record<number, any>;
declare let terrains: Record<number, any>;
declare let techs: Record<number, any>;
declare let nations: Record<number, any>;
declare let governments: Record<number, any>;
declare let improvements: Record<number, any>;
declare let extras: Record<number, any>;
declare let unit_types: Record<number, any>;
declare let connections: Record<number, any>;

declare let map: {
  xsize: number;
  ysize: number;
  topology_id: number;
  wrap_id: number;
  [key: string]: any;
};

declare let game_info: {
  turn: number;
  year: number;
  timeout: number;
  phase: number;
  [key: string]: any;
} | null;

declare let client: {
  conn: {
    id: number;
    playing: any;
    observer: boolean;
    [key: string]: any;
  };
  [key: string]: any;
};

// ---------------------------------------------------------------------------
// Client-side state
// ---------------------------------------------------------------------------
declare let civclient_state: number;
declare let ws: WebSocket | null;
declare let civserverport: string | null;
declare let username: string | null;
declare let observing: boolean;
declare let renderer: number;
declare let client_frozen: boolean;
declare let autostart: boolean;
declare let keyboard_input: boolean;
declare let current_focus: any[];
declare let active_city: any | null;

declare let mapview: {
  gui_x0: number;
  gui_y0: number;
  width: number;
  height: number;
  store_width: number;
  store_height: number;
  [key: string]: any;
};

declare let mapview_canvas: HTMLCanvasElement;
declare let mapview_canvas_ctx: CanvasRenderingContext2D;
declare let sprites: Record<string, any>;
declare let tileset: Record<string, any>;
declare let dirty_tiles: Record<number, boolean>;
declare let dirty_all: boolean;
declare let sprites_init: boolean;
declare let loaded_images: number;
declare let tileset_image_count: number;

declare let ruleset_control: any;
declare let terrain_control: any;
declare let roads: any[];
declare let bases: any[];
declare let goto_request_map: Record<number, any>;

// Tileset config
declare let tileset_tile_width: number;
declare let tileset_tile_height: number;
declare const OVERVIEW_TILE_SIZE: number;

// ---------------------------------------------------------------------------
// Core functions — client state
// ---------------------------------------------------------------------------
declare function client_state(): number;
declare function set_client_state(state: number): void;
declare function can_client_control(): boolean;
declare function can_client_change_view(): boolean;
declare function client_is_observer(): boolean;

// ---------------------------------------------------------------------------
// Core functions — network
// ---------------------------------------------------------------------------
declare function send_request(packet: string): void;
declare function send_message(msg: string): void;
declare function network_init(): void;
declare function websocket_init(): void;
declare function check_websocket_ready(): void;

// ---------------------------------------------------------------------------
// Core functions — map & tiles
// ---------------------------------------------------------------------------
declare function index_to_tile(index: number): any;
declare function map_pos_to_tile(x: number, y: number): any;
declare function mapstep(tile: any, dir: number): any;
declare function tile_terrain(tile: any): any;
declare function tile_units(tile: any): any[];
declare function tile_city(tile: any): any;
declare function city_tile(city: any): any;
declare function canvas_pos_to_tile(x: number, y: number): any;

// ---------------------------------------------------------------------------
// Core functions — units
// ---------------------------------------------------------------------------
declare function unit_type(unit: any): any;
declare function unit_owner(unit: any): any;
declare function game_find_unit_by_number(id: number): any;

// ---------------------------------------------------------------------------
// Core functions — cities
// ---------------------------------------------------------------------------
declare function city_owner(city: any): any;
declare function game_find_city_by_number(id: number): any;

// ---------------------------------------------------------------------------
// Core functions — players
// ---------------------------------------------------------------------------
declare function player_by_number(playerno: number): any;

// ---------------------------------------------------------------------------
// Core functions — rendering
// ---------------------------------------------------------------------------
declare function update_map_canvas_check(): void;
declare function center_tile_mapcanvas(tile: any): void;
declare function center_tile_mapcanvas_2d(tile: any): void;
declare function init_mapview(): void;
declare function dirty_all_fn(): void;
declare function redraw_overview(): void;
declare function get_unit_image_sprite(unit: any): any;

// ---------------------------------------------------------------------------
// Core functions — UI
// ---------------------------------------------------------------------------
declare function show_dialog_message(title: string, message: string): void;
declare function update_game_status_panel(): void;
declare function update_city_screen(): void;
declare function update_nation_screen(): void;
declare function send_end_turn(): void;
declare function update_unit_focus(): void;
declare function advance_unit_focus(): void;
declare function request_new_unit_activity(unit: any, activity: number): void;

// ---------------------------------------------------------------------------
// Packet handling
// ---------------------------------------------------------------------------
declare function client_handle_packet(packets: any[]): void;
declare const packet_hand_table: Record<number, (packet: any) => void>;

// ---------------------------------------------------------------------------
// jQuery (minimal typing for bridge period)
// ---------------------------------------------------------------------------
interface JQueryStatic {
  (selector: string | Element | Document): any;
  ajax(options: any): any;
  blockUI(options?: any): void;
  unblockUI(): void;
  getUrlVar(name: string): string | null;
}
declare const $: JQueryStatic;
declare const jQuery: JQueryStatic;

// ---------------------------------------------------------------------------
// Third-party stubs
// ---------------------------------------------------------------------------
declare function swal(title: string, text?: string, type?: string): void;
declare const simpleStorage: {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
};
declare const audiojs: any;
declare const bmp_lib: {
  render(elementId: string, data: any, palette: any): void;
};
