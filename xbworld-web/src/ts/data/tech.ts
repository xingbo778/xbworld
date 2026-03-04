/**
 * Tech data module — pure data queries and logic migrated from tech.js.
 *
 * Phase 7: Migrates 7 pure-data functions + tech constants from legacy tech.js.
 * UI/DOM functions (init_tech_screen, update_tech_tree, etc.) remain
 * in legacy tech.js until the UI layer migration phase.
 */

import { O_SCIENCE } from './fcTypes';

// ---------------------------------------------------------------------------
// Legacy global references (via window)
// ---------------------------------------------------------------------------
const w = window as unknown as Record<string, any>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const TECH_UNKNOWN = 0;
export const TECH_PREREQS_KNOWN = 1;
export const TECH_KNOWN = 2;

export const AR_ONE = 0;
export const AR_TWO = 1;
export const AR_ROOT = 2;
export const AR_SIZE = 3;

export const TF_BONUS_TECH = 0;
export const TF_BRIDGE = 1;
export const TF_RAILROAD = 2;
export const TF_POPULATION_POLLUTION_INC = 3;
export const TF_FARMLAND = 4;
export const TF_BUILD_AIRBORNE = 5;
export const TF_LAST = 6;

export const A_NONE = 0;
export const A_FIRST = 1;
// A_LAST depends on MAX_NUM_ADVANCES which is a legacy global
// We'll compute these lazily via window references

// ---------------------------------------------------------------------------
// Pure data functions
// ---------------------------------------------------------------------------

/**
 * Returns state of the tech for current pplayer.
 * This can be: TECH_KNOWN, TECH_UNKNOWN, or TECH_PREREQS_KNOWN.
 * Should be called with existing techs or A_FUTURE.
 */
export function playerInventionState(pplayer: any, techId: number): number {
  if (pplayer == null) {
    return TECH_UNKNOWN;
  } else {
    if (
      pplayer['inventions'] != null &&
      pplayer['inventions'][techId] != null
    ) {
      return pplayer['inventions'][techId];
    } else {
      return TECH_UNKNOWN;
    }
  }
}

/**
 * Determines if the technology 'checkTechId' is a requirement
 * for reaching the technology 'goalTechId'.
 */
export function isTechReqForGoal(checkTechId: number, goalTechId: number): boolean {
  if (checkTechId === goalTechId) return true;
  if (goalTechId === 0 || checkTechId === 0) return false;

  const goalTech = w.techs[goalTechId];
  if (goalTech == null) return false;

  for (let i = 0; i < goalTech['research_reqs'].length; i++) {
    const rid = goalTech['research_reqs'][i]['value'];
    if (checkTechId === rid) {
      return true;
    } else if (isTechReqForGoal(checkTechId, rid)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines if the technology 'checkTechId' is a direct requirement
 * for reaching the technology 'nextTechId'.
 */
export function isTechReqForTech(checkTechId: number, nextTechId: number): boolean {
  if (checkTechId === nextTechId) return false;
  if (nextTechId === 0 || checkTechId === 0) return false;

  const nextTech = w.techs[nextTechId];
  if (nextTech == null) return false;

  for (let i = 0; i < nextTech['research_reqs'].length; i++) {
    const rid = nextTech['research_reqs'][i]['value'];
    if (checkTechId === rid) {
      return true;
    }
  }

  return false;
}

/**
 * Returns current bulbs output info object:
 *   { self_bulbs, self_upkeep, pooled, team_bulbs, team_upkeep }
 */
export function getCurrentBulbsOutput(): {
  self_bulbs: number;
  self_upkeep: number;
  pooled: boolean;
  team_bulbs: number;
  team_upkeep: number;
} {
  let selfBulbs = 0;
  let selfUpkeep = 0;
  let pooled = false;
  let teamBulbs = 0;
  let teamUpkeep = 0;

  if (!w.client_is_observer() && w.client?.conn?.playing != null) {
    const cplayer = w.client.conn.playing.playerno;
    for (const cityId in w.cities) {
      const city = w.cities[cityId];
      if (city.owner === cplayer) {
        selfBulbs += city.prod[O_SCIENCE];
      }
    }
    selfUpkeep = w.client.conn.playing.tech_upkeep;

    if (w.game_info?.['team_pooled_research']) {
      const team = w.client.conn.playing.team;
      for (const playerId in w.players) {
        const player = w.players[playerId];
        if (player.team === team && player.is_alive) {
          teamUpkeep += player.tech_upkeep;
          if (player.playerno !== cplayer) {
            pooled = true;
          }
        }
      }
      if (pooled) {
        teamBulbs = w.research_data?.[team]?.total_bulbs_prod ?? 0;
      }
    }

    if (!pooled) {
      teamBulbs = selfBulbs;
      teamUpkeep = selfUpkeep;
    }
  }

  return {
    self_bulbs: selfBulbs,
    self_upkeep: selfUpkeep,
    pooled: pooled,
    team_bulbs: teamBulbs,
    team_upkeep: teamUpkeep,
  };
}

/** Returns a textual description of current bulbs output. */
export function getCurrentBulbsOutputText(cbo?: any): string {
  if (cbo === undefined) {
    cbo = getCurrentBulbsOutput();
  }

  let text: string;
  if (cbo.self_bulbs === 0 && cbo.self_upkeep === 0) {
    text = 'No bulbs researched';
  } else {
    text = String(cbo.self_bulbs);
    const net = cbo.self_bulbs - cbo.self_upkeep;
    if (cbo.self_upkeep !== 0) {
      text = text + ' - ' + cbo.self_upkeep + ' = ' + net;
    }
    if (1 === Math.abs(net)) {
      text = text + ' bulb/turn';
    } else {
      text = text + ' bulbs/turn';
    }
  }
  if (cbo.pooled) {
    text =
      text +
      ' (' +
      (cbo.team_bulbs - cbo.team_upkeep) +
      ' team total)';
  }
  return text;
}

/** Finds tech id by exact name. Null if not found. */
export function techIdByName(tname: string): string | null {
  for (const techId in w.techs) {
    if (tname === w.techs[techId]['name']) return techId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------

// Constants
// Functions
