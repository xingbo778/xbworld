/**
 * Unit tests for data/game.ts
 *
 * Tests game utility functions migrated from legacy game.js.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IDENTITY_NUMBER_ZERO,
  game_find_city_by_number,
  game_find_unit_by_number,
  current_turn_timeout,
  get_year_string,
} from '@/data/game';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Game constants', () => {
  it('should have IDENTITY_NUMBER_ZERO = 0', () => {
    expect(IDENTITY_NUMBER_ZERO).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// game_find_city_by_number
// ---------------------------------------------------------------------------

describe('game_find_city_by_number', () => {
  beforeEach(() => {
    win.cities = {
      10: { id: 10, name: 'Rome' },
      20: { id: 20, name: 'London' },
    };
  });

  afterEach(() => {
    delete win.cities;
  });

  it('should find city by number', () => {
    expect(game_find_city_by_number(10)?.name).toBe('Rome');
    expect(game_find_city_by_number(20)?.name).toBe('London');
  });

  it('should return undefined for non-existent city', () => {
    expect(game_find_city_by_number(99)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// game_find_unit_by_number
// ---------------------------------------------------------------------------

describe('game_find_unit_by_number', () => {
  beforeEach(() => {
    win.units = {
      1: { id: 1, type: 0, name: 'Warriors' },
      2: { id: 2, type: 1, name: 'Settler' },
    };
  });

  afterEach(() => {
    delete win.units;
  });

  it('should find unit by number', () => {
    expect(game_find_unit_by_number(1)?.id).toBe(1);
  });

  it('should return undefined for non-existent unit', () => {
    expect(game_find_unit_by_number(99)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// current_turn_timeout
// ---------------------------------------------------------------------------

describe('current_turn_timeout', () => {
  afterEach(() => {
    delete win.game_info;
  });

  it('should return 0 when game_info is null', () => {
    win.game_info = null;
    expect(current_turn_timeout()).toBe(0);
  });

  it('should return first_timeout on turn 1 when set', () => {
    win.game_info = { turn: 1, first_timeout: 120, timeout: 60 };
    expect(current_turn_timeout()).toBe(120);
  });

  it('should return normal timeout on turn 1 when first_timeout is -1', () => {
    win.game_info = { turn: 1, first_timeout: -1, timeout: 60 };
    expect(current_turn_timeout()).toBe(60);
  });

  it('should return normal timeout on later turns', () => {
    win.game_info = { turn: 5, first_timeout: 120, timeout: 60 };
    expect(current_turn_timeout()).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// get_year_string
// ---------------------------------------------------------------------------

describe('get_year_string', () => {
  afterEach(() => {
    delete win.game_info;
    delete win.calendar_info;
    delete win.is_small_screen;
  });

  it('should format BC year correctly', () => {
    win.game_info = { year: -4000, turn: 1 };
    win.calendar_info = { negative_year_label: ' BC', positive_year_label: ' AD' };
    win.is_small_screen = () => false;
    const result = get_year_string();
    expect(result).toContain('4000 BC');
    expect(result).toContain('Turn:1');
  });

  it('should format AD year correctly', () => {
    win.game_info = { year: 1500, turn: 100 };
    win.calendar_info = { negative_year_label: ' BC', positive_year_label: ' AD' };
    win.is_small_screen = () => false;
    const result = get_year_string();
    expect(result).toContain('1500 AD');
    expect(result).toContain('Turn:100');
  });

  it('should use short format on small screen', () => {
    win.game_info = { year: 1500, turn: 100 };
    win.calendar_info = { negative_year_label: ' BC', positive_year_label: ' AD' };
    win.is_small_screen = () => true;
    const result = get_year_string();
    expect(result).toContain('T:100');
  });
});
