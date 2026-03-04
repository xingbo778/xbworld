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

// --- Event section categories ---
export const E_S_ADVANCE = 0;
export const E_S_BUILD = 1;
export const E_S_CITY = 2;
export const E_S_D_ME = 3;
export const E_S_D_THEM = 4;
export const E_S_GLOBAL = 5;
export const E_S_HUT = 6;
export const E_S_NATION = 7;
export const E_S_TREATY = 8;
export const E_S_UNIT = 9;
export const E_S_VOTE = 10;
export const E_S_WONDER = 11;
export const E_S_XYZZY = 12;
export const E_S_CHAT = 13;

// --- Event section names and descriptions ---
export const fc_e_section_names = [
  'e_s_advance', 'e_s_build', 'e_s_city', 'e_s_d_me', 'e_s_d_them',
  'e_s_global', 'e_s_hut', 'e_s_nation', 'e_s_treaty', 'e_s_unit',
  'e_s_vote', 'e_s_wonder', 'e_s_xyzzy', 'e_s_chat'
];
export const fc_e_section_descriptions = [
  'Technology', 'Improvement', 'City', 'Diplomat Action', 'Enemy Diplomat',
  'Global', 'Hut', 'Nation', 'Treaty', 'Unit', 'Vote', 'Wonder', 'Misc', 'Chat'
];

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

