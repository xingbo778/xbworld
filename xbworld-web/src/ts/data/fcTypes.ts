/**
 * XBWorld — fc_types constants (migrated from fc_types.js)
 *
 * This module contains all the game-wide constants used by both TS and
 * Legacy code.  Constants are exposed to `window` via `exposeToLegacy`
 * so they are available to legacy JS as global variables.
 *
 * NOTE: We only expose constants that are actually referenced by TS
 * modules.  Legacy code already has its own definitions in fc_types.js;
 * re-exposing them would be harmless but unnecessary.
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Tri-state boolean
// ---------------------------------------------------------------------------
export const TRI_NO = 0;
export const TRI_YES = 1;
export const TRI_MAYBE = 2;

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------
export const MAX_NUM_ITEMS = 200;
export const MAX_NUM_ADVANCES = 250;
export const MAX_NUM_UNITS = 250;
export const MAX_NUM_BUILDINGS = 200;
export const MAX_EXTRA_TYPES = 250;
export const MAX_LEN_NAME = 48;
export const MAX_LEN_CITYNAME = 50;
export const FC_INFINITY = 1000 * 1000 * 1000;

// ---------------------------------------------------------------------------
// Activity types
// ---------------------------------------------------------------------------
export const ACTIVITY_IDLE = 0;
export const ACTIVITY_CULTIVATE = 1;
export const ACTIVITY_MINE = 2;
export const ACTIVITY_IRRIGATE = 3;
export const ACTIVITY_FORTIFIED = 4;
export const ACTIVITY_SENTRY = 5;
export const ACTIVITY_PILLAGE = 6;
export const ACTIVITY_GOTO = 7;
export const ACTIVITY_EXPLORE = 8;
export const ACTIVITY_TRANSFORM = 9;
export const ACTIVITY_FORTIFYING = 10;
export const ACTIVITY_CLEAN = 11;
export const ACTIVITY_BASE = 12;
export const ACTIVITY_GEN_ROAD = 13;
export const ACTIVITY_CONVERT = 14;
export const ACTIVITY_PLANT = 15;
export const ACTIVITY_LAST = 16;

// ---------------------------------------------------------------------------
// Action results (enum action_result)
// ---------------------------------------------------------------------------
export const ACTRES_ESTABLISH_EMBASSY = 0;
export const ACTRES_SPY_INVESTIGATE_CITY = 1;
export const ACTRES_SPY_POISON = 2;
export const ACTRES_SPY_STEAL_GOLD = 3;
export const ACTRES_SPY_SABOTAGE_CITY = 4;
export const ACTRES_SPY_TARGETED_SABOTAGE_CITY = 5;
export const ACTRES_SPY_SABOTAGE_CITY_PRODUCTION = 6;
export const ACTRES_SPY_STEAL_TECH = 7;
export const ACTRES_SPY_TARGETED_STEAL_TECH = 8;
export const ACTRES_SPY_INCITE_CITY = 9;
export const ACTRES_TRADE_ROUTE = 10;
export const ACTRES_MARKETPLACE = 11;
export const ACTRES_HELP_WONDER = 12;
export const ACTRES_SPY_BRIBE_UNIT = 13;
export const ACTRES_SPY_SABOTAGE_UNIT = 14;
export const ACTRES_CAPTURE_UNITS = 15;
export const ACTRES_FOUND_CITY = 16;
export const ACTRES_JOIN_CITY = 17;
export const ACTRES_STEAL_MAPS = 18;
export const ACTRES_BOMBARD = 19;
export const ACTRES_SPY_NUKE = 20;
export const ACTRES_NUKE = 21;
export const ACTRES_NUKE_UNITS = 22;
export const ACTRES_DESTROY_CITY = 23;
export const ACTRES_EXPEL_UNIT = 24;
export const ACTRES_RECYCLE_UNIT = 25;
export const ACTRES_DISBAND_UNIT = 26;
export const ACTRES_HOME_CITY = 27;
export const ACTRES_UPGRADE_UNIT = 28;
export const ACTRES_PARADROP = 29;
export const ACTRES_AIRLIFT = 30;
export const ACTRES_ATTACK = 31;
export const ACTRES_STRIKE_BUILDING = 32;
export const ACTRES_STRIKE_PRODUCTION = 33;
export const ACTRES_CONQUER_CITY = 34;
export const ACTRES_HEAL_UNIT = 35;
export const ACTRES_TRANSFORM_TERRAIN = 36;
export const ACTRES_CULTIVATE = 37;
export const ACTRES_PLANT = 38;
export const ACTRES_PILLAGE = 39;
export const ACTRES_FORTIFY = 40;
export const ACTRES_ROAD = 41;
export const ACTRES_CONVERT = 42;
export const ACTRES_BASE = 43;
export const ACTRES_MINE = 44;
export const ACTRES_IRRIGATE = 45;
export const ACTRES_CLEAN = 46;
export const ACTRES_NONE = 47;

// ---------------------------------------------------------------------------
// Requirement types (VUT_*)
// Values MUST match fc_types.js (alphabetical enum order used by XBWorld)
// ---------------------------------------------------------------------------
export const VUT_NONE = 0;
export const VUT_ACHIEVEMENT = 1;
export const VUT_ACTION = 2;
export const VUT_ACTIVITY = 3;
export const VUT_ADVANCE = 4;
export const VUT_AGE = 5;
export const VUT_AI_LEVEL = 6;
export const VUT_CITYSTATUS = 7;
export const VUT_CITYTILE = 8;
export const VUT_COUNTER = 9;
export const VUT_DIPLREL = 10;
export const VUT_DIPLREL_TILE = 11;
export const VUT_DIPLREL_TILE_O = 12;
export const VUT_DIPLREL_UNITANY = 13;
export const VUT_DIPLREL_UNITANY_O = 14;
export const VUT_EXTRA = 15;
export const VUT_EXTRAFLAG = 16;
export const VUT_FORM_AGE = 17;
export const VUT_GOOD = 18;
export const VUT_GOVERNMENT = 19;
export const VUT_IMPROVEMENT = 20;
export const VUT_IMPR_FLAG = 21;
export const VUT_IMPR_GENUS = 22;
export const VUT_MAXLATITUDE = 23;
export const VUT_MAXTILEUNITS = 24;
export const VUT_MAX_DISTANCE_SQ = 25;
export const VUT_MAX_REGION_TILES = 26;
export const VUT_MINCALFRAG = 27;
export const VUT_MINCITIES = 28;
export const VUT_MINCULTURE = 29;
export const VUT_MINFOREIGNPCT = 30;
export const VUT_MINHP = 31;
export const VUT_MINLATITUDE = 32;
export const VUT_MINMOVES = 33;
export const VUT_MINSIZE = 34;
export const VUT_MINTECHS = 35;
export const VUT_MINVETERAN = 36;
export const VUT_MINYEAR = 37;
export const VUT_NATION = 38;
export const VUT_NATIONALITY = 39;
export const VUT_NATIONGROUP = 40;
export const VUT_ORIGINAL_OWNER = 41;
export const VUT_OTYPE = 42;
export const VUT_PLAYER_FLAG = 43;
export const VUT_PLAYER_STATE = 44;
export const VUT_ROADFLAG = 45;
export const VUT_SERVERSETTING = 46;
export const VUT_SITE = 47;
export const VUT_SPECIALIST = 48;
export const VUT_STYLE = 49;
export const VUT_TECHFLAG = 50;
export const VUT_TERRAIN = 51;
export const VUT_TERRAINALTER = 52;
export const VUT_TERRAINCLASS = 53;
export const VUT_TERRFLAG = 54;
export const VUT_TILE_REL = 55;
export const VUT_TOPO = 56;
export const VUT_UCFLAG = 57;
export const VUT_UCLASS = 58;
export const VUT_UNITSTATE = 59;
export const VUT_UTFLAG = 60;
export const VUT_UTYPE = 61;
export const VUT_WRAP = 62;
export const VUT_COUNT = 63;

// ---------------------------------------------------------------------------
// Requirement ranges (REQ_RANGE_*)
// ---------------------------------------------------------------------------
export const REQ_RANGE_LOCAL = 0;
export const REQ_RANGE_TILE = 1;
export const REQ_RANGE_CADJACENT = 2;
export const REQ_RANGE_ADJACENT = 3;
export const REQ_RANGE_CITY = 4;
export const REQ_RANGE_TRADEROUTE = 5;
export const REQ_RANGE_CONTINENT = 6;
export const REQ_RANGE_PLAYER = 7;
export const REQ_RANGE_TEAM = 8;
export const REQ_RANGE_ALLIANCE = 9;
export const REQ_RANGE_WORLD = 10;
export const REQ_RANGE_COUNT = 11;

// ---------------------------------------------------------------------------
// Requirement probability types
// ---------------------------------------------------------------------------
export const RPT_POSSIBLE = 0;
export const RPT_CERTAIN = 1;

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------
export const O_FOOD = 0;
export const O_SHIELD = 1;
export const O_TRADE = 2;
export const O_GOLD = 3;
export const O_LUXURY = 4;
export const O_SCIENCE = 5;

// ---------------------------------------------------------------------------
// Vision layers
// ---------------------------------------------------------------------------
export const V_MAIN = 0;
export const V_INVIS = 1;
export const V_SUBSURFACE = 2;
export const V_COUNT = 3;

// ---------------------------------------------------------------------------
// Extra causes
// ---------------------------------------------------------------------------
export const EC_IRRIGATION = 0;
export const EC_MINE = 1;
export const EC_ROAD = 2;
export const EC_BASE = 3;
export const EC_POLLUTION = 4;
export const EC_FALLOUT = 5;
export const EC_HUT = 6;
export const EC_APPEARANCE = 7;
export const EC_RESOURCE = 8;

// ---------------------------------------------------------------------------
// Extra removal causes
// ---------------------------------------------------------------------------
export const ERM_PILLAGE = 0;
export const ERM_CLEAN = 1;
export const ERM_DISAPPEARANCE = 2;
export const ERM_ENTER = 3;

// ---------------------------------------------------------------------------
// Barbarian types
// ---------------------------------------------------------------------------
export const NOT_A_BARBARIAN = 0;
export const LAND_BARBARIAN = 1;
export const SEA_BARBARIAN = 2;
export const ANIMAL_BARBARIAN = 3;
export const LAND_AND_SEA_BARBARIAN = 4;

// ---------------------------------------------------------------------------
// Capital types
// ---------------------------------------------------------------------------
export const CAPITAL_NOT = 0;
export const CAPITAL_SECONDARY = 1;
export const CAPITAL_PRIMARY = 2;

// ---------------------------------------------------------------------------
// Tech states
// ---------------------------------------------------------------------------
export const TECH_UNKNOWN = 0;
export const TECH_PREREQS_KNOWN = 1;
export const TECH_KNOWN = 2;

// ---------------------------------------------------------------------------
// Expose only constants that TS modules need and that may not yet be
// defined when TS loads.  Most constants are already set by fc_types.js
// which loads before ts-bundle.  We expose them anyway so TS modules
// can import them with type safety.
// ---------------------------------------------------------------------------

// We do NOT expose fc_types constants via exposeToLegacy because:
// 1. Legacy fc_types.js already defines them as window globals
// 2. Re-defining them is harmless but wasteful
// 3. TS modules should import them from this file for type safety
//
// If a future TS module needs a constant that isn't here, add it above
// and import it.  Do NOT add exposeToLegacy calls for constants that
// legacy code already defines.
