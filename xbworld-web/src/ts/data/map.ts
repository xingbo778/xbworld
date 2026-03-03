/**
 * Map coordinate system, tile allocation, and direction utilities.
 * Migrated from map.js.
 */

import { store } from './store';
import { FC_WRAP } from '../utils/helpers';
import { exposeToLegacy } from '../bridge/legacy';

export const enum Direction {
  NORTHWEST = 0,
  NORTH = 1,
  NORTHEAST = 2,
  WEST = 3,
  EAST = 4,
  SOUTHWEST = 5,
  SOUTH = 6,
  SOUTHEAST = 7,
  LAST = 8,
}

export const DIR_COUNT = Direction.LAST;

export const WRAP_X = 1;
export const WRAP_Y = 2;
export const TF_ISO = 1;
export const TF_HEX = 2;

export const T_UNKNOWN = 0;

export const DIR_DX = [-1, 0, 1, -1, 1, -1, 0, 1] as const;
export const DIR_DY = [-1, -1, -1, 0, 0, 1, 1, 1] as const;

export function topoHasFlag(flag: number): boolean {
  return ((store.mapInfo?.topology_id ?? 0) & flag) !== 0;
}

export function wrapHasFlag(flag: number): boolean {
  return ((store.mapInfo?.wrap_id ?? 0) & flag) !== 0;
}

/**
 * Initialise a tile with default values.
 * Migrated from map.js tile_init().
 */
export function tileInit(tile: Record<string, unknown>): Record<string, unknown> {
  tile['known'] = null;
  tile['seen'] = {};
  tile['specials'] = [];
  tile['terrain'] = T_UNKNOWN;
  tile['units'] = [];
  tile['owner'] = null;
  tile['claimer'] = null;
  tile['worked'] = null;
  tile['spec_sprite'] = null;
  tile['goto_dir'] = null;
  tile['nuke'] = 0;
  return tile;
}

export function mapAllocate(): void {
  const mi = store.mapInfo;
  if (!mi) return;

  store.tiles = {};
  for (let x = 0; x < mi.xsize; x++) {
    for (let y = 0; y < mi.ysize; y++) {
      const index = x + y * mi.xsize;
      store.tiles[index] = {
        index,
        x,
        y,
        terrain: T_UNKNOWN,
        known: 0,
        extras: [],
        owner: -1,
        worked: -1,
        resource: -1,
        continent: 0,
        height: 0,
        specials: [],
        units: [],
        claimer: null,
        spec_sprite: null,
        goto_dir: null,
        nuke: 0,
        seen: {},
      };
    }
  }
}

/**
 * Initialise map topology: valid_dirs and cardinal_dirs arrays.
 * Migrated from map.js map_init_topology().
 */
