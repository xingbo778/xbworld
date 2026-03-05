/**
 * Unit tests for data/terrain.ts
 *
 * Tests terrain query functions: tileSetTerrain, tileTerrain, isOceanTile.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  tileSetTerrain,
  tileTerrain,
  isOceanTile,
} from '@/data/terrain';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// tileSetTerrain
// ---------------------------------------------------------------------------

describe('tileSetTerrain', () => {
  it('should set terrain id on tile', () => {
    const tile = { terrain: 0 } as any;
    tileSetTerrain(tile, 5);
    expect(tile.terrain).toBe(5);
  });

  it('should overwrite existing terrain', () => {
    const tile = { terrain: 3 } as any;
    tileSetTerrain(tile, 7);
    expect(tile.terrain).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// tileTerrain
// ---------------------------------------------------------------------------

describe('tileTerrain', () => {
  beforeEach(() => {
    win.terrains = {
      0: { id: 0, name: 'Grassland', graphic_str: 'grassland' },
      1: { id: 1, name: 'Plains', graphic_str: 'plains' },
      2: { id: 2, name: 'Ocean', graphic_str: 'floor' },
      3: { id: 3, name: 'Coast', graphic_str: 'coast' },
    };
  });

  afterEach(() => {
    delete win.terrains;
  });

  it('should return terrain object for valid tile', () => {
    const tile = { terrain: 1 } as any;
    const t = tileTerrain(tile);
    expect(t).toBeDefined();
    expect(t!.name).toBe('Plains');
  });

  it('should return undefined for unknown terrain id', () => {
    const tile = { terrain: 99 } as any;
    expect(tileTerrain(tile)).toBeUndefined();
  });

  it('should return undefined when terrains is not set', () => {
    delete win.terrains;
    const tile = { terrain: 0 } as any;
    expect(tileTerrain(tile)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isOceanTile
// ---------------------------------------------------------------------------

describe('isOceanTile', () => {
  beforeEach(() => {
    win.terrains = {
      0: { id: 0, name: 'Grassland', graphic_str: 'grassland' },
      1: { id: 1, name: 'Plains', graphic_str: 'plains' },
      2: { id: 2, name: 'Ocean', graphic_str: 'floor' },
      3: { id: 3, name: 'Coast', graphic_str: 'coast' },
      4: { id: 4, name: 'Desert', graphic_str: 'desert' },
    };
  });

  afterEach(() => {
    delete win.terrains;
  });

  it('should return true for floor (deep ocean)', () => {
    const tile = { terrain: 2 } as any;
    expect(isOceanTile(tile)).toBe(true);
  });

  it('should return true for coast', () => {
    const tile = { terrain: 3 } as any;
    expect(isOceanTile(tile)).toBe(true);
  });

  it('should return false for land terrain', () => {
    const tile = { terrain: 0 } as any;
    expect(isOceanTile(tile)).toBe(false);
    const tile2 = { terrain: 1 } as any;
    expect(isOceanTile(tile2)).toBe(false);
    const tile3 = { terrain: 4 } as any;
    expect(isOceanTile(tile3)).toBe(false);
  });

  it('should return false when terrain is not found', () => {
    const tile = { terrain: 99 } as any;
    expect(isOceanTile(tile)).toBe(false);
  });

  it('should return false when terrains is not set', () => {
    delete win.terrains;
    const tile = { terrain: 0 } as any;
    expect(isOceanTile(tile)).toBe(false);
  });
});
