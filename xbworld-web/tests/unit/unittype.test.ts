/**
 * Unit tests for data/unittype.ts
 *
 * Tests unit type query functions: utype_can_do_action,
 * can_player_build_unit_direct, get_units_from_tech.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UCF,
  UTYF_FLAGLESS,
  UTYF_PROVIDES_RANSOM,
  U_NOT_OBSOLETED,
  U_LAST,
  utype_can_do_action,
  can_player_build_unit_direct,
  get_units_from_tech,
} from '@/data/unittype';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Unittype constants', () => {
  it('should export UCF enum values', () => {
    expect(UCF.TERRAIN_SPEED).toBe(0);
    expect(UCF.CAN_OCCUPY_CITY).toBe(3);
    expect(UCF.MISSILE).toBe(4);
    expect(UCF.ZOC).toBe(8);
    expect(UCF.CAN_FORTIFY).toBe(9);
    expect(UCF.CAN_PILLAGE).toBe(10);
  });

  it('should export UTYF constants', () => {
    expect(UTYF_FLAGLESS).toBe(29);
    expect(UTYF_PROVIDES_RANSOM).toBe(30);
  });

  it('should export U_NOT_OBSOLETED as null', () => {
    expect(U_NOT_OBSOLETED).toBeNull();
  });

  it('should export U_LAST as a positive number', () => {
    expect(U_LAST).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// utype_can_do_action
// ---------------------------------------------------------------------------

describe('utype_can_do_action', () => {
  it('should return true when action is set', () => {
    const putype = {
      utype_actions: {
        isSet: (id: number) => id === 5,
      },
    };
    expect(utype_can_do_action(putype, 5)).toBe(true);
  });

  it('should return false when action is not set', () => {
    const putype = {
      utype_actions: {
        isSet: (id: number) => id === 5,
      },
    };
    expect(utype_can_do_action(putype, 3)).toBe(false);
  });

  it('should return false for null putype', () => {
    expect(utype_can_do_action(null, 0)).toBe(false);
  });

  it('should return false when utype_actions is null', () => {
    expect(utype_can_do_action({ utype_actions: null }, 0)).toBe(false);
  });

  it('should return false when utype_actions is undefined', () => {
    expect(utype_can_do_action({}, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// can_player_build_unit_direct
// ---------------------------------------------------------------------------

describe('can_player_build_unit_direct', () => {
  beforeEach(() => {
    win.TECH_KNOWN = 2;
    win.player_invention_state = (p: any, tech: number) => {
      if (p?.known_techs?.includes(tech)) return 2; // TECH_KNOWN
      return 0;
    };
    win.unit_types = {};
  });

  afterEach(() => {
    delete win.TECH_KNOWN;
    delete win.player_invention_state;
    delete win.unit_types;
  });

  it('should return false for null player', () => {
    expect(can_player_build_unit_direct(null, { tech_requirement: 5 })).toBe(false);
  });

  it('should return false for null unittype', () => {
    expect(can_player_build_unit_direct({ known_techs: [] }, null)).toBe(false);
  });

  it('should return true when player knows required tech', () => {
    const player = { known_techs: [10] };
    const utype = { tech_requirement: 10 };
    expect(can_player_build_unit_direct(player, utype)).toBe(true);
  });

  it('should return false when player lacks required tech', () => {
    const player = { known_techs: [5] };
    const utype = { tech_requirement: 10 };
    expect(can_player_build_unit_direct(player, utype)).toBe(false);
  });

  it('should return true when no tech requirement', () => {
    const player = { known_techs: [] };
    const utype = { tech_requirement: -1 };
    expect(can_player_build_unit_direct(player, utype)).toBe(true);
  });

  it('should return false when obsoleted_by unit is buildable', () => {
    const player = { known_techs: [10, 20] };
    const utype = { tech_requirement: 10, obsoleted_by: 2 };
    win.unit_types = {
      2: { tech_requirement: 20 },
    };
    expect(can_player_build_unit_direct(player, utype)).toBe(false);
  });

  it('should return true when obsoleting unit tech is not known', () => {
    const player = { known_techs: [10] };
    const utype = { tech_requirement: 10, obsoleted_by: 2 };
    win.unit_types = {
      2: { tech_requirement: 20 },
    };
    expect(can_player_build_unit_direct(player, utype)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get_units_from_tech
// ---------------------------------------------------------------------------

describe('get_units_from_tech', () => {
  beforeEach(() => {
    win.unit_types = {
      0: { id: 0, name: 'Warriors', tech_requirement: -1 },
      1: { id: 1, name: 'Phalanx', tech_requirement: 5 },
      2: { id: 2, name: 'Musketeers', tech_requirement: 10 },
      3: { id: 3, name: 'Pikemen', tech_requirement: 5 },
    };
  });

  afterEach(() => {
    delete win.unit_types;
  });

  it('should return units requiring the given tech', () => {
    const units = get_units_from_tech(5);
    expect(units).toHaveLength(2);
    expect(units.map((u: any) => u.name)).toContain('Phalanx');
    expect(units.map((u: any) => u.name)).toContain('Pikemen');
  });

  it('should return empty array when no units require the tech', () => {
    expect(get_units_from_tech(99)).toHaveLength(0);
  });

  it('should return units with no tech requirement when tech_requirement is -1', () => {
    const units = get_units_from_tech(-1);
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe('Warriors');
  });
});
