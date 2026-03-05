/**
 * Unit tests for data/city.ts
 *
 * Tests all pure-data query functions migrated from legacy city.js.
 * Functions that depend on complex legacy globals (e.g. renderer, DOM)
 * are tested with minimal stubs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CITYO_DISBAND,
  CITYO_NEW_EINSTEIN,
  CITYO_NEW_TAXMAN,
  CITYO_LAST,
  FEELING_BASE,
  FEELING_LUXURY,
  FEELING_EFFECT,
  FEELING_NATIONALITY,
  FEELING_MARTIAL,
  FEELING_FINAL,
  MAX_LEN_WORKLIST,
  INCITE_IMPOSSIBLE_COST,
  cityOwnerPlayerId,
  cityOwner,
  cityTile,
  isCityCenter,
  isFreeWorked,
  isPrimaryCapital,
  getCityProductionType,
  cityTurnsToBuild,
  getProductionProgress,
  canCityBuildUnitNow,
  canCityBuildImprovementNow,
  canCityBuildNow,
  cityHasBuilding,
  doesCityHaveImprovement,
  cityCanBuy,
  cityTurnsToGrowthText,
  cityUnhappy,
  cityPopulation,
  dxyToCenterIndex,
  deltaTileHelper,
  cityTo3dModelName,
  getCitywallsScale,
} from '@/data/city';
import {
  VUT_UTYPE,
  VUT_IMPROVEMENT,
  CAPITAL_PRIMARY,
  FC_INFINITY,
} from '@/data/fcTypes';
import { universalBuildShieldCost } from '@/data/requirements';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCity(overrides: Record<string, any> = {}): any {
  return {
    id: 1,
    owner: 0,
    tile: 10,
    name: 'Rome',
    size: 5,
    food_stock: 20,
    shield_stock: 10,
    production_kind: VUT_UTYPE,
    production_value: 1,
    surplus: [0, 5, 0, 0, 0, 0], // index 1 = O_SHIELD
    waste: [],
    unhappy_penalty: [],
    prod: [],
    citizen_extra: [],
    ppl_happy: [0, 0, 0, 0, 0, 3],
    ppl_content: [0, 0, 0, 0, 0, 2],
    ppl_unhappy: [0, 0, 0, 0, 0, 0],
    ppl_angry: [0, 0, 0, 0, 0, 0],
    improvements: null,
    capital: 0,
    granary_turns: 5,
    did_buy: false,
    turn_founded: 0,
    style: 0,
    ...overrides,
  };
}

function makeBitVector(setBits: number[]): any {
  return {
    isSet(bit: number): boolean {
      return setBits.includes(bit);
    },
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('City constants', () => {
  it('should export CITYO_* constants with correct values', () => {
    expect(CITYO_DISBAND).toBe(0);
    expect(CITYO_NEW_EINSTEIN).toBe(1);
    expect(CITYO_NEW_TAXMAN).toBe(2);
    expect(CITYO_LAST).toBe(3);
  });

  it('should export FEELING_* constants with correct values', () => {
    expect(FEELING_BASE).toBe(0);
    expect(FEELING_LUXURY).toBe(1);
    expect(FEELING_EFFECT).toBe(2);
    expect(FEELING_NATIONALITY).toBe(3);
    expect(FEELING_MARTIAL).toBe(4);
    expect(FEELING_FINAL).toBe(5);
  });

  it('should export MAX_LEN_WORKLIST and INCITE_IMPOSSIBLE_COST', () => {
    expect(MAX_LEN_WORKLIST).toBe(64);
    expect(INCITE_IMPOSSIBLE_COST).toBe(1000 * 1000 * 1000);
  });
});

// ---------------------------------------------------------------------------
// Basic city queries
// ---------------------------------------------------------------------------

describe('cityOwnerPlayerId', () => {
  it('should return the owner id of a city', () => {
    const city = makeCity({ owner: 3 });
    expect(cityOwnerPlayerId(city)).toBe(3);
  });

  it('should return null for null city', () => {
    expect(cityOwnerPlayerId(null)).toBeNull();
  });

  it('should return null for undefined city', () => {
    expect(cityOwnerPlayerId(undefined)).toBeNull();
  });
});

describe('cityOwner', () => {
  beforeEach(() => {
    win.players = {
      0: { playerno: 0, name: 'Player0' },
      1: { playerno: 1, name: 'Player1' },
    };
  });

  afterEach(() => {
    delete win.players;
  });

  it('should return the player object that owns the city', () => {
    const city = makeCity({ owner: 1 });
    expect(cityOwner(city).name).toBe('Player1');
  });
});

describe('cityTile', () => {
  beforeEach(() => {
    win.index_to_tile = (idx: number) => ({ index: idx, x: idx % 10, y: Math.floor(idx / 10) });
  });

  afterEach(() => {
    delete win.index_to_tile;
  });

  it('should return the tile for a city', () => {
    const city = makeCity({ tile: 25 });
    const tile = cityTile(city);
    expect(tile.index).toBe(25);
    expect(tile.x).toBe(5);
    expect(tile.y).toBe(2);
  });

  it('should return null for null city', () => {
    expect(cityTile(null)).toBeNull();
  });
});

describe('isCityCenter', () => {
  it('should return true when tile index matches city tile', () => {
    const city = makeCity({ tile: 50 });
    expect(isCityCenter(city, { index: 50 })).toBe(true);
  });

  it('should return false when tile index does not match', () => {
    const city = makeCity({ tile: 50 });
    expect(isCityCenter(city, { index: 51 })).toBe(false);
  });
});

describe('isFreeWorked', () => {
  it('should return true for city center tile', () => {
    const city = makeCity({ tile: 50 });
    expect(isFreeWorked(city, { index: 50 })).toBe(true);
  });

  it('should return false for non-center tile', () => {
    const city = makeCity({ tile: 50 });
    expect(isFreeWorked(city, { index: 49 })).toBe(false);
  });
});

describe('isPrimaryCapital', () => {
  it('should return true when capital equals CAPITAL_PRIMARY (2)', () => {
    const city = makeCity({ capital: CAPITAL_PRIMARY });
    expect(isPrimaryCapital(city)).toBe(true);
  });

  it('should return false when capital is 0', () => {
    const city = makeCity({ capital: 0 });
    expect(isPrimaryCapital(city)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Production queries
// ---------------------------------------------------------------------------

describe('getCityProductionType', () => {
  beforeEach(() => {
    win.unit_types = { 1: { id: 1, name: 'Warriors' }, 2: { id: 2, name: 'Phalanx' } };
    win.improvements = { 10: { id: 10, name: 'Granary' }, 11: { id: 11, name: 'Library' } };
  });

  afterEach(() => {
    delete win.unit_types;
    delete win.improvements;
  });

  it('should return unit type when production_kind is VUT_UTYPE', () => {
    const city = makeCity({ production_kind: VUT_UTYPE, production_value: 1 });
    expect(getCityProductionType(city).name).toBe('Warriors');
  });

  it('should return improvement when production_kind is VUT_IMPROVEMENT', () => {
    const city = makeCity({ production_kind: VUT_IMPROVEMENT, production_value: 10 });
    expect(getCityProductionType(city).name).toBe('Granary');
  });

  it('should return null for null city', () => {
    expect(getCityProductionType(null)).toBeNull();
  });

  it('should return null for unknown production_kind', () => {
    const city = makeCity({ production_kind: 99, production_value: 1 });
    expect(getCityProductionType(city)).toBeNull();
  });
});

describe('cityTurnsToBuild', () => {
  beforeEach(() => {
    win.universal_build_shield_cost = (_city: any, target: any) => target.build_cost;
  });

  afterEach(() => {
    delete win.universal_build_shield_cost;
  });

  it('should return 1 when shield_stock >= cost', () => {
    const city = makeCity({ shield_stock: 50, surplus: [0, 5, 0, 0, 0, 0] });
    const target = { build_cost: 40 };
    expect(cityTurnsToBuild(city, target, true)).toBe(1);
  });

  it('should calculate turns when surplus is positive', () => {
    // cost=40, stock=10, surplus[O_SHIELD]=5 → (40-10-1)/5 + 1 = 29/5 + 1 = 5+1 = 6
    const city = makeCity({ shield_stock: 10, surplus: [0, 5, 0, 0, 0, 0] });
    const target = { build_cost: 40 };
    expect(cityTurnsToBuild(city, target, true)).toBe(6);
  });

  it('should return FC_INFINITY when surplus is zero', () => {
    const city = makeCity({ shield_stock: 10, surplus: [0, 0, 0, 0, 0, 0] });
    const target = { build_cost: 40 };
    expect(cityTurnsToBuild(city, target, true)).toBe(FC_INFINITY);
  });

  it('should return FC_INFINITY when surplus is negative', () => {
    const city = makeCity({ shield_stock: 10, surplus: [0, -3, 0, 0, 0, 0] });
    const target = { build_cost: 40 };
    expect(cityTurnsToBuild(city, target, true)).toBe(FC_INFINITY);
  });

  it('should ignore shield_stock when includeShieldStock is false', () => {
    // cost=40, stock=0 (ignored), surplus[O_SHIELD]=10 → (40-0-1)/10 + 1 = 39/10 + 1 = 3+1 = 4
    const city = makeCity({ shield_stock: 30, surplus: [0, 10, 0, 0, 0, 0] });
    const target = { build_cost: 40 };
    expect(cityTurnsToBuild(city, target, false)).toBe(4);
  });
});

describe('getProductionProgress', () => {
  beforeEach(() => {
    win.unit_types = { 1: { id: 1, name: 'Warriors', build_cost: 30 } };
    win.improvements = {
      10: { id: 10, name: 'Granary', build_cost: 60 },
      11: { id: 11, name: 'Coinage', build_cost: 0 },
    };
    win.universal_build_shield_cost = (_city: any, target: any) => target.build_cost;
  });

  afterEach(() => {
    delete win.unit_types;
    delete win.improvements;
    delete win.universal_build_shield_cost;
  });

  it('should return "stock/cost" for unit production', () => {
    const city = makeCity({ production_kind: VUT_UTYPE, production_value: 1, shield_stock: 15 });
    expect(getProductionProgress(city)).toBe('15/30');
  });

  it('should return "stock/cost" for improvement production', () => {
    const city = makeCity({ production_kind: VUT_IMPROVEMENT, production_value: 10, shield_stock: 20 });
    expect(getProductionProgress(city)).toBe('20/60');
  });

  it('should return " " for Coinage', () => {
    const city = makeCity({ production_kind: VUT_IMPROVEMENT, production_value: 11, shield_stock: 0 });
    expect(getProductionProgress(city)).toBe(' ');
  });

  it('should return " " for null city', () => {
    expect(getProductionProgress(null)).toBe(' ');
  });
});

// ---------------------------------------------------------------------------
// Build capability queries
// ---------------------------------------------------------------------------

describe('canCityBuildUnitNow', () => {
  it('should return true when unit bit is set', () => {
    const city = makeCity({ can_build_unit: makeBitVector([1, 3, 5]) });
    expect(canCityBuildUnitNow(city, 3)).toBe(true);
  });

  it('should return false when unit bit is not set', () => {
    const city = makeCity({ can_build_unit: makeBitVector([1, 3, 5]) });
    expect(canCityBuildUnitNow(city, 2)).toBe(false);
  });

  it('should return false for null city', () => {
    expect(canCityBuildUnitNow(null, 1)).toBe(false);
  });

  it('should return false when can_build_unit is undefined', () => {
    const city = makeCity();
    expect(canCityBuildUnitNow(city, 1)).toBe(false);
  });
});

describe('canCityBuildImprovementNow', () => {
  it('should return true when improvement bit is set', () => {
    const city = makeCity({ can_build_improvement: makeBitVector([10, 20]) });
    expect(canCityBuildImprovementNow(city, 10)).toBe(true);
  });

  it('should return false when improvement bit is not set', () => {
    const city = makeCity({ can_build_improvement: makeBitVector([10, 20]) });
    expect(canCityBuildImprovementNow(city, 15)).toBe(false);
  });
});

describe('canCityBuildNow', () => {
  it('should delegate to canCityBuildUnitNow for VUT_UTYPE', () => {
    const city = makeCity({ can_build_unit: makeBitVector([1]) });
    expect(canCityBuildNow(city, VUT_UTYPE, 1)).toBe(true);
    expect(canCityBuildNow(city, VUT_UTYPE, 2)).toBe(false);
  });

  it('should delegate to canCityBuildImprovementNow for VUT_IMPROVEMENT', () => {
    const city = makeCity({ can_build_improvement: makeBitVector([10]) });
    expect(canCityBuildNow(city, VUT_IMPROVEMENT, 10)).toBe(true);
    expect(canCityBuildNow(city, VUT_IMPROVEMENT, 11)).toBe(false);
  });

  it('should return false for null kind or value', () => {
    const city = makeCity();
    expect(canCityBuildNow(city, null, 1)).toBe(false);
    expect(canCityBuildNow(city, 0, null)).toBe(false);
  });
});

describe('cityHasBuilding', () => {
  beforeEach(() => {
    win.ruleset_control = { num_impr_types: 50 };
  });

  afterEach(() => {
    delete win.ruleset_control;
  });

  it('should return true when improvement is present', () => {
    const city = makeCity({ improvements: makeBitVector([5, 10, 20]) });
    expect(cityHasBuilding(city, 10)).toBe(true);
  });

  it('should return false when improvement is not present', () => {
    const city = makeCity({ improvements: makeBitVector([5, 10, 20]) });
    expect(cityHasBuilding(city, 15)).toBe(false);
  });

  it('should return false for negative improvement id', () => {
    const city = makeCity({ improvements: makeBitVector([5]) });
    expect(cityHasBuilding(city, -1)).toBe(false);
  });

  it('should return false for improvement id >= num_impr_types', () => {
    const city = makeCity({ improvements: makeBitVector([5]) });
    expect(cityHasBuilding(city, 50)).toBe(false);
  });
});

describe('doesCityHaveImprovement', () => {
  beforeEach(() => {
    win.ruleset_control = { num_impr_types: 3 };
    win.improvements = {
      0: { id: 0, name: 'Palace' },
      1: { id: 1, name: 'Granary' },
      2: { id: 2, name: 'Library' },
    };
  });

  afterEach(() => {
    delete win.ruleset_control;
    delete win.improvements;
  });

  it('should return true when city has the named improvement', () => {
    const city = makeCity({ improvements: makeBitVector([1]) });
    expect(doesCityHaveImprovement(city, 'Granary')).toBe(true);
  });

  it('should return false when city does not have the improvement', () => {
    const city = makeCity({ improvements: makeBitVector([1]) });
    expect(doesCityHaveImprovement(city, 'Library')).toBe(false);
  });

  it('should return false for null city', () => {
    expect(doesCityHaveImprovement(null, 'Granary')).toBe(false);
  });
});

describe('cityCanBuy', () => {
  beforeEach(() => {
    win.improvements = { 10: { id: 10, name: 'Granary' }, 11: { id: 11, name: 'Coinage' } };
    win.game_info = { turn: 5 };
  });

  afterEach(() => {
    delete win.improvements;
    delete win.game_info;
  });

  it('should return true when city can buy', () => {
    const city = makeCity({ did_buy: false, turn_founded: 1, production_value: 10 });
    expect(cityCanBuy(city)).toBe(true);
  });

  it('should return false when city already bought this turn', () => {
    const city = makeCity({ did_buy: true, turn_founded: 1, production_value: 10 });
    expect(cityCanBuy(city)).toBe(false);
  });

  it('should return false when city was founded this turn', () => {
    const city = makeCity({ did_buy: false, turn_founded: 5, production_value: 10 });
    expect(cityCanBuy(city)).toBe(false);
  });

  it('should return false when producing Coinage', () => {
    const city = makeCity({ did_buy: false, turn_founded: 1, production_value: 11 });
    expect(cityCanBuy(city)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// City growth and state
// ---------------------------------------------------------------------------

describe('cityTurnsToGrowthText', () => {
  it('should return "blocked" when granary_turns is 0', () => {
    expect(cityTurnsToGrowthText(makeCity({ granary_turns: 0 }))).toBe('blocked');
  });

  it('should return "never" when granary_turns > 1000000', () => {
    expect(cityTurnsToGrowthText(makeCity({ granary_turns: 1000001 }))).toBe('never');
  });

  it('should return starving text when granary_turns is negative', () => {
    expect(cityTurnsToGrowthText(makeCity({ granary_turns: -3 }))).toBe('Starving in 3 turns');
  });

  it('should return turns text for positive granary_turns', () => {
    expect(cityTurnsToGrowthText(makeCity({ granary_turns: 5 }))).toBe('5 turns');
  });
});

describe('cityUnhappy', () => {
  it('should return false when happy >= unhappy + 2*angry', () => {
    const city = makeCity({
      ppl_happy: [0, 0, 0, 0, 0, 5],
      ppl_unhappy: [0, 0, 0, 0, 0, 3],
      ppl_angry: [0, 0, 0, 0, 0, 1],
    });
    expect(cityUnhappy(city)).toBe(false);
  });

  it('should return true when happy < unhappy + 2*angry', () => {
    const city = makeCity({
      ppl_happy: [0, 0, 0, 0, 0, 2],
      ppl_unhappy: [0, 0, 0, 0, 0, 3],
      ppl_angry: [0, 0, 0, 0, 0, 1],
    });
    expect(cityUnhappy(city)).toBe(true);
  });
});

describe('cityPopulation', () => {
  it('should calculate population as size*(size+1)*5 (in thousands)', () => {
    expect(cityPopulation(makeCity({ size: 1 }))).toBe(10); // 1*2*5
    expect(cityPopulation(makeCity({ size: 5 }))).toBe(150); // 5*6*5
    expect(cityPopulation(makeCity({ size: 10 }))).toBe(550); // 10*11*5
  });
});

// ---------------------------------------------------------------------------
// Tile map functions
// ---------------------------------------------------------------------------

describe('dxyToCenterIndex', () => {
  it('should compute flat array index from dx, dy, r', () => {
    expect(dxyToCenterIndex(0, 0, 2)).toBe(12);
    expect(dxyToCenterIndex(-2, -2, 2)).toBe(0);
    expect(dxyToCenterIndex(2, 2, 2)).toBe(24);
    expect(dxyToCenterIndex(1, -1, 2)).toBe(16);
  });
});

describe('deltaTileHelper', () => {
  it('should return correct deltas when pos is near start', () => {
    const [dMin, dMax, i] = deltaTileHelper(1, 3, 10);
    expect(dMin).toBe(-1);
    expect(dMax).toBe(8);
    expect(i).toBe(2);
  });

  it('should return correct deltas when pos is near end', () => {
    const [dMin, dMax, i] = deltaTileHelper(8, 3, 10);
    expect(dMin).toBe(-8);
    expect(dMax).toBe(1);
    expect(i).toBe(5);
  });

  it('should return i=0 when pos is in the middle', () => {
    const [dMin, dMax, i] = deltaTileHelper(5, 3, 10);
    expect(dMin).toBe(-5);
    expect(dMax).toBe(4);
    expect(i).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3D model helpers
// ---------------------------------------------------------------------------

describe('cityTo3dModelName', () => {
  beforeEach(() => {
    win.city_rules = [
      { rule_name: 'European' },
      { rule_name: 'Industrial' },
      { rule_name: 'Asian' },
    ];
  });

  afterEach(() => {
    delete win.city_rules;
  });

  it('should return european style for small city', () => {
    const city = makeCity({ size: 2, style: 0 });
    expect(cityTo3dModelName(city)).toBe('city_european_0');
  });

  it('should return european style for medium city (size 3-6)', () => {
    const city = makeCity({ size: 5, style: 0 });
    expect(cityTo3dModelName(city)).toBe('city_european_1');
  });

  it('should return european style for large city (size 7-9)', () => {
    const city = makeCity({ size: 8, style: 0 });
    expect(cityTo3dModelName(city)).toBe('city_european_2');
  });

  it('should return european style for very large city (size 10-11)', () => {
    const city = makeCity({ size: 10, style: 0 });
    expect(cityTo3dModelName(city)).toBe('city_european_3');
  });

  it('should return european style for mega city (size > 11)', () => {
    const city = makeCity({ size: 15, style: 0 });
    expect(cityTo3dModelName(city)).toBe('city_european_4');
  });

  it('should return modern style for Industrial city rule', () => {
    const city = makeCity({ size: 5, style: 1 });
    expect(cityTo3dModelName(city)).toBe('city_modern_1');
  });

  it('should return modern style for Asian city rule', () => {
    const city = makeCity({ size: 5, style: 2 });
    expect(cityTo3dModelName(city)).toBe('city_modern_1');
  });

  it('should default to style 0 when style is -1', () => {
    const city = makeCity({ size: 5, style: -1 });
    expect(cityTo3dModelName(city)).toBe('city_european_1');
  });
});

describe('getCitywallsScale', () => {
  it('should return 8 for small city (size < 3)', () => {
    expect(getCitywallsScale(makeCity({ size: 2 }))).toBe(8);
  });

  it('should return 9 for size 3-6', () => {
    expect(getCitywallsScale(makeCity({ size: 5 }))).toBe(9);
  });

  it('should return 10 for size 7-9', () => {
    expect(getCitywallsScale(makeCity({ size: 8 }))).toBe(10);
  });

  it('should return 11 for size 10-11', () => {
    expect(getCitywallsScale(makeCity({ size: 11 }))).toBe(11);
  });

  it('should return 12 for size > 11', () => {
    expect(getCitywallsScale(makeCity({ size: 15 }))).toBe(12);
  });
});
