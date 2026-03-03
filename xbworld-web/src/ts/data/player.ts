/**
 * Player query and utility functions.
 * Migrated from player.js.
 */

import type { Player, City } from './types';
import { exposeToLegacy } from '../bridge/legacy';

export const MAX_NUM_PLAYERS = 30;
export const MAX_AI_LOVE = 1000;

export const enum DiplState {
  DS_ARMISTICE = 0,
  DS_WAR = 1,
  DS_CEASEFIRE = 2,
  DS_PEACE = 3,
  DS_ALLIANCE = 4,
  DS_NO_CONTACT = 5,
  DS_TEAM = 6,
  DS_LAST = 7,
}

export const enum PlayerFlag {
  PLRF_AI = 0,
  PLRF_SCENARIO_RESERVED = 1,
  PLRF_COUNT = 2,
}

export const research_data: Record<number, any> = {};

export function valid_player_by_number(playerno: number): Player | null {
  if (players[playerno] == null) return null;
  return players[playerno];
}

export function player_by_number(playerno: number): Player | null {
  if (players[playerno] == null) return null;
  return players[playerno];
}

export function player_by_name(pname: string): Player | null {
  for (const player_id in players) {
    const pplayer = players[player_id];
    if (pplayer.name === pname) return pplayer;
  }
  return null;
}

export function player_by_full_username(pname: string): Player | null {
  for (const player_id in players) {
    const pplayer = players[player_id];
    if (pplayer.username === pname) return pplayer;
    if ("AI " + pplayer.name === pname) return pplayer;
  }
  return null;
}

export function player_find_unit_by_id(pplayer: Player, unit_id: number): any | null {
  for (const id in units) {
    const punit = units[id];
    if (punit.owner === pplayer.playerno && punit.id === unit_id) {
      return punit;
    }
  }
  return null;
}

export function player_index(pplayer: Player): number {
  return pplayer.playerno;
}

export function player_number(player: Player): number {
  return player.playerno;
}

export function get_diplstate_text(state_id: number): string {
  switch (state_id) {
    case DiplState.DS_ARMISTICE:
      return "Armistice";
    case DiplState.DS_WAR:
      return "War";
    case DiplState.DS_CEASEFIRE:
      return "Ceasefire";
    case DiplState.DS_PEACE:
      return "Peace";
    case DiplState.DS_ALLIANCE:
      return "Alliance";
    case DiplState.DS_NO_CONTACT:
      return "No contact";
    case DiplState.DS_TEAM:
      return "Team";
    default:
      return "Unknown";
  }
}

export function get_embassy_text(player_id: number): string {
  const pplayer = players[player_id];
  if (pplayer == null) return "";
  if (pplayer.embassy_txt != null) return pplayer.embassy_txt;
  return "";
}

export function get_ai_level_text(player: Player): string {
  if (player.ai_skill_level === 0) return "Away";
  if (player.ai_skill_level === 1) return "Handicapped";
  if (player.ai_skill_level === 2) return "Novice";
  if (player.ai_skill_level === 3) return "Easy";
  if (player.ai_skill_level === 4) return "Normal";
  if (player.ai_skill_level === 5) return "Hard";
  if (player.ai_skill_level === 6) return "Cheating";
  if (player.ai_skill_level === 7) return "Experimental";
  return "";
}

export function get_player_connection_status(pplayer: Player): string {
  if (pplayer == null) return "";

  for (const cid in connections) {
    const pconn = connections[cid];
    if (pconn.playing != null && pconn.playing.playerno === pplayer.playerno) {
      return "connected";
    }
  }

  if (pplayer.ai_skill_level > 0) return "AI";
  return "disconnected";
}

export function research_get(pplayer: Player): any | null {
  if (pplayer == null) return null;
  return research_data[pplayer.playerno] ?? null;
}

export function player_has_wonder(playerno: number, improvement_id: number): boolean {
  for (const city_id in cities) {
    const pcity = cities[city_id] as City;
    if (pcity.owner === playerno && pcity.improvements != null
        && pcity.improvements[improvement_id] === true) {
      return true;
    }
  }
  return false;
}

export function get_invalid_username_reason(username: string): string | null {
  if (username == null || username.length === 0) {
    return "Username cannot be empty.";
  }
  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (username.length > 32) {
    return "Username must be at most 32 characters.";
  }
  if (/\s/.test(username)) {
    return "Username cannot contain spaces.";
  }
  if (!/^[a-zA-Z]/.test(username)) {
    return "Username must start with a letter.";
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return "Username can only contain letters, numbers, underscores, hyphens, and periods.";
  }
  return null;
}

export function player_capital(player: Player): City | null {
  if (player == null) return null;
  for (const city_id in cities) {
    const pcity = cities[city_id] as City;
    if (pcity.owner === player.playerno && is_capital(pcity)) {
      return pcity;
    }
  }
  return null;
}

export function does_player_own_city(player: Player, city: City): boolean {
  if (player == null || city == null) return false;
  return city.owner === player.playerno;
}

function is_capital(pcity: City): boolean {
  if (pcity.improvements == null) return false;
  for (const imp_id in improvements) {
    const imp = improvements[imp_id];
    if (imp != null && imp.genus === 0 && pcity.improvements[imp.id] === true) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Expose all public functions to legacy JS via window
// ---------------------------------------------------------------------------
exposeToLegacy('valid_player_by_number', valid_player_by_number);
exposeToLegacy('player_by_number', player_by_number);
exposeToLegacy('player_by_name', player_by_name);
exposeToLegacy('player_by_full_username', player_by_full_username);
exposeToLegacy('player_find_unit_by_id', player_find_unit_by_id);
exposeToLegacy('player_index', player_index);
exposeToLegacy('player_number', player_number);
exposeToLegacy('get_diplstate_text', get_diplstate_text);
exposeToLegacy('get_embassy_text', get_embassy_text);
exposeToLegacy('get_ai_level_text', get_ai_level_text);
exposeToLegacy('get_player_connection_status', get_player_connection_status);
exposeToLegacy('research_get', research_get);
exposeToLegacy('player_has_wonder', player_has_wonder);
exposeToLegacy('get_invalid_username_reason', get_invalid_username_reason);
exposeToLegacy('player_capital', player_capital);
exposeToLegacy('does_player_own_city', does_player_own_city);
exposeToLegacy('research_data', research_data);
