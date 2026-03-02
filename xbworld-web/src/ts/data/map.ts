/**
 * Map coordinate system, tile allocation, and direction utilities.
 * Migrated from map.js.
 */

import { store } from './store';
import { FC_WRAP } from '../utils/helpers';

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
  const mapX = Math.floor(((natY) + ((natY) & 1)) / 2 + natX);
  const mapY = Math.floor(natY - mapX + mi.xsize);
  return { mapX, mapY };
}

export function mapToNativePos(mapX: number, mapY: number) {
  const mi = store.mapInfo!;
  const natY = Math.floor(mapX + mapY - mi.xsize);
  const natX = Math.floor((2 * mapX - natY - (natY & 1)) / 2);
  return { natX, natY };
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