export function mapInitTopology(_setSizes: boolean): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const m = (window as any).map;
  if (!m) return;

  m.valid_dirs = {};
  m.cardinal_dirs = {};
  m.num_valid_dirs = 0;
  m.num_cardinal_dirs = 0;

  for (let dir = 0; dir < 8; dir++) {
    if (isValidDir(dir)) {
      m.valid_dirs[m.num_valid_dirs] = dir;
      m.num_valid_dirs++;
    }
    if (isCardinalDir(dir)) {
      m.cardinal_dirs[m.num_cardinal_dirs] = dir;
      m.num_cardinal_dirs++;
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export function isValidDir(dir: number): boolean {
  switch (dir) {
    case Direction.SOUTHEAST:
    case Direction.NORTHWEST:
      return !(topoHasFlag(TF_HEX) && !topoHasFlag(TF_ISO));
    case Direction.NORTHEAST:
    case Direction.SOUTHWEST:
      return !(topoHasFlag(TF_HEX) && topoHasFlag(TF_ISO));
    case Direction.NORTH:
    case Direction.EAST:
    case Direction.SOUTH:
    case Direction.WEST:
      return true;
    default:
      return false;
  }
}

export function isCardinalDir(dir: number): boolean {
  switch (dir) {
    case Direction.NORTH:
    case Direction.SOUTH:
    case Direction.EAST:
    case Direction.WEST:
      return true;
    case Direction.SOUTHEAST:
    case Direction.NORTHWEST:
      return topoHasFlag(TF_HEX) && topoHasFlag(TF_ISO);
    case Direction.NORTHEAST:
    case Direction.SOUTHWEST:
      return topoHasFlag(TF_HEX) && !topoHasFlag(TF_ISO);
    default:
      return false;
  }
}

export function mapPosToTile(x: number, y: number) {
  const mi = store.mapInfo;
  if (!mi) return undefined;
  if (x >= mi.xsize) y -= 1;
  else if (x < 0) y += 1;
  return store.tiles[x + y * mi.xsize];
}

export function indexToTile(index: number) {
  return store.tiles[index];
}

export function mapstep(ptile: { x: number; y: number }, dir: number) {
  if (!isValidDir(dir)) return undefined;
  return mapPosToTile(DIR_DX[dir] + ptile.x, DIR_DY[dir] + ptile.y);
}

export function getDirectionForStep(
  start: { x: number; y: number; index: number },
  end: { index: number },
): number {
  for (let dir = Direction.NORTHWEST; dir < Direction.LAST; dir++) {
    const test = mapstep(start, dir);
    if (test && test.index === end.index) return dir;
  }
  return -1;
}

export function nativeToMapPos(natX: number, natY: number) {
  const mi = store.mapInfo!;
  const mapX = Math.floor((natY + (natY & 1)) / 2 + natX);
  const mapY = Math.floor(natY - mapX + mi.xsize);
  return { mapX, mapY };
}

/**
 * NATURAL_TO_MAP_POS — uses different formula from NATIVE_TO_MAP_POS.
 * Migrated from map.js.
 */
export function naturalToMapPos(natX: number, natY: number) {
  const mi = store.mapInfo!;
  const pmap_x = Math.floor((natY + natX) / 2);
  const pmap_y = Math.floor(natY - pmap_x + mi.xsize);
  return { map_x: pmap_x, map_y: pmap_y };
}

export function mapToNativePos(mapX: number, mapY: number) {
  const mi = store.mapInfo!;
  const natY = Math.floor(mapX + mapY - mi.xsize);
  const natX = Math.floor((2 * mapX - natY - (natY & 1)) / 2);
  return { natX, natY };
}

/**
 * MAP_TO_NATURAL_POS — uses different formula from MAP_TO_NATIVE_POS.
 * Migrated from map.js.
 */
export function mapToNaturalPos(mapX: number, mapY: number) {
  const mi = store.mapInfo!;
  const pnat_y = Math.floor(mapX + mapY - mi.xsize);
  const pnat_x = Math.floor(2 * mapX - pnat_y);
  return { nat_y: pnat_y, nat_x: pnat_x };
}

export function mapDistanceVector(
  tile0: { x: number; y: number },
  tile1: { x: number; y: number },
): [number, number] {
  const mi = store.mapInfo!;
  let dx = tile1.x - tile0.x;
  let dy = tile1.y - tile0.y;
  if (wrapHasFlag(WRAP_X)) {
    const half = Math.floor(mi.xsize / 2);
    dx = FC_WRAP(dx + half, mi.xsize) - half;
  }
  if (wrapHasFlag(WRAP_Y)) {
    const half = Math.floor(mi.ysize / 2);
    dy = FC_WRAP(dy + half, mi.ysize) - half;
  }
  return [dx, dy];
}

export function mapVectorToSqDistance(dx: number, dy: number): number {
  if (topoHasFlag(TF_HEX)) {
    const d = mapVectorToDistance(dx, dy);
    return d * d;
  }
  return dx * dx + dy * dy;
}

export function mapVectorToDistance(dx: number, dy: number): number {
  if (topoHasFlag(TF_HEX)) {
    if (topoHasFlag(TF_ISO)) {
      if ((dx < 0 && dy > 0) || (dx > 0 && dy < 0)) {
        return Math.abs(dx) + Math.abs(dy);
      }
      return Math.max(Math.abs(dx), Math.abs(dy));
    }
    if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
      return Math.abs(dx) + Math.abs(dy);
    }
    return Math.max(Math.abs(dx), Math.abs(dy));
  }
  return Math.max(Math.abs(dx), Math.abs(dy));
}

const DIR_NAMES: Record<number, string> = {
  [Direction.NORTH]: 'N',
  [Direction.NORTHEAST]: 'NE',
  [Direction.EAST]: 'E',
  [Direction.SOUTHEAST]: 'SE',
  [Direction.SOUTH]: 'S',
  [Direction.SOUTHWEST]: 'SW',
  [Direction.WEST]: 'W',
  [Direction.NORTHWEST]: 'NW',
};

export function dirGetName(dir: number): string {
  return DIR_NAMES[dir] ?? '[Undef]';
}

export function dirCW(dir: number): number {
  return (dir + 1) % 8;
}

export function dirCCW(dir: number): number {
  return (dir + 7) % 8;
}

export function clearGotoTiles(): void {
  const mi = store.mapInfo;
  if (!mi) return;
  for (let x = 0; x < mi.xsize; x++) {
    for (let y = 0; y < mi.ysize; y++) {
      const t = store.tiles[x + y * mi.xsize];
      if (t) t.goto_dir = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Expose to legacy JS via window (snake_case names matching old JS API)
// ---------------------------------------------------------------------------
exposeToLegacy('topo_has_flag', topoHasFlag);
exposeToLegacy('wrap_has_flag', wrapHasFlag);
exposeToLegacy('tile_init', tileInit);
exposeToLegacy('map_allocate', mapAllocate);
exposeToLegacy('map_init_topology', mapInitTopology);
exposeToLegacy('is_valid_dir', isValidDir);
exposeToLegacy('is_cardinal_dir', isCardinalDir);
exposeToLegacy('map_pos_to_tile', mapPosToTile);
exposeToLegacy('index_to_tile', indexToTile);
exposeToLegacy('mapstep', mapstep);
exposeToLegacy('get_direction_for_step', getDirectionForStep);
exposeToLegacy('NATIVE_TO_MAP_POS', nativeToMapPos);
exposeToLegacy('NATURAL_TO_MAP_POS', naturalToMapPos);
exposeToLegacy('MAP_TO_NATIVE_POS', mapToNativePos);
exposeToLegacy('MAP_TO_NATURAL_POS', mapToNaturalPos);
exposeToLegacy('map_distance_vector', mapDistanceVector);
exposeToLegacy('map_vector_to_sq_distance', mapVectorToSqDistance);
exposeToLegacy('map_vector_to_distance', mapVectorToDistance);
exposeToLegacy('dir_get_name', dirGetName);
exposeToLegacy('dir_cw', dirCW);
exposeToLegacy('dir_ccw', dirCCW);
exposeToLegacy('clear_goto_tiles', clearGotoTiles);

// Also expose constants
exposeToLegacy('WRAP_X', WRAP_X);
exposeToLegacy('WRAP_Y', WRAP_Y);
exposeToLegacy('TF_ISO', TF_ISO);
exposeToLegacy('TF_HEX', TF_HEX);
exposeToLegacy('T_UNKNOWN', T_UNKNOWN);
exposeToLegacy('DIR_DX', DIR_DX);
exposeToLegacy('DIR_DY', DIR_DY);
