import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/data/store';

describe('GameStore', () => {
  beforeEach(() => {
    store.reset();
  });

  it('should initialize with empty collections', () => {
    expect(Object.keys(store.tiles)).toHaveLength(0);
    expect(Object.keys(store.units)).toHaveLength(0);
    expect(Object.keys(store.cities)).toHaveLength(0);
    expect(Object.keys(store.players)).toHaveLength(0);
  });

  it('should find city by id', () => {
    store.cities[42] = {
      id: 42,
      owner: 0,
      tile: 100,
      name: 'Rome',
      size: 5,
      food_stock: 0,
      shield_stock: 0,
      production_kind: 0,
      production_value: 0,
      surplus: [],
      waste: [],
      unhappy_penalty: [],
      prod: [],
      citizen_extra: [],
      ppl_happy: [],
      ppl_content: [],
      ppl_unhappy: [],
      ppl_angry: [],
      improvements: [],
    };
    expect(store.findCityById(42)?.name).toBe('Rome');
    expect(store.findCityById(99)).toBeUndefined();
  });

  it('should find unit by id', () => {
    store.units[7] = {
      id: 7,
      owner: 0,
      tile: 50,
      type: 1,
      hp: 10,
      veteran: 0,
      movesleft: 3,
      activity: 0,
      transported_by: -1,
      homecity: 42,
      done_moving: false,
      ai: false,
      goto_tile: -1,
    };
    expect(store.findUnitById(7)?.tile).toBe(50);
    expect(store.findUnitById(999)).toBeUndefined();
  });

  it('should find player by id', () => {
    store.players[0] = {
      playerno: 0,
      name: 'Player 1',
      username: 'p1',
      nation: 5,
      is_alive: true,
      is_ready: true,
      ai_skill_level: 0,
      gold: 100,
      tax: 30,
      luxury: 20,
      science: 50,
      expected_income: 10,
      team: 0,
      embassy_txt: '',
    };
    expect(store.findPlayerById(0)?.name).toBe('Player 1');
  });

  it('should reset all state', () => {
    store.units[1] = {} as (typeof store.units)[0];
    store.cities[1] = {} as (typeof store.cities)[0];
    store.reset();
    expect(Object.keys(store.units)).toHaveLength(0);
    expect(Object.keys(store.cities)).toHaveLength(0);
  });
});
