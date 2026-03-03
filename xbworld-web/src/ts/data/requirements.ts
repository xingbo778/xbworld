/**
 * XBWorld — Requirements system (migrated from requirements.js)
 *
 * Pure calculation functions for evaluating game requirements.
 * These functions have no side effects — they only read data and
 * return boolean/tri-state results.
 *
 * Dependencies:
 *   - VUT_* constants (from fcTypes.ts or window)
 *   - REQ_RANGE_* constants (from fcTypes.ts or window)
 *   - player_invention_state() (from Legacy tech.js)
 */

import { exposeToLegacy } from '../bridge/legacy';
import {
  TRI_NO,
  TRI_YES,
  TRI_MAYBE,
  VUT_NONE,
  VUT_ADVANCE,
  VUT_GOVERNMENT,
  VUT_IMPROVEMENT,
  VUT_TERRAIN,
  VUT_NATION,
  VUT_UTYPE,
  VUT_UTFLAG,
  VUT_UCLASS,
  VUT_UCFLAG,
  VUT_OTYPE,
  VUT_SPECIALIST,
  VUT_MINSIZE,
  VUT_AI_LEVEL,
  VUT_TERRAINCLASS,
  VUT_MINYEAR,
  VUT_TERRAINALTER,
  VUT_CITYTILE,
  VUT_GOOD,
  VUT_TERRFLAG,
  VUT_NATIONALITY,
  VUT_BASEFLAG,
  VUT_ROADFLAG,
  VUT_EXTRA,
  VUT_TECHFLAG,
  VUT_ACHIEVEMENT,
  VUT_DIPLREL,
  VUT_MAXTILEUNITS,
  VUT_STYLE,
  VUT_MINCULTURE,
  VUT_UNITSTATE,
  VUT_MINMOVES,
  VUT_MINVETERAN,
  VUT_MINHP,
  VUT_AGE,
  VUT_NATIONGROUP,
  VUT_TOPO,
  VUT_IMPR_GENUS,
  VUT_ACTION,
  VUT_MINTECHS,
  VUT_EXTRAFLAG,
  VUT_MINCALFRAG,
  VUT_SERVERSETTING,
  VUT_COUNT,
  REQ_RANGE_LOCAL,
  REQ_RANGE_TILE,
  REQ_RANGE_CADJACENT,
  REQ_RANGE_ADJACENT,
  REQ_RANGE_CITY,
  REQ_RANGE_TRADEROUTE,
  REQ_RANGE_CONTINENT,
  REQ_RANGE_PLAYER,
  REQ_RANGE_TEAM,
  REQ_RANGE_ALLIANCE,
  REQ_RANGE_WORLD,
  REQ_RANGE_COUNT,
  RPT_POSSIBLE,
} from './fcTypes';

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Is there a source tech within range of the target?
 */
function isTechInRange(
  targetPlayer: any,
  range: number,
  tech: number,
): number {
  const playerInventionState = (window as any).player_invention_state as
    (p: any, t: number) => number;
  const TECH_KNOWN_VAL = (window as any).TECH_KNOWN as number;

  switch (range) {
    case REQ_RANGE_PLAYER:
      return (
        targetPlayer != null &&
        playerInventionState(targetPlayer, tech) === TECH_KNOWN_VAL
      )
        ? TRI_YES
        : TRI_NO;
    case REQ_RANGE_TEAM:
    case REQ_RANGE_ALLIANCE:
    case REQ_RANGE_WORLD:
      console.log('Unimplemented tech requirement range ' + range);
      return TRI_MAYBE;
    case REQ_RANGE_LOCAL:
    case REQ_RANGE_TILE:
    case REQ_RANGE_CADJACENT:
    case REQ_RANGE_ADJACENT:
    case REQ_RANGE_CITY:
    case REQ_RANGE_TRADEROUTE:
    case REQ_RANGE_CONTINENT:
    case REQ_RANGE_COUNT:
      break;
  }
  console.log('Invalid tech req range ' + range);
  return TRI_MAYBE;
}

