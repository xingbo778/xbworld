/**
 * Core data types for the Freeciv game state.
 * These interfaces mirror the server packet structures.
 */

export interface GameInfo {
  turn: number;
  year: number;
  timeout: number;
  first_timeout: number;
  phase: number;
  phase_mode: number;
  [key: string]: unknown;
}

export interface CalendarInfo {
  positive_year_label: string;
  negative_year_label: string;
  [key: string]: unknown;
}

export interface MapInfo {
  xsize: number;
  ysize: number;
  topology_id: number;
  wrap_id: number;
  [key: string]: unknown;
}

export interface Tile {
  index: number;
  x: number;
  y: number;
  terrain: number;
  known: number;
  extras: number[];
  owner: number;
  worked: number;
  resource: number;
  continent: number;
  height?: number;
  [key: string]: unknown;
}

export interface Terrain {
  id: number;
  name: string;
  graphic_str: string;
  movement_cost: number;
  defense_bonus: number;
  output: number[];
  [key: string]: unknown;
}

export interface UnitType {
  id: number;
  name: string;
  rule_name: string;
  graphic_str: string;
  attack_strength: number;
  defense_strength: number;
  move_rate: number;
  hp: number;
  firepower: number;
  build_cost: number;
  vision_radius_sq: number;
  flags: number[];
  [key: string]: unknown;
}

export interface Unit {
  id: number;
  owner: number;
  tile: number;
  type: number;
  hp: number;
  veteran: number;
  movesleft: number;
  activity: number;
  transported_by: number;
  homecity: number;
  done_moving: boolean;
  ai: boolean;
  goto_tile: number;
  [key: string]: unknown;
}

export interface City {
  id: number;
  owner: number;
  tile: number;
  name: string;
  size: number;
  food_stock: number;
  shield_stock: number;
  production_kind: number;
  production_value: number;
  surplus: number[];
  waste: number[];
  unhappy_penalty: number[];
  prod: number[];
  citizen_extra: number[];
  ppl_happy: number[];
  ppl_content: number[];
  ppl_unhappy: number[];
  ppl_angry: number[];
  improvements: boolean[];
  [key: string]: unknown;
}

export interface Player {
  playerno: number;
  name: string;
  username: string;
  nation: number;
  is_alive: boolean;
  is_ready: boolean;
  ai_skill_level: number;
  gold: number;
  tax: number;
  luxury: number;
  science: number;
  expected_income: number;
  team: number;
  embassy_txt: string;
  [key: string]: unknown;
}

export interface Tech {
  id: number;
  name: string;
  rule_name: string;
  [key: string]: unknown;
}

export interface Connection {
  id: number;
  playing: Player | null;
  observer: boolean;
  [key: string]: unknown;
}

export interface Nation {
  id: number;
  adjective: string;
  translation_name: string;
  flag_graphic: string;
  [key: string]: unknown;
}

export interface Government {
  id: number;
  name: string;
  rule_name: string;
  [key: string]: unknown;
}

export interface Improvement {
  id: number;
  name: string;
  rule_name: string;
  genus: number;
  build_cost: number;
  [key: string]: unknown;
}

export interface Extra {
  id: number;
  name: string;
  rule_name: string;
  causes: number;
  rmcauses: number;
  [key: string]: unknown;
}

export interface ServerSetting {
  val: unknown;
  [key: string]: unknown;
}