// --- fc_e_events: event metadata array [name, section, description] ---
export const fc_e_events: [string, number, string][] = [
  ['e_city_cantbuild', E_S_CITY, 'Advisor'],
  ['e_city_lost', E_S_CITY, 'Captured/Destroyed'],
  ['e_city_love', E_S_CITY, 'Celebrating'],
  ['e_city_disorder', E_S_CITY, 'Civil Disorder'],
  ['e_city_famine', E_S_CITY, 'Famine'],
  ['e_city_famine_feared', E_S_CITY, 'Famine Feared'],
  ['e_city_growth', E_S_CITY, 'Growth'],
  ['e_city_may_soon_grow', E_S_CITY, 'May Soon Grow'],
  ['e_city_aqueduct', E_S_CITY, 'Needs Aqueduct'],
  ['e_city_aq_building', E_S_CITY, 'Needs Aqueduct Being Built'],
  ['e_city_normal', E_S_CITY, 'Normal'],
  ['e_city_nuked', E_S_CITY, 'Nuked'],
  ['e_city_cma_release', E_S_CITY, 'Released from citizen governor'],
  ['e_city_gran_throttle', E_S_CITY, 'Suggest Growth Throttling'],
  ['e_city_transfer', E_S_CITY, 'Transfer'],
  ['e_city_build', E_S_CITY, 'Was Built'],
  ['e_city_production_changed', E_S_CITY, 'Production changed'],
  ['e_worklist', E_S_CITY, 'Worklist Events'],
  ['e_uprising', E_S_CITY, 'Barbarian Uprising'],
  ['e_civil_war', E_S_CITY, 'Civil War'],
  ['e_anarchy', E_S_NATION, 'Anarchy'],
  ['e_first_contact', E_S_NATION, 'First Contact'],
  ['e_new_government', E_S_NATION, 'Government Change'],
  ['e_low_on_funds', E_S_NATION, 'Low Funds'],
  ['e_pollution', E_S_CITY, 'Pollution'],
  ['e_revolt_done', E_S_NATION, 'Revolution Ended'],
  ['e_revolt_start', E_S_NATION, 'Revolution Started'],
  ['e_spaceship', E_S_NATION, 'Spaceship Events'],
  ['e_my_diplomat_bribe', E_S_D_ME, 'Bribe'],
  ['e_diplomatic_incident', E_S_D_ME, 'Caused Incident'],
  ['e_my_diplomat_escape', E_S_D_ME, 'Escape'],
  ['e_my_diplomat_embassy', E_S_D_ME, 'Embassy'],
  ['e_my_diplomat_failed', E_S_D_ME, 'Failed'],
  ['e_my_diplomat_incite', E_S_D_ME, 'Incite'],
  ['e_my_diplomat_poison', E_S_D_ME, 'Poison'],
  ['e_my_diplomat_sabotage', E_S_D_ME, 'Sabotage'],
  ['e_my_diplomat_theft', E_S_D_ME, 'Theft'],
  ['e_enemy_diplomat_bribe', E_S_D_THEM, 'Bribe'],
  ['e_enemy_diplomat_embassy', E_S_D_THEM, 'Embassy'],
  ['e_enemy_diplomat_failed', E_S_D_THEM, 'Failed'],
  ['e_enemy_diplomat_incite', E_S_D_THEM, 'Incite'],
  ['e_enemy_diplomat_poison', E_S_D_THEM, 'Poison'],
  ['e_enemy_diplomat_sabotage', E_S_D_THEM, 'Sabotage'],
  ['e_enemy_diplomat_theft', E_S_D_THEM, 'Theft'],
  ['e_caravan_action', E_S_XYZZY, 'Caravan actions'],
  ['e_script', E_S_XYZZY, 'Scenario/ruleset script message'],
  ['e_broadcast_report', E_S_XYZZY, 'Broadcast Report'],
  ['e_game_end', E_S_XYZZY, 'Game Ended'],
  ['e_game_start', E_S_XYZZY, 'Game Started'],
  ['e_nation_selected', E_S_XYZZY, 'Nation Selected'],
  ['e_destroyed', E_S_XYZZY, 'Player Destroyed'],
  ['e_report', E_S_XYZZY, 'Report'],
  ['e_turn_bell', E_S_XYZZY, 'Turn Bell'],
  ['e_next_year', E_S_XYZZY, 'Year Advance'],
  ['e_global_eco', E_S_GLOBAL, 'Eco-Disaster'],
  ['e_nuke', E_S_GLOBAL, 'Nuke Detonated'],
  ['e_hut_barb', E_S_HUT, 'Barbarians in a Hut Roused'],
  ['e_hut_city', E_S_HUT, 'City Founded from Hut'],
  ['e_hut_gold', E_S_HUT, 'Gold Found in Hut'],
  ['e_hut_barb_killed', E_S_HUT, 'Killed by Barbarians in a Hut'],
  ['e_hut_merc', E_S_HUT, 'Mercenaries Found in Hut'],
  ['e_hut_settler', E_S_HUT, 'Settler Found in Hut'],
  ['e_hut_tech', E_S_HUT, 'Tech Found in Hut'],
  ['e_hut_barb_city_near', E_S_HUT, 'Unit Spared by Barbarians'],
  ['e_imp_buy', E_S_BUILD, 'Bought'],
  ['e_imp_build', E_S_BUILD, 'Built'],
  ['e_imp_auctioned', E_S_BUILD, 'Forced to Sell'],
  ['e_imp_auto', E_S_BUILD, 'New Improvement Selected'],
  ['e_imp_sold', E_S_BUILD, 'Sold'],
  ['e_tech_gain', E_S_ADVANCE, 'Acquired New Tech'],
  ['e_tech_learned', E_S_ADVANCE, 'Learned New Tech'],
  ['e_treaty_alliance', E_S_TREATY, 'Alliance'],
  ['e_treaty_broken', E_S_TREATY, 'Broken'],
  ['e_treaty_ceasefire', E_S_TREATY, 'Cease-fire'],
  ['e_treaty_peace', E_S_TREATY, 'Peace'],
  ['e_treaty_shared_vision', E_S_TREATY, 'Shared Vision'],
  ['e_unit_lost_att', E_S_UNIT, 'Attack Failed'],
  ['e_unit_win_att', E_S_UNIT, 'Attack Succeeded'],
  ['e_unit_buy', E_S_UNIT, 'Bought'],
  ['e_unit_built', E_S_UNIT, 'Built'],
  ['e_unit_lost_def', E_S_UNIT, 'Defender Destroyed'],
  ['e_unit_win_def', E_S_UNIT, 'Defender Survived'],
  ['e_unit_became_vet', E_S_UNIT, 'Promoted to Veteran'],
  ['e_unit_upgraded', E_S_UNIT, 'Production Upgraded'],
  ['e_unit_relocated', E_S_UNIT, 'Relocated'],
  ['e_unit_orders', E_S_UNIT, 'Orders / goto events'],
  ['e_wonder_build', E_S_WONDER, 'Finished'],
  ['e_wonder_obsolete', E_S_WONDER, 'Made Obsolete'],
  ['e_wonder_started', E_S_WONDER, 'Started'],
  ['e_wonder_stopped', E_S_WONDER, 'Stopped'],
  ['e_wonder_will_be_built', E_S_WONDER, 'Will Finish Next Turn'],
  ['e_diplomacy', E_S_XYZZY, 'Diplomatic Message'],
  ['e_treaty_embassy', E_S_TREATY, 'Embassy'],
  ['e_bad_command', E_S_XYZZY, 'Error message from bad command'],
  ['e_setting', E_S_XYZZY, 'Server settings changed'],
  ['e_chat_msg', E_S_CHAT, 'Chat messages'],
  ['e_message_wall', E_S_XYZZY, 'Message from server operator'],
  ['e_chat_error', E_S_CHAT, 'Chat error messages'],
  ['e_connection', E_S_XYZZY, 'Connect/disconnect messages'],
  ['e_ai_debug', E_S_XYZZY, 'AI Debug messages'],
  ['e_log_error', E_S_XYZZY, 'Server Problems'],
  ['e_log_fatal', E_S_XYZZY, 'Server Aborting'],
  ['e_tech_goal', E_S_ADVANCE, 'Selected New Goal'],
  ['e_unit_lost_misc', E_S_UNIT, 'Lost outside battle'],
  ['e_city_plague', E_S_CITY, 'Has Plague'],
  ['e_vote_new', E_S_VOTE, 'New vote'],
  ['e_vote_resolved', E_S_VOTE, 'Vote resolved'],
  ['e_vote_aborted', E_S_VOTE, 'Vote canceled'],
  ['e_city_radius_sq', E_S_CITY, 'City Map changed'],
  ['e_unit_built_pop_cost', E_S_UNIT, 'Built unit with population cost'],
  ['e_disaster', E_S_CITY, 'Disaster'],
  ['e_achievement', E_S_NATION, 'Achievements'],
  ['e_tech_lost', E_S_ADVANCE, 'Lost a Tech'],
  ['e_tech_embassy', E_S_ADVANCE, 'Other Player Gained/Lost a Tech'],
  ['e_my_spy_steal_gold', E_S_D_ME, 'Gold Theft'],
  ['e_enemy_spy_steal_gold', E_S_D_THEM, 'Gold Theft'],
  ['e_spontaneous_extra', E_S_XYZZY, 'Extra Appears or Disappears'],
  ['e_unit_illegal_action', E_S_UNIT, 'Unit Illegal Action'],
  ['e_my_spy_steal_map', E_S_D_ME, 'Map Theft'],
  ['e_enemy_spy_steal_map', E_S_D_THEM, 'Map Theft'],
  ['e_my_spy_nuke', E_S_D_ME, 'Suitcase Nuke'],
  ['e_enemy_spy_nuke', E_S_D_THEM, 'Suitcase Nuke'],
  ['e_unit_was_expelled', E_S_UNIT, 'Was Expelled'],
  ['e_unit_did_expel', E_S_UNIT, 'Did Expel'],
  ['e_unit_action_failed', E_S_UNIT, 'Action failed'],
  ['e_unit_escaped', E_S_UNIT, 'Unit escaped'],
  ['e_deprecation_warning', E_S_XYZZY, 'Deprecated Modpack syntax warnings'],
  ['e_beginner_help', E_S_XYZZY, 'Help for beginners'],
  ['e_my_unit_did_heal', E_S_UNIT, 'Unit did heal'],
  ['e_my_unit_was_healed', E_S_UNIT, 'Unit was healed'],
  ['e_multiplier', E_S_NATION, 'Multiplier changed'],
  ['e_unit_action_actor_success', E_S_UNIT, 'Your unit did'],
  ['e_unit_action_actor_failure', E_S_UNIT, 'Your unit failed'],
  ['e_unit_action_target_other', E_S_UNIT, 'Unit did'],
  ['e_unit_action_target_hostile', E_S_UNIT, 'Unit did to you'],
  ['e_infrapoints', E_S_NATION, 'Infrapoints'],
  ['e_hut_map', E_S_HUT, 'Map found from a hut'],
  ['e_treaty_shared_tiles', E_S_TREATY, 'Tiles shared'],
  ['e_city_conquered', E_S_CITY, 'Conquered'],
  ['e_chat_private', E_S_CHAT, 'Private messages'],
  ['e_chat_allies', E_S_CHAT, 'Allies messages'],
  ['e_chat_observer', E_S_CHAT, 'Observers messages'],
  ['e_undefined', E_S_XYZZY, 'Unknown event'],
];

// --- Expose all event constants to window for legacy JS ---

import * as self from './eventConstants';

const w = window as unknown as Record<string, unknown>;
for (const [name, value] of Object.entries(self)) {
  if (typeof value === 'number' || typeof value === 'string' || Array.isArray(value)) {
    w[name] = value;
  }
}
