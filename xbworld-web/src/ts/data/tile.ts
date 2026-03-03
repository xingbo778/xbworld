/**
 * Tile query and mutation functions.
 * Migrated from tile.js.
 */

import type { Tile, City } from './types';
import { exposeToLegacy } from '../bridge/legacy';

export const TILE_UNKNOWN = 0;
export const TILE_KNOWN_UNSEEN = 1;
export const TILE_KNOWN_SEEN = 2;
export const TILE_INDEX_NONE = -1;

export function tileGetKnown(ptile: Tile): number {
  if (ptile.known == null || ptile.known === TILE_UNKNOWN) return TILE_UNKNOWN;
  if (ptile.known === TILE_KNOWN_UNSEEN) return TILE_KNOWN_UNSEEN;
  return TILE_KNOWN_SEEN;
}

export function tileHasExtra(ptile: Tile, extra: number): boolean {
  const extras = ptile.extras as unknown;
  if (!extras) return false;
  if (typeof (extras as { isSet?: (n: number) => boolean }).isSet === 'function') {
    return (extras as { isSet: (n: number) => boolean }).isSet(extra);
  }
  return false;
}

export function tileResource(ptile: Tile | null): number | null {
  return ptile?.resource ?? null;
}

/**
 * Check if tile has a territory-claiming extra (e.g. fortress, airbase).
 * Migrated from tile.js tile_has_territory_claiming_extra().
 */
export function tileHasTerritoryClaimingExtra(ptile: Tile): boolean {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const win = window as any;
  const rulesetControl = win.ruleset_control;
  if (!rulesetControl) return false;

  const numExtras = rulesetControl['num_extra_types'] ?? 0;
  for (let extra = 0; extra < numExtras; extra++) {
    if (
      tileHasExtra(ptile, extra) &&
      typeof win.territory_claiming_extra === 'function' &&
      typeof win.extra_by_number === 'function' &&
      win.territory_claiming_extra(win.extra_by_number(extra))
    ) {
      return true;
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return false;
}

export function tileOwner(tile: Tile): number {
  return tile.owner;
}

export function tileSetOwner(tile: Tile, owner: number): void {
  tile.owner = owner;
}

export function tileWorked(tile: Tile): number {
  return tile.worked;
}

export function tileSetWorked(tile: Tile, work: number): void {
  tile.worked = work;
}

export function tileCity(ptile: Tile | null): City | null {
  if (!ptile) return null;
  const cityId = ptile.worked;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const cities = (window as any).cities;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!cities) return null;
  const pcity = cities[cityId];
  if (pcity && pcity.tile === ptile.index) {
    return pcity;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS via window (snake_case names matching old JS API)
// ---------------------------------------------------------------------------
exposeToLegacy('tile_get_known', tileGetKnown);
exposeToLegacy('tile_has_extra', tileHasExtra);
exposeToLegacy('tile_resource', tileResource);
exposeToLegacy('tile_has_territory_claiming_extra', tileHasTerritoryClaimingExtra);
exposeToLegacy('tile_owner', tileOwner);
exposeToLegacy('tile_set_owner', tileSetOwner);
exposeToLegacy('tile_worked', tileWorked);
exposeToLegacy('tile_set_worked', tileSetWorked);
exposeToLegacy('tile_city', tileCity);

// Constants
exposeToLegacy('TILE_UNKNOWN', TILE_UNKNOWN);
exposeToLegacy('TILE_KNOWN_UNSEEN', TILE_KNOWN_UNSEEN);
exposeToLegacy('TILE_KNOWN_SEEN', TILE_KNOWN_SEEN);
