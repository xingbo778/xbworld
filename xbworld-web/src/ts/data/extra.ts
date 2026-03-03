/**
 * XBWorld — Extra data module (migrated from extra.js)
 *
 * Pure query functions for extras (roads, bases, resources, etc.).
 * All functions read from `window.extras`, `window.ruleset_control`, etc.
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EXTRA_NONE = -1;
export const BASE_GUI_FORTRESS = 0;
export const BASE_GUI_AIRBASE = 1;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Return extras type of given id.
 */
function extraByNumber(id: number): any {
  if (id === EXTRA_NONE) {
    return null;
  }
  const extras = (window as any).extras;
  const rc = (window as any).ruleset_control;
  if (id >= 0 && rc && id < rc['num_extra_types']) {
    return extras[id];
  } else {
    console.log('extra_by_number(): Invalid extra id: ' + id);
    return null;
  }
}

/**
 * Who owns extras on tile.
 */
function extraOwner(ptile: any): any {
  const playerByNumber = (window as any).player_by_number as (n: number) => any;
  return playerByNumber(ptile['extras_owner']);
}

/**
 * Is given cause one of the causes for the given extra?
 */
function isExtraCausedBy(pextra: any, cause: number): boolean {
  return pextra.causes.isSet(cause);
}

/**
 * Is given cause one of the removal causes for the given extra?
 */
function isExtraRemovedBy(pextra: any, rmcause: number): boolean {
  return pextra.rmcauses.isSet(rmcause);
}

/**
 * Does this extra type claim territory?
 */
function territoryClaimingExtra(pextra: any): boolean {
  return pextra['base'] && pextra['base']['border_sq'] > -1;
}

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

exposeToLegacy('EXTRA_NONE', EXTRA_NONE);
exposeToLegacy('BASE_GUI_FORTRESS', BASE_GUI_FORTRESS);
exposeToLegacy('BASE_GUI_AIRBASE', BASE_GUI_AIRBASE);

exposeToLegacy('extra_by_number', extraByNumber);
exposeToLegacy('extra_owner', extraOwner);
exposeToLegacy('is_extra_caused_by', isExtraCausedBy);
exposeToLegacy('is_extra_removed_by', isExtraRemovedBy);
exposeToLegacy('territory_claiming_extra', territoryClaimingExtra);
