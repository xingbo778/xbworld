import type { UnitType, Player } from './types';
import { ACTION_COUNT, MAX_NUM_UNITS } from '../core/constants';
import { exposeToLegacy } from '../bridge/legacy';

export const enum UCF {
  TERRAIN_SPEED = 0,
  TERRAIN_DEFENSE = 1,
  DAMAGE_SLOWS = 2,
  CAN_OCCUPY_CITY = 3,
  MISSILE = 4,
  BUILD_ANYWHERE = 5,
  UNREACHABLE = 6,
  COLLECT_RANSOM = 7,
  ZOC = 8,
  CAN_FORTIFY = 9,
  CAN_PILLAGE = 10,
  HUT_FRIGHTEN = 11,
}

export const UTYF_FLAGLESS = 29;
export const UTYF_PROVIDES_RANSOM = 30;

export const U_NOT_OBSOLETED: null = null;
export const U_LAST: number = MAX_NUM_UNITS;

export const unit_classes: Record<number, any> = {};

export function utype_can_do_action(putype: any, action_id: number): boolean {
  if (putype == null || putype['utype_actions'] == null) return false;
  return putype['utype_actions'].isSet(action_id);
}

export function utype_can_do_action_result(putype: UnitType, result: number): boolean {
  for (let action_id = 0; action_id < ACTION_COUNT; action_id++) {
    if (utype_can_do_action(putype, action_id)) {
      const paction = action_by_number(action_id);
      if (paction != null && action_has_result(paction, result)) {
        return true;
      }
    }
  }
  return false;
}

export function can_player_build_unit_direct(p: any, punittype: any): boolean {
  if (punittype == null || p == null) return false;

  if (punittype['tech_requirement'] != null && punittype['tech_requirement'] >= 0) {
    if (player_invention_state(p, punittype['tech_requirement']) !== TECH_KNOWN) {
      return false;
    }
  }

  if (punittype['obsoleted_by'] != null && punittype['obsoleted_by'] >= 0) {
    const obs_type = unit_types[punittype['obsoleted_by']];
    if (obs_type != null) {
      if (obs_type['tech_requirement'] == null || obs_type['tech_requirement'] < 0) {
        return false;
      }
      if (player_invention_state(p, obs_type['tech_requirement']) === TECH_KNOWN) {
        return false;
      }
    }
  }

  return true;
}

export function get_units_from_tech(tech_id: number): UnitType[] {
  const result: UnitType[] = [];
  for (const unit_type_id in unit_types) {
    const punit_type = unit_types[unit_type_id] as UnitType;
    if (punit_type == null) continue;
    if (punit_type.tech_requirement === tech_id) {
      result.push(punit_type);
    }
  }
  return result;
}

exposeToLegacy('utype_can_do_action', utype_can_do_action);
exposeToLegacy('utype_can_do_action_result', utype_can_do_action_result);
exposeToLegacy('can_player_build_unit_direct', can_player_build_unit_direct);
exposeToLegacy('get_units_from_tech', get_units_from_tech);
exposeToLegacy('unit_classes', unit_classes);
exposeToLegacy('UCF_TERRAIN_SPEED', UCF.TERRAIN_SPEED);
exposeToLegacy('UCF_TERRAIN_DEFENSE', UCF.TERRAIN_DEFENSE);
exposeToLegacy('UCF_DAMAGE_SLOWS', UCF.DAMAGE_SLOWS);
exposeToLegacy('UCF_CAN_OCCUPY_CITY', UCF.CAN_OCCUPY_CITY);
exposeToLegacy('UCF_MISSILE', UCF.MISSILE);
exposeToLegacy('UCF_BUILD_ANYWHERE', UCF.BUILD_ANYWHERE);
exposeToLegacy('UCF_UNREACHABLE', UCF.UNREACHABLE);
exposeToLegacy('UCF_COLLECT_RANSOM', UCF.COLLECT_RANSOM);
exposeToLegacy('UCF_ZOC', UCF.ZOC);
exposeToLegacy('UCF_CAN_FORTIFY', UCF.CAN_FORTIFY);
exposeToLegacy('UCF_CAN_PILLAGE', UCF.CAN_PILLAGE);
exposeToLegacy('UCF_HUT_FRIGHTEN', UCF.HUT_FRIGHTEN);
exposeToLegacy('UTYF_FLAGLESS', UTYF_FLAGLESS);
exposeToLegacy('UTYF_PROVIDES_RANSOM', UTYF_PROVIDES_RANSOM);
exposeToLegacy('U_NOT_OBSOLETED', U_NOT_OBSOLETED);
exposeToLegacy('U_LAST', U_LAST);
