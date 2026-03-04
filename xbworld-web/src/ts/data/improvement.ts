/**
 * XBWorld — Improvement data module (migrated from improvement.js)
 *
 * Pure query functions for buildings/improvements/wonders.
 * Phase 9: Now includes init, add_building, and id_by_name with
 * a module-local name→id cache (improvements_name_index).
 */

import { exposeToLegacy } from '../bridge/legacy';
import { MAX_NUM_BUILDINGS } from '../core/constants';

const w = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const B_AIRPORT_NAME = 'Airport';
const B_LAST = MAX_NUM_BUILDINGS;

// Ensure global improvements object exists before any handler runs
if (!w.improvements) w.improvements = {};

// Module-local name→id cache (mirrors Legacy improvements_name_index)
const improvements_name_index: Record<string, number> = {};

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Prepare improvements for use, resetting state from any previous ruleset.
 */
function improvements_init(): void {
  const improvements = w.improvements;
  Object.keys(improvements).forEach((k) => delete improvements[k]);
  Object.keys(improvements_name_index).forEach(
    (k) => delete improvements_name_index[k]
  );
}

/**
 * Add a new improvement definition.
 */
function improvements_add_building(improvement: any): void {
  w.improvements[improvement.id] = improvement;
  improvements_name_index[improvement.name] = improvement.id;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Returns list of improvements that require the given tech.
 */
function get_improvements_from_tech(techId: number): any[] {
  const improvements = w.improvements as Record<string, any>;
  const result: any[] = [];
  for (const improvementId in improvements) {
    const pimprovement = improvements[improvementId];
    const reqs = get_improvement_requirements(parseInt(improvementId, 10));
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
function is_wonder(improvement: any): boolean {
  return improvement['soundtag'][0] === 'w';
}

/**
 * Returns list of tech ids which are a requirement for the given improvement.
 */
function get_improvement_requirements(improvementId: number): number[] {
  const improvements = w.improvements as Record<number, any>;
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
 * Uses the module-local name→id cache for O(1) lookup.
 */
function improvement_id_by_name(name: string): number {
  return improvements_name_index.hasOwnProperty(name)
    ? improvements_name_index[name]
    : -1;
}

// Also export for TS-internal use
export { improvement_id_by_name as improvementIdByName };

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

exposeToLegacy('improvements_init', improvements_init);
exposeToLegacy('improvements_add_building', improvements_add_building);
exposeToLegacy('get_improvements_from_tech', get_improvements_from_tech);
exposeToLegacy('is_wonder', is_wonder);
exposeToLegacy('get_improvement_requirements', get_improvement_requirements);
exposeToLegacy('improvement_id_by_name', improvement_id_by_name);

// Constants
exposeToLegacy('B_AIRPORT_NAME', B_AIRPORT_NAME);
exposeToLegacy('B_LAST', B_LAST);
