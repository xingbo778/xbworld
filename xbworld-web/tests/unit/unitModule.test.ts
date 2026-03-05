/**
 * Unit tests for data/unit.ts
 *
 * Tests unit query functions migrated from legacy unit.js.
 * Only tests pure functions that don't require renderer or complex DOM.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  unit_list_size,
  unit_list_without,
  move_points_text,
  get_unit_moves_left,
  ANIM_STEPS,
} from '@/data/unit';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Unit constants', () => {
  it('should have ANIM_STEPS = 8', () => {
    expect(ANIM_STEPS).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// unit_list_size
// ---------------------------------------------------------------------------

describe('unit_list_size', () => {
  it('should return length of unit list', () => {
    expect(unit_list_size([{}, {}, {}] as any)).toBe(3);
    expect(unit_list_size([])).toBe(0);
  });

  it('should return 0 for null', () => {
    expect(unit_list_size(null)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// unit_list_without
// ---------------------------------------------------------------------------

describe('unit_list_without', () => {
  it('should remove unit with matching id', () => {
    const units = [
      { id: 1, name: 'Warriors' },
      { id: 2, name: 'Phalanx' },
      { id: 3, name: 'Settler' },
    ] as any[];
    const result = unit_list_without(units, { id: 2 } as any);
    expect(result).toHaveLength(2);
    expect(result.map((u: any) => u.id)).toEqual([1, 3]);
  });

  it('should return same-length list if unit not found', () => {
    const units = [{ id: 1 }, { id: 2 }] as any[];
    const result = unit_list_without(units, { id: 99 } as any);
    expect(result).toHaveLength(2);
  });

  it('should not modify original array', () => {
    const units = [{ id: 1 }, { id: 2 }] as any[];
    unit_list_without(units, { id: 1 } as any);
    expect(units).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// move_points_text
// ---------------------------------------------------------------------------

describe('move_points_text', () => {
  beforeEach(() => {
    // Default SINGLE_MOVE is 3 in most rulesets
    win.SINGLE_MOVE = 3;
  });

  afterEach(() => {
    delete win.SINGLE_MOVE;
  });

  it('should display whole moves', () => {
    expect(move_points_text(6)).toBe('2'); // 6/3 = 2
    expect(move_points_text(9)).toBe('3'); // 9/3 = 3
    expect(move_points_text(0)).toBe('0');
  });

  it('should display fractional moves', () => {
    expect(move_points_text(1)).toBe('1/3'); // 0 whole + 1/3
    expect(move_points_text(2)).toBe('2/3'); // 0 whole + 2/3
  });

  it('should display mixed whole and fractional moves', () => {
    expect(move_points_text(4)).toBe('1 1/3'); // 1 whole + 1/3
    expect(move_points_text(5)).toBe('1 2/3'); // 1 whole + 2/3
    expect(move_points_text(7)).toBe('2 1/3'); // 2 whole + 1/3
  });
});

// ---------------------------------------------------------------------------
// get_unit_moves_left
// ---------------------------------------------------------------------------

describe('get_unit_moves_left', () => {
  beforeEach(() => {
    win.SINGLE_MOVE = 3;
  });

  afterEach(() => {
    delete win.SINGLE_MOVE;
  });

  it('should return formatted moves string', () => {
    expect(get_unit_moves_left({ movesleft: 6 } as any)).toBe('Moves:2');
    expect(get_unit_moves_left({ movesleft: 4 } as any)).toBe('Moves:1 1/3');
  });

  it('should return 0 for null unit', () => {
    expect(get_unit_moves_left(null)).toBe(0);
  });
});
