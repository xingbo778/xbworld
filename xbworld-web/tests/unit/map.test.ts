import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapAllocate,
  mapPosToTile,
  indexToTile,
  isValidDir,
  isCardinalDir,
  mapstep,
  getDirectionForStep,
  nativeToMapPos,
  mapToNativePos,
  mapDistanceVector,
  mapVectorToSqDistance,
  dirGetName,
  Direction,
} from '@/data/map';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

describe('Map', () => {
  beforeEach(() => {
    // Set up legacy globals that map.ts reads directly
    win.map = {
      xsize: 10,
      ysize: 10,
      topology_id: 0,
      wrap_id: 0,
    };
    win.tiles = {};
    mapAllocate();
  });

  it('should allocate tiles for the map', () => {
    expect(Object.keys(win.tiles)).toHaveLength(100);
    expect(win.tiles[0]?.x).toBe(0);
    expect(win.tiles[0]?.y).toBe(0);
    expect(win.tiles[99]?.x).toBe(9);
    expect(win.tiles[99]?.y).toBe(9);
  });

  it('should allocate tiles with correct default values (matching legacy)', () => {
    const tile = win.tiles[0];
    expect(tile.known).toBeNull();
    expect(tile.seen).toEqual({});
    expect(tile.specials).toEqual([]);
    expect(tile.terrain).toBe(0); // T_UNKNOWN
    expect(tile.units).toEqual([]);
    expect(tile.owner).toBeNull();
    expect(tile.claimer).toBeNull();
    expect(tile.worked).toBeNull();
    expect(tile.spec_sprite).toBeNull();
    expect(tile.goto_dir).toBeNull();
    expect(tile.nuke).toBe(0);
    expect(tile.height).toBe(0);
  });

  it('should convert map position to tile', () => {
    const tile = mapPosToTile(3, 4);
    expect(tile).toBeDefined();
    expect(tile?.x).toBe(3);
    expect(tile?.y).toBe(4);
  });

  it('should convert index to tile', () => {
    const tile = indexToTile(25);
    expect(tile).toBeDefined();
    expect(tile?.index).toBe(25);
  });

  it('should validate directions', () => {
    expect(isValidDir(Direction.NORTH)).toBe(true);
    expect(isValidDir(Direction.EAST)).toBe(true);
    expect(isValidDir(Direction.SOUTH)).toBe(true);
    expect(isValidDir(Direction.WEST)).toBe(true);
    expect(isValidDir(Direction.NORTHEAST)).toBe(true);
    expect(isValidDir(99)).toBe(false);
  });

  it('should identify cardinal directions', () => {
    expect(isCardinalDir(Direction.NORTH)).toBe(true);
    expect(isCardinalDir(Direction.EAST)).toBe(true);
    expect(isCardinalDir(Direction.NORTHEAST)).toBe(false);
  });

  it('should step to adjacent tiles', () => {
    const center = win.tiles[55]; // (5, 5)
    expect(center).toBeDefined();
    const north = mapstep(center!, Direction.NORTH);
    expect(north?.y).toBe(4);
    expect(north?.x).toBe(5);
  });

  it('should find direction between adjacent tiles', () => {
    const t1 = win.tiles[55]!; // (5, 5)
    const t2 = win.tiles[56]!; // (6, 5)
    const dir = getDirectionForStep(t1, t2);
    expect(dir).toBe(Direction.EAST);
  });

  it('should convert native to map positions with legacy property names', () => {
    const result = nativeToMapPos(3, 4);
    // Legacy API returns {map_x, map_y} — NOT {mapX, mapY}
    expect(result.map_x).toBeTypeOf('number');
    expect(result.map_y).toBeTypeOf('number');
  });

  it('should convert map to native positions with legacy property names', () => {
    const result = mapToNativePos(5, 5);
    // Legacy API returns {nat_x, nat_y} — NOT {natX, natY}
    expect(result.nat_x).toBeTypeOf('number');
    expect(result.nat_y).toBeTypeOf('number');
  });

  it('should compute distance vectors', () => {
    const t1 = { x: 2, y: 3 };
    const t2 = { x: 5, y: 7 };
    const [dx, dy] = mapDistanceVector(t1, t2);
    expect(dx).toBe(3);
    expect(dy).toBe(4);
  });

  it('should compute squared distance', () => {
    expect(mapVectorToSqDistance(3, 4)).toBe(25); // dx*dx + dy*dy for non-hex
  });

  it('should return direction names', () => {
    expect(dirGetName(Direction.NORTH)).toBe('N');
    expect(dirGetName(Direction.SOUTHEAST)).toBe('SE');
    expect(dirGetName(99)).toBe('[Undef]');
  });
});