/**
 * Checks the requirement to see if it is active on the given target.
 */
function isReqActive(
  targetPlayer: any,
  targetCity: any,
  targetBuilding: any,
  targetTile: any,
  targetUnittype: any,
  targetOutput: any,
  targetSpecialist: any,
  req: any,
  probType: number,
): boolean {
  let result = TRI_NO;

  switch (req['kind']) {
    case VUT_NONE:
      result = TRI_YES;
      break;
    case VUT_ADVANCE:
      result = isTechInRange(targetPlayer, req['range'], req['value']);
      break;
    case VUT_GOVERNMENT:
      if (targetPlayer == null) {
        result = TRI_MAYBE;
      } else {
        result =
          targetPlayer['government'] == req['value'] ? TRI_YES : TRI_NO;
      }
      break;
    case VUT_IMPROVEMENT:
    case VUT_TERRAIN:
    case VUT_NATION:
    case VUT_UTYPE:
    case VUT_UTFLAG:
    case VUT_UCLASS:
    case VUT_UCFLAG:
    case VUT_OTYPE:
    case VUT_SPECIALIST:
    case VUT_MINSIZE:
    case VUT_AI_LEVEL:
    case VUT_TERRAINCLASS:
    case VUT_MINYEAR:
    case VUT_TERRAINALTER:
    case VUT_CITYTILE:
    case VUT_GOOD:
    case VUT_TERRFLAG:
    case VUT_NATIONALITY:
    case VUT_BASEFLAG:
    case VUT_ROADFLAG:
    case VUT_EXTRA:
    case VUT_TECHFLAG:
    case VUT_ACHIEVEMENT:
    case VUT_DIPLREL:
    case VUT_MAXTILEUNITS:
    case VUT_STYLE:
    case VUT_MINCULTURE:
    case VUT_UNITSTATE:
    case VUT_MINMOVES:
    case VUT_MINVETERAN:
    case VUT_MINHP:
    case VUT_AGE:
    case VUT_NATIONGROUP:
    case VUT_TOPO:
    case VUT_IMPR_GENUS:
    case VUT_ACTION:
    case VUT_MINTECHS:
    case VUT_EXTRAFLAG:
    case VUT_MINCALFRAG:
    case VUT_SERVERSETTING:
      // FIXME: implement
      console.log('Unimplemented requirement type ' + req['kind']);
      break;
    case VUT_COUNT:
      return false;
    default:
      console.log('Unknown requirement type ' + req['kind']);
  }

  if (result === TRI_MAYBE) {
    if (probType === RPT_POSSIBLE) {
      return true;
    } else {
      return false;
    }
  }

  if (req['present']) {
    return result === TRI_YES;
  } else {
    return result === TRI_NO;
  }
}

/**
 * Checks the requirement(s) to see if they are active on the given target.
 * Returns TRUE only if all requirements are active.
 */
function areReqsActive(
  targetPlayer: any,
  targetCity: any,
  targetBuilding: any,
  targetTile: any,
  targetUnittype: any,
  targetOutput: any,
  targetSpecialist: any,
  reqs: any[],
  probType: number,
): boolean {
  for (let i = 0; i < reqs.length; i++) {
    if (
      !isReqActive(
        targetPlayer,
        targetCity,
        targetBuilding,
        targetTile,
        targetUnittype,
        targetOutput,
        targetSpecialist,
        reqs[i],
        probType,
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Return the number of shields it takes to build this universal.
 */
function universalBuildShieldCost(_pcity: any, target: any): number {
  return target['build_cost'];
}

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

exposeToLegacy('is_req_active', isReqActive);
exposeToLegacy('are_reqs_active', areReqsActive);
exposeToLegacy('is_tech_in_range', isTechInRange);
exposeToLegacy('universal_build_shield_cost', universalBuildShieldCost);
