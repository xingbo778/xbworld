/**
 * XBWorld — Improvement data module (migrated from improvement.js)
 *
 * Pure query functions for buildings/improvements/wonders.
 *
 * NOTE: improvements_init() and improvements_add_building() are
 * initialization functions and are NOT migrated (kept in Legacy).
 *
 * PITFALL: improvement_id_by_name in Legacy relies on a module-local
 * `improvements_name_index` cache that is NOT on `window`. The TS version
 * cannot access it, so we do NOT exposeToLegacy for that function.
 * Instead we provide an internal TS implementation that iterates
 * `window.improvements` directly (slightly slower but correct).
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns list of improvements that require the given tech.
 */
function getImprovementsFromTech(techId: number): any[] {
  const improvements = (window as any).improvements as Record<string, any>;
  const result: any[] = [];
  for (const improvementId in improvements) {
    const pimprovement = improvements[improvementId];
    const reqs = getImprovementRequirements(parseInt(improvementId, 10));
    for (let i = 0; i < reqs.length; i++) {
      if (reqs[i] == techId) {
        result.push(pimprovement);
      }
    }
  }
  return result;
}

/**
 * Returns true if the improvement is a wonder.
 * Wonders have a soundtag starting with 'w'.
 */
function isWonder(improvement: any): boolean {
  return improvement['soundtag'][0] === 'w';
}

/**
 * Returns list of tech ids which are a requirement for the given improvement.
 */
function getImprovementRequirements(improvementId: number): number[] {
  const improvements = (window as any).improvements as Record<number, any>;
  const result: number[] = [];
  const improvement = improvements[improvementId];
  if (improvement != null && improvement['reqs'] != null) {
    for (let i = 0; i < improvement['reqs'].length; i++) {
      if (
        improvement['reqs'][i]['kind'] == 1 &&
        improvement['reqs'][i]['present']
      ) {
        result.push(improvement['reqs'][i]['value']);
      }
    }
  }
  return result;
}

/**
 * Finds improvement id by exact name, or -1 if not found.
 *
 * NOTE: This is for TS-internal use only. We do NOT exposeToLegacy because
 * the Legacy version uses a fast module-local cache (improvements_name_index)
 * that we cannot access from TS. Overriding it would break the Legacy version.
 */
export function improvementIdByName(name: string): number {
  const improvements = (window as any).improvements as Record<string, any>;
  for (const id in improvements) {
    if (improvements[id].name === name) {
      return parseInt(id, 10);
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Expose to legacy — only pure query functions that don't depend on
// module-local state
// ---------------------------------------------------------------------------

exposeToLegacy('get_improvements_from_tech', getImprovementsFromTech);
exposeToLegacy('is_wonder', isWonder);
exposeToLegacy('get_improvement_requirements', getImprovementRequirements);
// NOTE: improvement_id_by_name is NOT exposed — Legacy version uses
// module-local improvements_name_index cache that TS cannot access.
