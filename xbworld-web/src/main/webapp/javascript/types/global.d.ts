/**
 * Global type declarations for XBWorld game client.
 *
 * These types describe the existing global variables and jQuery extensions
 * used throughout the codebase, enabling gradual TypeScript migration
 * without breaking existing JS code.
 */

interface JQueryStatic {
  getUrlVar(key: string): string | null;
  blockUI(options?: { message?: string }): void;
  unblockUI(): void;
}

declare var client: {
  conn: {
    playing: PlayerInfo | null;
  };
};

declare var game_info: {
  turn: number;
  year: number;
  timeout: number;
  gold: number;
} | null;

declare var map: {
  xsize: number;
  ysize: number;
} | null;

declare var techs: Record<number, TechInfo>;
declare var players: Record<number, PlayerInfo>;
declare var units: Record<number, UnitInfo>;
declare var cities: Record<number, CityInfo>;

interface PlayerInfo {
  playerno: number;
  name: string;
  nation: number;
  is_alive: boolean;
  gold: number;
  tax: number;
  luxury: number;
  science: number;
  government: number;
}

interface UnitInfo {
  id: number;
  owner: number;
  type: number;
  tile: number;
  hp: number;
  veteran: number;
  movesleft: number;
  activity: number;
  goto_tile: number;
}

interface CityInfo {
  id: number;
  owner: number;
  name: string;
  tile: number;
  size: number;
  food_stock: number;
  shield_stock: number;
  production_kind: number;
  production_value: number;
}

interface TechInfo {
  id: number;
  name: string;
}

declare var ws: WebSocket | null;
declare var civserverport: number | null;

declare var mapview_canvas: HTMLCanvasElement;
declare var mapview_canvas_ctx: CanvasRenderingContext2D;

declare var FC_I18N: {
  _lang: string;
  _dict: Record<string, Record<string, string>>;
  tr(key: string): string;
  setLang(lang: string): void;
};

declare function swal(title: string, text?: string, type?: string): void;
declare function swal(options: {
  title: string;
  text?: string;
  html?: boolean;
  type?: string;
  showCancelButton?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}): void;

declare function network_init(): void;
declare function websocket_init(): void;
declare function show_dialog_message(title: string, message: string): void;
declare function activate_goto(): void;
declare function key_unit_auto_explore(): void;
declare function key_unit_fortify(): void;
declare function key_unit_pillage(): void;
declare function request_unit_build_city(): void;
declare function key_unit_auto_work(): void;
declare function key_unit_irrigate(): void;
declare function key_unit_cultivate(): void;
declare function key_unit_road(): void;
declare function key_unit_plant(): void;
declare function key_unit_mine(): void;
declare function key_unit_transform(): void;
declare function key_unit_clean(): void;
declare function key_unit_sentry(): void;
declare function key_unit_paradrop(): void;
declare function key_unit_nuke(): void;
declare function key_unit_homecity(): void;
declare function key_unit_disband(): void;
declare function save_game(): void;
declare function show_fullscreen_window(): void;
declare function surrender_game(): void;
declare function switch_renderer(): void;
declare function show_replay(): void;
declare function show_revolution_dialog(): void;
declare function show_tax_rates_dialog(): void;
declare function show_spaceship_dialog(): void;
declare function request_report(type: number): void;
declare function toggleLanguage(): void;

declare var REPORT_WONDERS_OF_THE_WORLD_LONG: number;
declare var REPORT_TOP_CITIES: number;
declare var REPORT_DEMOGRAPHIC: number;
