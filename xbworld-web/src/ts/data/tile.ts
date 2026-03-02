/**
 * Tile query and mutation functions.
 * Migrated from tile.js.
 */

import { store } from './store';
import type { Tile, City } from './types';

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
  const pcity = store.cities[cityId];
  if (pcity && pcity.tile === ptile.index) {
    return pcity;
  }
  return null;
}
