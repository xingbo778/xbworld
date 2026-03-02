/**
 * Core game constants and enumerations.
 * Migrated from fc_types.js — all values match the Freeciv network protocol.
 */

export const TRI_NO = 0;
export const TRI_YES = 1;
export const TRI_MAYBE = 2;

export const MAX_NUM_ITEMS = 200;
export const MAX_NUM_ADVANCES = 250;
export const MAX_NUM_UNITS = 250;
export const MAX_NUM_BUILDINGS = 200;
export const MAX_EXTRA_TYPES = 250;
export const MAX_LEN_NAME = 48;
export const MAX_LEN_CITYNAME = 50;
export const FC_INFINITY = 1_000_000_000;

export const enum Activity {
  IDLE = 0,
  CULTIVATE = 1,
  MINE = 2,
  IRRIGATE = 3,
  FORTIFIED = 4,
  SENTRY = 5,
  PILLAGE = 6,
  GOTO = 7,
  EXPLORE = 8,
  TRANSFORM = 9,
  FORTIFYING = 10,
  CLEAN = 11,
  BASE = 12,
  GEN_ROAD = 13,
  CONVERT = 14,
  PLANT = 15,
  LAST = 16,
}

export const enum ActionResult {
  ESTABLISH_EMBASSY = 0,
  SPY_INVESTIGATE_CITY = 1,
  SPY_POISON = 2,
  SPY_STEAL_GOLD = 3,
  SPY_SABOTAGE_CITY = 4,
  SPY_TARGETED_SABOTAGE_CITY = 5,
  SPY_SABOTAGE_CITY_PRODUCTION = 6,
  SPY_STEAL_TECH = 7,
  SPY_TARGETED_STEAL_TECH = 8,
  SPY_INCITE_CITY = 9,
  TRADE_ROUTE = 10,
  MARKETPLACE = 11,
  HELP_WONDER = 12,
  SPY_BRIBE_UNIT = 13,
  SPY_SABOTAGE_UNIT = 14,
  CAPTURE_UNITS = 15,
  FOUND_CITY = 16,
  JOIN_CITY = 17,
  STEAL_MAPS = 18,
  BOMBARD = 19,
  SPY_NUKE = 20,
  NUKE = 21,
  NUKE_UNITS = 22,
  DESTROY_CITY = 23,
  EXPEL_UNIT = 24,
  RECYCLE_UNIT = 25,
  DISBAND_UNIT = 26,
  HOME_CITY = 27,
  UPGRADE_UNIT = 28,
  PARADROP = 29,
  AIRLIFT = 30,
  ATTACK = 31,
  STRIKE_BUILDING = 32,
  STRIKE_PRODUCTION = 33,
  CONQUER_CITY = 34,
  HEAL_UNIT = 35,
  TRANSFORM_TERRAIN = 36,
  CULTIVATE = 37,
  PLANT = 38,
  PILLAGE = 39,
  FORTIFY = 40,
  ROAD = 41,
  CONVERT = 42,
  BASE = 43,
  MINE = 44,
  IRRIGATE = 45,
  TRANSPORT_DEBOARD = 48,
  TRANSPORT_UNLOAD = 49,
  TRANSPORT_DISEMBARK = 50,
  TRANSPORT_BOARD = 51,
  TRANSPORT_EMBARK = 52,
  SPY_SPREAD_PLAGUE = 53,
  SPY_ATTACK = 54,
  CONQUER_EXTRAS = 55,
  HUT_ENTER = 56,
  HUT_FRIGHTEN = 57,
  UNIT_MOVE = 58,
  PARADROP_CONQUER = 59,
  HOMELESS = 60,
  WIPE_UNITS = 61,
  SPY_ESCAPE = 62,
  TRANSPORT_LOAD = 63,
  CLEAN = 64,
  TELEPORT = 65,
  ENABLER_CHECK = 66,
  NONE = 67,
}

export const enum ActionTargetKind {
  CITY = 0,
  UNIT = 1,
  UNITS = 2,
  TILE = 3,
  EXTRAS = 4,
  SELF = 5,
  COUNT = 6,
}

export const enum ActionDecision {
  NOTHING = 0,
  PASSIVE = 1,
  ACTIVE = 2,
}

export const enum OutputType {
  FOOD = 0,
  SHIELD = 1,
  TRADE = 2,
  GOLD = 3,
  LUXURY = 4,
  SCIENCE = 5,
}

export const enum VisionLayer {
  MAIN = 0,
  INVIS = 1,
  SUBSURFACE = 2,
  COUNT = 3,
}

export const enum ExtraCause {
  IRRIGATION = 0,
  MINE = 1,
  ROAD = 2,
  BASE = 3,
  POLLUTION = 4,
  FALLOUT = 5,
  HUT = 6,
  APPEARANCE = 7,
  RESOURCE = 8,
}

export const enum ExtraRemovalCause {
  PILLAGE = 0,
  CLEAN = 1,
  DISAPPEARANCE = 2,
  ENTER = 3,
}

export const enum BarbarianType {
  NOT_A_BARBARIAN = 0,
  LAND = 1,
  SEA = 2,
  ANIMAL = 3,
  LAND_AND_SEA = 4,
}

export const enum CapitalType {
  NOT = 0,
  SECONDARY = 1,
  PRIMARY = 2,
}

export const enum GuiType {
  STUB = 0,
  GTK2 = 1,
  GTK3 = 2,
  GTK3_22 = 3,
  QT = 4,
  SDL = 5,
  SDL2 = 6,
  SDL3 = 7,
  WEB = 8,
  GTK4 = 9,
  GTK5 = 10,
}

export const enum ReqProblemType {
  POSSIBLE = 0,
  CERTAIN = 1,
}

export const ACTION_COUNT = 139;
