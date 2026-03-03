/**
 * Event type constants — must match freeciv/common/events.h.
 *
 * These were previously defined inside webclient.min.js (Closure Compiler output).
 * Phase 4 split webclient.min.js into individual source files, but these constants
 * were not extracted. Legacy JS files (e.g., client_main.js, messages.js) reference
 * them as globals.
 *
 * We expose ALL event constants (not just the 12 currently referenced) to avoid
 * future breakage as more legacy code is exercised.
 */

// --- Event type IDs (from freeciv/common/events.h) ---

export const E_CITY_CANTBUILD = 0;
export const E_CITY_LOST = 1;
export const E_CITY_LOVE = 2;
export const E_CITY_DISORDER = 3;
export const E_CITY_FAMINE = 4;
export const E_CITY_FAMINE_FEARED = 5;
export const E_CITY_GROWTH = 6;
export const E_CITY_MAY_SOON_GROW = 7;
export const E_CITY_AQUEDUCT = 8;
export const E_CITY_AQ_BUILDING = 9;
export const E_CITY_NORMAL = 10;
export const E_CITY_NUKED = 11;
export const E_CITY_CMA_RELEASE = 12;
export const E_CITY_GRAN_THROTTLE = 13;
export const E_CITY_TRANSFER = 14;
export const E_CITY_BUILD = 15;
export const E_CITY_PRODUCTION_CHANGED = 16;
export const E_WORKLIST = 17;
export const E_UPRISING = 18;
export const E_CIVIL_WAR = 19;
export const E_ANARCHY = 20;
export const E_FIRST_CONTACT = 21;
export const E_NEW_GOVERNMENT = 22;
export const E_LOW_ON_FUNDS = 23;
export const E_POLLUTION = 24;
export const E_REVOLT_DONE = 25;
export const E_REVOLT_START = 26;
export const E_SPACESHIP = 27;
export const E_MY_DIPLOMAT_BRIBE = 28;
export const E_DIPLOMATIC_INCIDENT = 29;
export const E_MY_DIPLOMAT_ESCAPE = 30;
export const E_MY_DIPLOMAT_EMBASSY = 31;
export const E_MY_DIPLOMAT_FAILED = 32;
export const E_MY_DIPLOMAT_INCITE = 33;
export const E_MY_DIPLOMAT_POISON = 34;
export const E_MY_DIPLOMAT_SABOTAGE = 35;
export const E_MY_DIPLOMAT_THEFT = 36;
export const E_ENEMY_DIPLOMAT_BRIBE = 37;
export const E_ENEMY_DIPLOMAT_EMBASSY = 38;
export const E_ENEMY_DIPLOMAT_FAILED = 39;
export const E_ENEMY_DIPLOMAT_INCITE = 40;
export const E_ENEMY_DIPLOMAT_POISON = 41;
export const E_ENEMY_DIPLOMAT_SABOTAGE = 42;
export const E_ENEMY_DIPLOMAT_THEFT = 43;
export const E_CARAVAN_ACTION = 44;
export const E_SCRIPT = 45;
export const E_BROADCAST_REPORT = 46;
export const E_GAME_END = 47;
export const E_GAME_START = 48;
export const E_NATION_SELECTED = 49;
export const E_DESTROYED = 50;
export const E_REPORT = 51;
export const E_TURN_BELL = 52;
export const E_NEXT_YEAR = 53;
export const E_GLOBAL_ECO = 54;
export const E_NUKE = 55;
export const E_HUT_BARB = 56;
export const E_HUT_CITY = 57;
export const E_HUT_GOLD = 58;
export const E_HUT_BARB_KILLED = 59;
export const E_HUT_MERC = 60;
export const E_HUT_SETTLER = 61;
export const E_HUT_TECH = 62;
export const E_HUT_BARB_CITY_NEAR = 63;
export const E_IMP_BUY = 64;
export const E_IMP_BUILD = 65;
export const E_IMP_AUCTIONED = 66;
export const E_IMP_AUTO = 67;
export const E_IMP_SOLD = 68;
export const E_TECH_GAIN = 69;
export const E_TECH_LEARNED = 70;
export const E_TREATY_ALLIANCE = 71;
export const E_TREATY_BROKEN = 72;
export const E_TREATY_CEASEFIRE = 73;
export const E_TREATY_PEACE = 74;
export const E_TREATY_SHARED_VISION = 75;
export const E_UNIT_LOST_ATT = 76;
export const E_UNIT_WIN_ATT = 77;
export const E_UNIT_BUY = 78;
export const E_UNIT_BUILT = 79;
export const E_UNIT_LOST_DEF = 80;
export const E_UNIT_WIN_DEF = 81;
export const E_UNIT_BECAME_VET = 82;
export const E_UNIT_UPGRADED = 83;
export const E_UNIT_RELOCATED = 84;
export const E_UNIT_ORDERS = 85;
export const E_WONDER_BUILD = 86;
export const E_WONDER_OBSOLETE = 87;
export const E_WONDER_STARTED = 88;
export const E_WONDER_STOPPED = 89;
export const E_WONDER_WILL_BE_BUILT = 90;
export const E_DIPLOMACY = 91;
export const E_TREATY_EMBASSY = 92;
export const E_BAD_COMMAND = 93;
export const E_SETTING = 94;
export const E_CHAT_MSG = 95;
export const E_MESSAGE_WALL = 96;
export const E_CHAT_ERROR = 97;
export const E_CONNECTION = 98;
export const E_AI_DEBUG = 99;
export const E_LOG_ERROR = 100;
export const E_LOG_FATAL = 101;
export const E_TECH_GOAL = 102;
export const E_UNIT_LOST_MISC = 103;
export const E_CITY_PLAGUE = 104;
export const E_VOTE_NEW = 105;
export const E_VOTE_RESOLVED = 106;
export const E_VOTE_ABORTED = 107;
export const E_CITY_RADIUS_SQ = 108;
export const E_UNIT_BUILT_POP_COST = 109;
export const E_DISASTER = 110;
export const E_ACHIEVEMENT = 111;
export const E_TECH_LOST = 112;
export const E_TECH_EMBASSY = 113;
export const E_MY_SPY_STEAL_GOLD = 114;
export const E_ENEMY_SPY_STEAL_GOLD = 115;
export const E_SPONTANEOUS_EXTRA = 116;
export const E_UNIT_ILLEGAL_ACTION = 117;
export const E_MY_SPY_STEAL_MAP = 118;
export const E_ENEMY_SPY_STEAL_MAP = 119;
export const E_MY_SPY_NUKE = 120;
export const E_ENEMY_SPY_NUKE = 121;
export const E_UNIT_WAS_EXPELLED = 122;
export const E_UNIT_DID_EXPEL = 123;
export const E_UNIT_ACTION_FAILED = 124;
export const E_UNIT_ESCAPED = 125;
export const E_DEPRECATION_WARNING = 126;
export const E_BEGINNER_HELP = 127;
export const E_MY_UNIT_DID_HEAL = 128;
export const E_MY_UNIT_WAS_HEALED = 129;
export const E_MULTIPLIER = 130;
export const E_UNIT_ACTION_ACTOR_SUCCESS = 131;
export const E_UNIT_ACTION_ACTOR_FAILURE = 132;
export const E_UNIT_ACTION_TARGET_OTHER = 133;
export const E_UNIT_ACTION_TARGET_HOSTILE = 134;
export const E_INFRAPOINTS = 135;
export const E_HUT_MAP = 136;
export const E_TREATY_SHARED_TILES = 137;
export const E_CITY_CONQUERED = 138;
export const E_CHAT_PRIVATE = 139;
export const E_CHAT_ALLIES = 140;
export const E_CHAT_OBSERVER = 141;
export const E_UNDEFINED = 142;

// --- Event info field indices ---
export const E_I_NAME = 0;
export const E_I_SECTION = 1;
export const E_I_DESCRIPTION = 2;

// --- Expose all event constants to window for legacy JS ---

import * as self from './eventConstants';

const w = window as unknown as Record<string, unknown>;
for (const [name, value] of Object.entries(self)) {
  if (typeof value === 'number') {
    w[name] = value;
  }
}
