/**
 * Unit tests for data/requirements.ts
 *
 * Tests the requirement evaluation system used for tech prerequisites,
 * building requirements, etc.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TRI_NO,
  TRI_YES,
  TRI_MAYBE,
  VUT_NONE,
  VUT_ADVANCE,
  VUT_GOVERNMENT,
  VUT_IMPROVEMENT,
  VUT_COUNT,
  REQ_RANGE_PLAYER,
  REQ_RANGE_TEAM,
  REQ_RANGE_WORLD,
  REQ_RANGE_LOCAL,
  RPT_POSSIBLE,
} from '@/data/fcTypes';

// Side-effect import: triggers exposeToLegacy calls so functions
// become available on window.
import '@/data/requirements';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Record<string, any> = {}): any {
  return {
    kind: VUT_NONE,
    range: REQ_RANGE_PLAYER,
    value: 0,
    present: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// is_tech_in_range
// ---------------------------------------------------------------------------

describe('is_tech_in_range', () => {
  beforeEach(() => {
    win.TECH_KNOWN = 2;
    win.player_invention_state = (player: any, tech: number) => {
      if (player?.known_techs?.includes(tech)) return 2; // TECH_KNOWN
      return 0; // TECH_UNKNOWN
    };
  });

  afterEach(() => {
    delete win.TECH_KNOWN;
    delete win.player_invention_state;
  });

  it('should return TRI_YES when player knows the tech (PLAYER range)', () => {
    const player = { known_techs: [5, 10, 15] };
    expect(win.is_tech_in_range(player, REQ_RANGE_PLAYER, 10)).toBe(TRI_YES);
  });

  it('should return TRI_NO when player does not know the tech', () => {
    const player = { known_techs: [5, 10, 15] };
    expect(win.is_tech_in_range(player, REQ_RANGE_PLAYER, 20)).toBe(TRI_NO);
  });

  it('should return TRI_NO when player is null', () => {
    expect(win.is_tech_in_range(null, REQ_RANGE_PLAYER, 10)).toBe(TRI_NO);
  });

  it('should return TRI_MAYBE for TEAM range (unimplemented)', () => {
    const player = { known_techs: [5] };
    expect(win.is_tech_in_range(player, REQ_RANGE_TEAM, 5)).toBe(TRI_MAYBE);
  });

  it('should return TRI_MAYBE for WORLD range (unimplemented)', () => {
    const player = { known_techs: [5] };
    expect(win.is_tech_in_range(player, REQ_RANGE_WORLD, 5)).toBe(TRI_MAYBE);
  });

  it('should return TRI_MAYBE for invalid range (LOCAL)', () => {
    const player = { known_techs: [5] };
    expect(win.is_tech_in_range(player, REQ_RANGE_LOCAL, 5)).toBe(TRI_MAYBE);
  });
});

// ---------------------------------------------------------------------------
// is_req_active
// ---------------------------------------------------------------------------

describe('is_req_active', () => {
  beforeEach(() => {
    win.TECH_KNOWN = 2;
    win.player_invention_state = (player: any, tech: number) => {
      if (player?.known_techs?.includes(tech)) return 2;
      return 0;
    };
  });

  afterEach(() => {
    delete win.TECH_KNOWN;
    delete win.player_invention_state;
  });

  it('should return true for VUT_NONE requirement', () => {
    const req = makeReq({ kind: VUT_NONE });
    expect(win.is_req_active(null, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });

  it('should return true when tech requirement is met', () => {
    const player = { known_techs: [10] };
    const req = makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: true });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });

  it('should return false when tech requirement is not met', () => {
    const player = { known_techs: [5] };
    const req = makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: true });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(false);
  });

  it('should handle negated requirement (present=false)', () => {
    const player = { known_techs: [10] };
    // present=false means "tech must NOT be known"
    const req = makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: false });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(false);
  });

  it('should return true for negated requirement when tech is not known', () => {
    const player = { known_techs: [5] };
    const req = makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: false });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });

  it('should handle VUT_GOVERNMENT requirement', () => {
    const player = { government: 3 };
    const req = makeReq({ kind: VUT_GOVERNMENT, value: 3, present: true });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });

  it('should return false when government does not match', () => {
    const player = { government: 2 };
    const req = makeReq({ kind: VUT_GOVERNMENT, value: 3, present: true });
    expect(win.is_req_active(player, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(false);
  });

  it('should return TRI_MAYBE → true for government with null player and RPT_POSSIBLE', () => {
    const req = makeReq({ kind: VUT_GOVERNMENT, value: 3, present: true });
    expect(win.is_req_active(null, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });

  it('should return false for VUT_COUNT', () => {
    const req = makeReq({ kind: VUT_COUNT, present: true });
    expect(win.is_req_active(null, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(false);
  });

  it('should return false for unimplemented VUT types (result stays TRI_NO)', () => {
    // VUT_IMPROVEMENT falls through to the unimplemented branch.
    // result stays at its initial value TRI_NO.
    // With present=true, TRI_NO → returns false.
    const req = makeReq({ kind: VUT_IMPROVEMENT, value: 5, present: true });
    expect(win.is_req_active(null, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(false);
  });

  it('should return true for unimplemented VUT types with present=false', () => {
    // result=TRI_NO, present=false → result !== TRI_YES → returns true (negated)
    const req = makeReq({ kind: VUT_IMPROVEMENT, value: 5, present: false });
    expect(win.is_req_active(null, null, null, null, null, null, null, req, RPT_POSSIBLE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// are_reqs_active
// ---------------------------------------------------------------------------

describe('are_reqs_active', () => {
  beforeEach(() => {
    win.TECH_KNOWN = 2;
    win.player_invention_state = (player: any, tech: number) => {
      if (player?.known_techs?.includes(tech)) return 2;
      return 0;
    };
  });

  afterEach(() => {
    delete win.TECH_KNOWN;
    delete win.player_invention_state;
  });

  it('should return true when all requirements are met', () => {
    const player = { known_techs: [5, 10], government: 3 };
    const reqs = [
      makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 5, present: true }),
      makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: true }),
      makeReq({ kind: VUT_GOVERNMENT, value: 3, present: true }),
    ];
    expect(win.are_reqs_active(player, null, null, null, null, null, null, reqs, RPT_POSSIBLE)).toBe(true);
  });

  it('should return false when any requirement is not met', () => {
    const player = { known_techs: [5], government: 3 };
    const reqs = [
      makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 5, present: true }),
      makeReq({ kind: VUT_ADVANCE, range: REQ_RANGE_PLAYER, value: 10, present: true }), // not met
    ];
    expect(win.are_reqs_active(player, null, null, null, null, null, null, reqs, RPT_POSSIBLE)).toBe(false);
  });

  it('should return true for empty requirements list', () => {
    expect(win.are_reqs_active(null, null, null, null, null, null, null, [], RPT_POSSIBLE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// universal_build_shield_cost
// ---------------------------------------------------------------------------

describe('universal_build_shield_cost', () => {
  it('should return the build_cost of the target', () => {
    expect(win.universal_build_shield_cost(null, { build_cost: 60 })).toBe(60);
    expect(win.universal_build_shield_cost(null, { build_cost: 0 })).toBe(0);
    expect(win.universal_build_shield_cost(null, { build_cost: 200 })).toBe(200);
  });
});
