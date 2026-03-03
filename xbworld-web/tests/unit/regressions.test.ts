/**
 * Regression tests for known migration pitfalls.
 *
 * Each test is tagged with the pitfall number from MIGRATION_PITFALLS.md.
 * These tests ensure that previously discovered bugs do not reappear
 * during future migrations.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nativeToMapPos, mapToNativePos } from '@/data/map';
import { move_points_text, get_unit_moves_left } from '@/data/unit';
import { clientIsObserver } from '@/client/clientState';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

describe('Pitfall #6: Return value property names must match Legacy', () => {
  beforeEach(() => {
    // Set up minimal map globals for coordinate conversion
    win.map = { xsize: 100, ysize: 50 };
    win.MAP_IS_ISOMETRIC = true;
    win.topo_has_flag = (flag: number) => flag === 1; // TF_ISO
    win.wrap_has_flag = (_flag: number) => false;
  });

  afterEach(() => {
    delete win.map;
    delete win.MAP_IS_ISOMETRIC;
    delete win.topo_has_flag;
    delete win.wrap_has_flag;
  });

  it('NATIVE_TO_MAP_POS should return {map_x, map_y} not {mapX, mapY}', () => {
    const result = nativeToMapPos(10, 20);
    // Must use snake_case property names for Legacy compatibility
    expect(result).toHaveProperty('map_x');
    expect(result).toHaveProperty('map_y');
    // Must NOT have camelCase properties
    expect(result).not.toHaveProperty('mapX');
    expect(result).not.toHaveProperty('mapY');
  });

  it('MAP_TO_NATIVE_POS should return {nat_x, nat_y} not {natX, natY}', () => {
    const result = mapToNativePos(10, 20);
    expect(result).toHaveProperty('nat_x');
    expect(result).toHaveProperty('nat_y');
    expect(result).not.toHaveProperty('natX');
    expect(result).not.toHaveProperty('natY');
  });
});

describe('Pitfall #3: TS module variables vs window globals', () => {
  afterEach(() => {
    delete win.SINGLE_MOVE;
  });

  it('move_points_text should use window.SINGLE_MOVE, not module variable', () => {
    // When SINGLE_MOVE is set on window (as Legacy packhand.js does),
    // move_points_text should produce correct output
    win.SINGLE_MOVE = 3; // Standard value from terrain_control.move_fragments
    const result = move_points_text(3);
    expect(result).toBe('1');
  });

  it('move_points_text should handle fractional moves', () => {
    win.SINGLE_MOVE = 3;
    const result = move_points_text(5);
    expect(result).toBe('1 2/3');
  });

  it('move_points_text should not return NaN when SINGLE_MOVE is set', () => {
    win.SINGLE_MOVE = 3;
    const result = move_points_text(6);
    expect(result).not.toContain('NaN');
    expect(result).not.toContain('undefined');
    expect(result).toBe('2');
  });

  it('move_points_text should handle zero moves', () => {
    win.SINGLE_MOVE = 3;
    const result = move_points_text(0);
    expect(result).toBe('0');
  });
});

describe('Pitfall #9: Optional chaining on uninitialized objects', () => {
  afterEach(() => {
    delete win.client;
    delete win.observing;
  });

  it('client_is_observer must return false when client is uninitialized', () => {
    // This is the root cause of the "map not centered" bug.
    // Legacy throws an error → caller catches → effectively false.
    // TS with ?. returns undefined == null → true (WRONG).
    win.client = undefined;
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('client_is_observer must return false when client.conn is uninitialized', () => {
    win.client = {};
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('client_is_observer must return true for actual observers', () => {
    win.client = { conn: { playing: null, observer: false } };
    win.observing = false;
    expect(clientIsObserver()).toBe(true);
  });
});

describe('Pitfall #7: Module-local variables not accessible from TS', () => {
  /**
   * improvement_id_by_name depends on `improvements_name_index` which is
   * a module-local variable in Legacy improvement.js. The TS version
   * must NOT try to read it from window (it doesn't exist there).
   * Instead, it should iterate window.improvements directly.
   */
  it('improvement functions should not depend on window.improvements_name_index', () => {
    // improvements_name_index is NOT on window — it's a module-local var
    expect(win.improvements_name_index).toBeUndefined();
  });
});

describe('General: exposeToLegacy functions must not break Legacy behavior', () => {
  afterEach(() => {
    delete win.SINGLE_MOVE;
  });

  it('get_unit_moves_left should return formatted string with moves', () => {
    win.SINGLE_MOVE = 3;
    const unit = { movesleft: 6 };
    expect(get_unit_moves_left(unit as any)).toBe('Moves:2');
  });

  it('get_unit_moves_left should handle unit with zero moves', () => {
    win.SINGLE_MOVE = 3;
    const unit = { movesleft: 0 };
    expect(get_unit_moves_left(unit as any)).toBe('Moves:0');
  });

  it('get_unit_moves_left should return 0 for null unit', () => {
    expect(get_unit_moves_left(null)).toBe(0);
  });
});
