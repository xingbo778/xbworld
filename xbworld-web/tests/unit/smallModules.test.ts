/**
 * Unit tests for small data modules and clientCore.
 *
 * Covers: improvement.ts, extra.ts, actions.ts, government.ts,
 *         terrain.ts, unittype.ts, clientCore.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Side-effect imports to trigger exposeToLegacy
import '@/data/improvement';
import '@/data/extra';
import '@/data/actions';
import '@/data/government';
import '@/data/terrain';
import '@/data/unittype';
import '@/client/clientCore';

// Direct exports
import { improvementIdByName } from '@/data/improvement';
import {
  EXTRA_NONE,
  BASE_GUI_FORTRESS,
  BASE_GUI_AIRBASE,
} from '@/data/extra';
import {
  UTYF_FLAGLESS,
  UTYF_PROVIDES_RANSOM,
  U_NOT_OBSOLETED,
  utype_can_do_action,
} from '@/data/unittype';
import {
  tileSetTerrain,
  tileTerrain,
  isOceanTile,
} from '@/data/terrain';
import {
  isLongturn,
  isPbem,
  isHotseat,
  isServer,
  setPhaseStart,
  getInvalidUsernameReason,
} from '@/client/clientCore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ===========================================================================
// improvement.ts
// ===========================================================================

describe('improvement.ts', () => {
  beforeEach(() => {
    win.improvements = {
      0: { id: 0, name: 'Palace', soundtag: 'b_palace', reqs: [{ kind: 1, value: 5, present: true }] },
      1: { id: 1, name: 'Barracks', soundtag: 'b_barracks', reqs: [{ kind: 1, value: 3, present: true }] },
      2: { id: 2, name: 'Great Wall', soundtag: 'w_great_wall', reqs: [{ kind: 1, value: 10, present: true }] },
      3: { id: 3, name: 'Library', soundtag: 'b_library', reqs: [] },
    };
  });

  afterEach(() => {
    delete win.improvements;
  });

  describe('is_wonder', () => {
    it('should return true for wonders (soundtag starts with w)', () => {
      expect(win.is_wonder(win.improvements[2])).toBe(true);
    });

    it('should return false for buildings (soundtag starts with b)', () => {
      expect(win.is_wonder(win.improvements[0])).toBe(false);
      expect(win.is_wonder(win.improvements[1])).toBe(false);
    });
  });

  describe('get_improvement_requirements', () => {
    it('should return tech ids from reqs with kind=1 and present=true', () => {
      expect(win.get_improvement_requirements(0)).toEqual([5]);
      expect(win.get_improvement_requirements(1)).toEqual([3]);
    });

    it('should return empty array when no reqs', () => {
      expect(win.get_improvement_requirements(3)).toEqual([]);
    });

    it('should return empty array for non-existent improvement', () => {
      expect(win.get_improvement_requirements(99)).toEqual([]);
    });
  });

  describe('get_improvements_from_tech', () => {
    it('should return improvements that require the given tech', () => {
      const result = win.get_improvements_from_tech(5);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Palace');
    });

    it('should return empty array for tech with no improvements', () => {
      expect(win.get_improvements_from_tech(99)).toEqual([]);
    });
  });

  describe('improvementIdByName (TS internal)', () => {
    it('should find improvement by name', () => {
      expect(improvementIdByName('Palace')).toBe(0);
      expect(improvementIdByName('Library')).toBe(3);
    });

    it('should return -1 for non-existent name', () => {
      expect(improvementIdByName('NonExistent')).toBe(-1);
    });
  });
});

// ===========================================================================
// extra.ts
// ===========================================================================

describe('extra.ts', () => {
  // Helper: create a mock BitVector with isSet method
  function mockBV(...setBits: number[]) {
    return { isSet: (bit: number) => setBits.includes(bit) };
  }

  beforeEach(() => {
    win.extras = {
      0: { id: 0, name: 'Road', causes: mockBV(0, 1), rmcauses: mockBV(), gui_type: 0 },
      1: { id: 1, name: 'Fortress', causes: mockBV(0, 2), rmcauses: mockBV(1), gui_type: BASE_GUI_FORTRESS },
      2: { id: 2, name: 'Airbase', causes: mockBV(0, 2), rmcauses: mockBV(1), gui_type: BASE_GUI_AIRBASE },
    };
    win.ruleset_control = { num_extra_types: 10 };
  });

  afterEach(() => {
    delete win.extras;
    delete win.ruleset_control;
  });

  describe('constants', () => {
    it('should have correct extra constants', () => {
      expect(EXTRA_NONE).toBe(-1);
      expect(BASE_GUI_FORTRESS).toBe(0);
      expect(BASE_GUI_AIRBASE).toBe(1);
    });
  });

  describe('extra_by_number', () => {
    it('should return extra by id', () => {
      expect(win.extra_by_number(0)?.name).toBe('Road');
      expect(win.extra_by_number(1)?.name).toBe('Fortress');
    });

    it('should return null for non-existent extra', () => {
      expect(win.extra_by_number(99)).toBeNull();
    });
  });

  describe('is_extra_caused_by', () => {
    it('should return true when cause bit is set', () => {
      expect(win.is_extra_caused_by(win.extras[0], 0)).toBe(true);
      expect(win.is_extra_caused_by(win.extras[0], 1)).toBe(true);
    });

    it('should return false when cause bit is not set', () => {
      expect(win.is_extra_caused_by(win.extras[0], 2)).toBe(false);
    });
  });

  describe('is_extra_removed_by', () => {
    it('should return true when rmcause bit is set', () => {
      expect(win.is_extra_removed_by(win.extras[1], 1)).toBe(true);
    });

    it('should return false when rmcause bit is not set', () => {
      expect(win.is_extra_removed_by(win.extras[1], 0)).toBe(false);
    });
  });
});

// ===========================================================================
// actions.ts
// ===========================================================================

describe('actions.ts', () => {
  beforeEach(() => {
    win.actions = {
      0: { id: 0, result: 10, ui_name: 'Attack' },
      1: { id: 1, result: 20, ui_name: 'Fortify' },
    };
  });

  afterEach(() => {
    delete win.actions;
  });

  describe('action_by_number', () => {
    it('should return action by id', () => {
      expect(win.action_by_number(0)?.ui_name).toBe('Attack');
    });

    it('should return null for non-existent action', () => {
      expect(win.action_by_number(99)).toBeNull();
    });
  });

  describe('action_has_result', () => {
    it('should return true when result matches', () => {
      expect(win.action_has_result(win.actions[0], 10)).toBe(true);
    });

    it('should return false when result does not match', () => {
      expect(win.action_has_result(win.actions[0], 20)).toBe(false);
    });

    it('should return null for null action', () => {
      expect(win.action_has_result(null, 10)).toBeNull();
    });
  });

  describe('action_prob_possible', () => {
    it('should return true when max > 0', () => {
      expect(win.action_prob_possible({ min: 0, max: 100 })).toBe(true);
    });

    it('should return false when max is 0 and no not_impl', () => {
      expect(win.action_prob_possible({ min: 0, max: 0 })).toBe(false);
    });
  });
});

// ===========================================================================
// government.ts
// ===========================================================================

describe('government.ts', () => {
  describe('government_max_rate', () => {
    it('should return 100 for Anarchy (0)', () => {
      expect(win.government_max_rate(0)).toBe(100);
    });

    it('should return 60 for Despotism (1)', () => {
      expect(win.government_max_rate(1)).toBe(60);
    });

    it('should return 70 for Monarchy (2)', () => {
      expect(win.government_max_rate(2)).toBe(70);
    });

    it('should return 80 for Communism (3)', () => {
      expect(win.government_max_rate(3)).toBe(80);
    });

    it('should return 80 for Republic (4)', () => {
      expect(win.government_max_rate(4)).toBe(80);
    });

    it('should return 100 for Democracy (5)', () => {
      expect(win.government_max_rate(5)).toBe(100);
    });

    it('should return 100 for unknown government', () => {
      expect(win.government_max_rate(99)).toBe(100);
    });
  });
});

// ===========================================================================
// terrain.ts
// ===========================================================================

describe('terrain.ts', () => {
  beforeEach(() => {
    win.terrains = {
      0: { id: 0, graphic_str: 'grassland', name: 'Grassland' },
      1: { id: 1, graphic_str: 'floor', name: 'Ocean' },
      2: { id: 2, graphic_str: 'coast', name: 'Coast' },
      3: { id: 3, graphic_str: 'desert', name: 'Desert' },
    };
  });

  afterEach(() => {
    delete win.terrains;
  });

  describe('tile_set_terrain / tile_terrain', () => {
    it('should set and get terrain', () => {
      const ptile = { terrain: -1 } as any;
      tileSetTerrain(ptile, 2);
      expect(ptile.terrain).toBe(2);
      const t = tileTerrain(ptile);
      expect(t?.name).toBe('Coast');
    });

    it('should return undefined for invalid terrain id', () => {
      const ptile = { terrain: 99 } as any;
      expect(tileTerrain(ptile)).toBeUndefined();
    });
  });

  describe('is_ocean_tile', () => {
    it('should return true for floor terrain (Ocean)', () => {
      const ptile = { terrain: 1 } as any;
      expect(isOceanTile(ptile)).toBe(true);
    });

    it('should return true for coast terrain', () => {
      const ptile = { terrain: 2 } as any;
      expect(isOceanTile(ptile)).toBe(true);
    });

    it('should return false for land terrain', () => {
      const ptile = { terrain: 0 } as any;
      expect(isOceanTile(ptile)).toBe(false);
    });

    it('should return false for invalid terrain', () => {
      const ptile = { terrain: 99 } as any;
      expect(isOceanTile(ptile)).toBe(false);
    });
  });
});

// ===========================================================================
// unittype.ts
// ===========================================================================

describe('unittype.ts', () => {
  describe('constants', () => {
    it('should export correct unittype constants', () => {
      expect(UTYF_FLAGLESS).toBe(29);
      expect(UTYF_PROVIDES_RANSOM).toBe(30);
      expect(U_NOT_OBSOLETED).toBeNull();
    });
  });

  describe('utype_can_do_action', () => {
    it('should return true when action is set', () => {
      const putype = {
        utype_actions: { isSet: (id: number) => id === 5 },
      };
      expect(utype_can_do_action(putype, 5)).toBe(true);
    });

    it('should return false when action is not set', () => {
      const putype = {
        utype_actions: { isSet: (id: number) => id === 5 },
      };
      expect(utype_can_do_action(putype, 3)).toBe(false);
    });

    it('should return false for null putype', () => {
      expect(utype_can_do_action(null, 5)).toBe(false);
    });

    it('should return false when utype_actions is null', () => {
      expect(utype_can_do_action({ utype_actions: null }, 5)).toBe(false);
    });
  });
});

// ===========================================================================
// clientCore.ts
// ===========================================================================

describe('clientCore.ts', () => {
  describe('game type queries', () => {
    afterEach(() => {
      delete win.game_type;
    });

    it('isLongturn should return true for longturn game', () => {
      win.game_type = 'longturn';
      expect(isLongturn()).toBe(true);
    });

    it('isLongturn should return false for other game types', () => {
      win.game_type = 'singleplayer';
      expect(isLongturn()).toBe(false);
    });

    it('isPbem should return true for pbem game', () => {
      win.game_type = 'pbem';
      expect(isPbem()).toBe(true);
    });

    it('isHotseat should return true for hotseat game', () => {
      win.game_type = 'hotseat';
      expect(isHotseat()).toBe(true);
    });

    it('isServer should always return false', () => {
      expect(isServer()).toBe(false);
    });
  });

  describe('setPhaseStart', () => {
    afterEach(() => {
      delete win.phase_start_time;
    });

    it('should set phase_start_time to current time', () => {
      const before = Date.now();
      setPhaseStart();
      const after = Date.now();
      expect(win.phase_start_time).toBeGreaterThanOrEqual(before);
      expect(win.phase_start_time).toBeLessThanOrEqual(after);
    });
  });

  describe('getInvalidUsernameReason', () => {
    it('should return "empty" for null', () => {
      expect(getInvalidUsernameReason(null)).toBe('empty');
    });

    it('should return "empty" for empty string', () => {
      expect(getInvalidUsernameReason('')).toBe('empty');
    });

    it('should return "too short" for 1-2 char names', () => {
      expect(getInvalidUsernameReason('ab')).toBe('too short');
      expect(getInvalidUsernameReason('a')).toBe('too short');
    });

    it('should return "too long" for names >= 32 chars', () => {
      expect(getInvalidUsernameReason('a'.repeat(32))).toBe('too long');
    });

    it('should return "not available" for "pbem"', () => {
      expect(getInvalidUsernameReason('pbem')).toBe('not available');
      expect(getInvalidUsernameReason('PBEM')).toBe('not available');
    });

    it('should return invalid for names starting with number', () => {
      expect(getInvalidUsernameReason('1abc')).toContain('invalid');
    });

    it('should return invalid for names with special chars', () => {
      expect(getInvalidUsernameReason('abc def')).toContain('invalid');
      expect(getInvalidUsernameReason('abc@def')).toContain('invalid');
    });

    it('should return null for valid names', () => {
      expect(getInvalidUsernameReason('player1')).toBeNull();
      expect(getInvalidUsernameReason('TestUser')).toBeNull();
      expect(getInvalidUsernameReason('abc')).toBeNull();
    });

    it('should return "banned" when banlist check fails', () => {
      win.check_text_with_banlist_exact = (name: string) => name !== 'badword';
      expect(getInvalidUsernameReason('badword')).toBe('banned');
      delete win.check_text_with_banlist_exact;
    });
  });
});
