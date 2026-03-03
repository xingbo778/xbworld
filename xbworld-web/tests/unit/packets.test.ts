import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from '@/data/store';
import { handlePacket, registerHandler } from '@/net/packets';
import { globalEvents } from '@/core/events';

describe('Packet Handler', () => {
  beforeEach(() => {
    store.reset();
    store.mapInfo = { xsize: 10, ysize: 10, topology_id: 0, wrap_id: 0 };
  });

  it('should dispatch GAME_INFO (pid=16)', () => {
    const handler = vi.fn();
    globalEvents.on('game:info', handler);

    handlePacket({ pid: 16, turn: 5, year: -4000, timeout: 30, first_timeout: -1, phase: 0, phase_mode: 0 });

    expect(store.gameInfo?.turn).toBe(5);
    expect(store.gameInfo?.year).toBe(-4000);
    expect(handler).toHaveBeenCalled();

    globalEvents.off('game:info', handler);
  });

  it('should dispatch PLAYER_INFO (pid=51)', () => {
    handlePacket({
      pid: 51, playerno: 0, name: 'TestPlayer', username: 'test',
      nation: 5, is_alive: true, is_ready: true, ai_skill_level: 0,
      gold: 200, tax: 30, luxury: 20, science: 50,
      expected_income: 15, team: 0, embassy_txt: '',
    });

    expect(store.players[0]?.name).toBe('TestPlayer');
    expect(store.players[0]?.gold).toBe(200);
  });

  it('should dispatch UNIT_INFO (pid=63)', () => {
    handlePacket({
      pid: 63, id: 7, owner: 0, tile: 55, type: 1, hp: 10,
      veteran: 0, movesleft: 3, activity: 0, transported_by: -1,
      homecity: 42, done_moving: false, ai: false, goto_tile: -1,
    });

    expect(store.units[7]?.tile).toBe(55);
    expect(store.units[7]?.hp).toBe(10);
  });

  it('should dispatch UNIT_REMOVE (pid=62)', () => {
    store.units[7] = {
      id: 7, owner: 0, tile: 55, type: 1, hp: 10, veteran: 0,
      movesleft: 3, activity: 0, transported_by: -1, homecity: 42,
      done_moving: false, ai: false, goto_tile: -1,
    };

    handlePacket({ pid: 62, unit_id: 7 });
    expect(store.units[7]).toBeUndefined();
  });

  it('should dispatch CITY_INFO (pid=31)', () => {
    handlePacket({
      pid: 31, id: 10, owner: 0, tile: 55, name: 'Rome', size: 5,
      food_stock: 20, shield_stock: 10, production_kind: 0, production_value: 1,
      surplus: [], waste: [], unhappy_penalty: [], prod: [], citizen_extra: [],
      ppl_happy: [], ppl_content: [], ppl_unhappy: [], ppl_angry: [],
      improvements: [],
    });

    expect(store.cities[10]?.name).toBe('Rome');
    expect(store.cities[10]?.size).toBe(5);
  });

  it('should dispatch CITY_REMOVE (pid=30)', () => {
    store.cities[10] = {
      id: 10, owner: 0, tile: 55, name: 'Rome', size: 5,
      food_stock: 0, shield_stock: 0, production_kind: 0, production_value: 0,
      surplus: [], waste: [], unhappy_penalty: [], prod: [], citizen_extra: [],
      ppl_happy: [], ppl_content: [], ppl_unhappy: [], ppl_angry: [],
      improvements: [],
    };

    handlePacket({ pid: 30, city_id: 10 });
    expect(store.cities[10]).toBeUndefined();
  });

  it('should dispatch CHAT_MSG (pid=25)', () => {
    const handler = vi.fn();
    globalEvents.on('chat:message', handler);

    handlePacket({ pid: 25, message: 'Hello world', event: 0 });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hello world' }));

    globalEvents.off('chat:message', handler);
  });

  it('should dispatch RULESET_TERRAIN (pid=151)', () => {
    handlePacket({
      pid: 151, id: 3, name: 'Plains', graphic_str: 'plains',
      movement_cost: 1, defense_bonus: 0, output: [1, 1, 0],
    });

    expect(store.terrains[3]?.name).toBe('Plains');
    expect(store.terrains[3]?.graphic_str).toBe('plains');
  });

  it('should allow custom handler registration', () => {
    const handler = vi.fn();
    registerHandler(999, handler);
    handlePacket({ pid: 999, data: 'test' });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: 'test' }));
  });

  it('should not throw on unknown packet', () => {
    expect(() => handlePacket({ pid: 9999 })).not.toThrow();
  });
});
