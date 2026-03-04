/**
 * Unit tests for data/tech.ts
 *
 * Tests tech query functions: playerInventionState, isTechReqForGoal,
 * isTechReqForTech, getCurrentBulbsOutputText, techIdByName.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TECH_UNKNOWN,
  TECH_PREREQS_KNOWN,
  TECH_KNOWN,
  AR_ONE,
  AR_TWO,
  AR_ROOT,
  AR_SIZE,
  TF_BONUS_TECH,
  TF_BRIDGE,
  TF_RAILROAD,
  TF_LAST,
  A_NONE,
  A_FIRST,
} from '@/data/tech';

// Side-effect import: triggers exposeToLegacy
import '@/data/tech';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Tech constants', () => {
  it('should export TECH_UNKNOWN=0, TECH_PREREQS_KNOWN=1, TECH_KNOWN=2', () => {
    expect(TECH_UNKNOWN).toBe(0);
    expect(TECH_PREREQS_KNOWN).toBe(1);
    expect(TECH_KNOWN).toBe(2);
  });

  it('should export AR_* constants', () => {
    expect(AR_ONE).toBe(0);
    expect(AR_TWO).toBe(1);
    expect(AR_ROOT).toBe(2);
    expect(AR_SIZE).toBe(3);
  });

  it('should export TF_* tech flag constants', () => {
    expect(TF_BONUS_TECH).toBe(0);
    expect(TF_BRIDGE).toBe(1);
    expect(TF_RAILROAD).toBe(2);
    expect(TF_LAST).toBe(6);
  });

  it('should export A_NONE=0 and A_FIRST=1', () => {
    expect(A_NONE).toBe(0);
    expect(A_FIRST).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// player_invention_state
// ---------------------------------------------------------------------------

describe('player_invention_state', () => {
  it('should return TECH_KNOWN when player has the tech', () => {
    const player = { inventions: { 5: TECH_KNOWN, 10: TECH_PREREQS_KNOWN } };
    expect(win.player_invention_state(player, 5)).toBe(TECH_KNOWN);
  });

  it('should return TECH_PREREQS_KNOWN when prereqs are known', () => {
    const player = { inventions: { 5: TECH_KNOWN, 10: TECH_PREREQS_KNOWN } };
    expect(win.player_invention_state(player, 10)).toBe(TECH_PREREQS_KNOWN);
  });

  it('should return TECH_UNKNOWN when tech is not in inventions', () => {
    const player = { inventions: { 5: TECH_KNOWN } };
    expect(win.player_invention_state(player, 99)).toBe(TECH_UNKNOWN);
  });

  it('should return TECH_UNKNOWN for null player', () => {
    expect(win.player_invention_state(null, 5)).toBe(TECH_UNKNOWN);
  });

  it('should return TECH_UNKNOWN when inventions is null', () => {
    const player = { inventions: null };
    expect(win.player_invention_state(player, 5)).toBe(TECH_UNKNOWN);
  });
});

// ---------------------------------------------------------------------------
// is_tech_req_for_goal (recursive)
// ---------------------------------------------------------------------------

describe('is_tech_req_for_goal', () => {
  beforeEach(() => {
    // Tech tree:
    //   1 (Alphabet) → 2 (Writing) → 3 (Literacy)
    //   4 (Masonry) → 3 (Literacy)
    win.techs = {
      1: { id: 1, name: 'Alphabet', research_reqs: [] },
      2: { id: 2, name: 'Writing', research_reqs: [{ value: 1 }] },
      3: { id: 3, name: 'Literacy', research_reqs: [{ value: 2 }, { value: 4 }] },
      4: { id: 4, name: 'Masonry', research_reqs: [] },
    };
  });

  afterEach(() => {
    delete win.techs;
  });

  it('should return true when check == goal', () => {
    expect(win.is_tech_req_for_goal(3, 3)).toBe(true);
  });

  it('should return true for direct requirement', () => {
    expect(win.is_tech_req_for_goal(2, 3)).toBe(true);
    expect(win.is_tech_req_for_goal(4, 3)).toBe(true);
  });

  it('should return true for transitive requirement', () => {
    // Alphabet(1) → Writing(2) → Literacy(3)
    expect(win.is_tech_req_for_goal(1, 3)).toBe(true);
  });

  it('should return false for non-requirement', () => {
    expect(win.is_tech_req_for_goal(4, 2)).toBe(false);
  });

  it('should return false when goalTechId is 0', () => {
    expect(win.is_tech_req_for_goal(1, 0)).toBe(false);
  });

  it('should return false when checkTechId is 0', () => {
    expect(win.is_tech_req_for_goal(0, 3)).toBe(false);
  });

  it('should return false for non-existent goal tech', () => {
    expect(win.is_tech_req_for_goal(1, 99)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// is_tech_req_for_tech (direct only)
// ---------------------------------------------------------------------------

describe('is_tech_req_for_tech', () => {
  beforeEach(() => {
    win.techs = {
      1: { id: 1, name: 'Alphabet', research_reqs: [] },
      2: { id: 2, name: 'Writing', research_reqs: [{ value: 1 }] },
      3: { id: 3, name: 'Literacy', research_reqs: [{ value: 2 }, { value: 4 }] },
      4: { id: 4, name: 'Masonry', research_reqs: [] },
    };
  });

  afterEach(() => {
    delete win.techs;
  });

  it('should return true for direct requirement', () => {
    expect(win.is_tech_req_for_tech(1, 2)).toBe(true);
    expect(win.is_tech_req_for_tech(2, 3)).toBe(true);
  });

  it('should return false for transitive requirement (not direct)', () => {
    expect(win.is_tech_req_for_tech(1, 3)).toBe(false);
  });

  it('should return false when check == next', () => {
    expect(win.is_tech_req_for_tech(2, 2)).toBe(false);
  });

  it('should return false for non-requirement', () => {
    expect(win.is_tech_req_for_tech(4, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// get_current_bulbs_output_text
// ---------------------------------------------------------------------------

describe('get_current_bulbs_output_text', () => {
  it('should return "No bulbs researched" when both are 0', () => {
    const cbo = { self_bulbs: 0, self_upkeep: 0, pooled: false, team_bulbs: 0, team_upkeep: 0 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('No bulbs researched');
  });

  it('should return "X bulbs/turn" when no upkeep', () => {
    const cbo = { self_bulbs: 10, self_upkeep: 0, pooled: false, team_bulbs: 10, team_upkeep: 0 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('10 bulbs/turn');
  });

  it('should return singular "bulb/turn" when net is 1', () => {
    const cbo = { self_bulbs: 3, self_upkeep: 2, pooled: false, team_bulbs: 3, team_upkeep: 2 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('3 - 2 = 1 bulb/turn');
  });

  it('should return singular "bulb/turn" when net is -1', () => {
    const cbo = { self_bulbs: 2, self_upkeep: 3, pooled: false, team_bulbs: 2, team_upkeep: 3 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('2 - 3 = -1 bulb/turn');
  });

  it('should show upkeep when non-zero', () => {
    const cbo = { self_bulbs: 15, self_upkeep: 5, pooled: false, team_bulbs: 15, team_upkeep: 5 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('15 - 5 = 10 bulbs/turn');
  });

  it('should append team total when pooled', () => {
    const cbo = { self_bulbs: 10, self_upkeep: 0, pooled: true, team_bulbs: 25, team_upkeep: 3 };
    expect(win.get_current_bulbs_output_text(cbo)).toBe('10 bulbs/turn (22 team total)');
  });
});

// ---------------------------------------------------------------------------
// tech_id_by_name
// ---------------------------------------------------------------------------

describe('tech_id_by_name', () => {
  beforeEach(() => {
    win.techs = {
      1: { id: 1, name: 'Alphabet' },
      2: { id: 2, name: 'Writing' },
      3: { id: 3, name: 'Literacy' },
    };
  });

  afterEach(() => {
    delete win.techs;
  });

  it('should return tech id as string when found', () => {
    expect(win.tech_id_by_name('Writing')).toBe('2');
  });

  it('should return null when not found', () => {
    expect(win.tech_id_by_name('NonExistent')).toBeNull();
  });
});
