/**
 * Terrain query functions.
 * Migrated from terrain.js.
 */

import type { Tile, Terrain } from './types';
import { tileGetKnown, TILE_UNKNOWN } from './tile';
import { mapstep, Direction } from './map';
import { logError } from '../core/log';
import { exposeToLegacy } from '../bridge/legacy';

export function tileSetTerrain(ptile: Tile, terrain: number): void {
  ptile.terrain = terrain;
}

export function tileTerrain(ptile: Tile): Terrain | undefined {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const terrains = (window as any).terrains;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!terrains) return undefined;
  return terrains[ptile.terrain];
}

export function tileTerrainNear(ptile: Tile): (Terrain | undefined)[] {
  const near: (Terrain | undefined)[] = [];
  for (let dir = 0; dir < 8; dir++) {
    const tile1 = mapstep(ptile, dir);
    if (tile1 && tileGetKnown(tile1 as Tile) !== TILE_UNKNOWN) {
      const terrain1 = tileTerrain(tile1 as Tile);
      if (terrain1) {
        near[dir] = terrain1;
        continue;
      }
      logError(`build_tile_data() tile (${ptile.x},${ptile.y}) has no terrain!`);
    }
    near[dir] = tileTerrain(ptile);
  }
  return near;
}

export function isOceanTile(ptile: Tile): boolean {
  const t = tileTerrain(ptile);
  if (!t) return false;
  return t.graphic_str === 'floor' || t.graphic_str === 'coast';
}

// ---------------------------------------------------------------------------
// Expose to legacy JS via window (snake_case names matching old JS API)
// ---------------------------------------------------------------------------
exposeToLegacy('tile_set_terrain', tileSetTerrain);
exposeToLegacy('tile_terrain', tileTerrain);
exposeToLegacy('tile_terrain_near', tileTerrainNear);
exposeToLegacy('is_ocean_tile', isOceanTile);
