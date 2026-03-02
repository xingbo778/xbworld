/**
 * Game constants — TypeScript version of fc_types.js.
 *
 * This module exports typed constants that can be imported in new TypeScript
 * files. The original fc_types.js continues to work for legacy code via
 * global vars.
 *
 * Migration: new .ts files should `import { Activity } from './types/fc_types'`
 * instead of relying on globals.
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

export const enum ActionTargetKind {
  CITY = 0,
  UNIT = 1,
  UNITS = 2,
  TILE = 3,
  EXTRAS = 4,
  SELF = 5,
  COUNT = 6,
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

export const enum BarbarianType {
  NOT_A_BARBARIAN = 0,
  LAND = 1,
  SEA = 2,
  ANIMAL = 3,
  LAND_AND_SEA = 4,
}

export const IDENTITY_NUMBER_ZERO = 0;
