/**
 * Unit tests for data/nation.ts
 *
 * Tests nation query functions: loveText, getScoreText, colLove.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MAX_AI_LOVE,
  loveText,
  getScoreText,
  colLove,
} from '@/data/nation';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Nation constants', () => {
  it('should export MAX_AI_LOVE as 1000', () => {
    expect(MAX_AI_LOVE).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// loveText
// ---------------------------------------------------------------------------

describe('loveText', () => {
  it('should return "Genocidal" for very negative love', () => {
    expect(loveText(-950)).toBe('Genocidal');
    expect(loveText(-1000)).toBe('Genocidal');
  });

  it('should return "Belligerent" for moderately negative love', () => {
    expect(loveText(-750)).toBe('Belligerent');
  });

  it('should return "Hostile" for somewhat negative love', () => {
    expect(loveText(-550)).toBe('Hostile');
  });

  it('should return "Uncooperative" for slightly negative love', () => {
    expect(loveText(-300)).toBe('Uncooperative');
  });

  it('should return "Uneasy" for mildly negative love', () => {
    expect(loveText(-150)).toBe('Uneasy');
  });

  it('should return "Neutral" for near-zero love', () => {
    expect(loveText(0)).toBe('Neutral');
    expect(loveText(50)).toBe('Neutral');
    expect(loveText(-50)).toBe('Neutral');
  });

  it('should return "Respectful" for slightly positive love', () => {
    expect(loveText(200)).toBe('Respectful');
  });

  it('should return "Helpful" for moderately positive love', () => {
    expect(loveText(400)).toBe('Helpful');
  });

  it('should return "Enthusiastic" for quite positive love', () => {
    expect(loveText(600)).toBe('Enthusiastic');
  });

  it('should return "Admiring" for very positive love', () => {
    expect(loveText(850)).toBe('Admiring');
  });

  it('should return "Worshipful" for maximum love', () => {
    expect(loveText(950)).toBe('Worshipful');
    expect(loveText(1000)).toBe('Worshipful');
  });
});

// ---------------------------------------------------------------------------
// getScoreText
// ---------------------------------------------------------------------------

describe('getScoreText', () => {
  it('should return score when >= 0', () => {
    expect(getScoreText({ score: 100 })).toBe(100);
    expect(getScoreText({ score: 0 })).toBe(0);
  });

  it('should return "?" when score is negative', () => {
    expect(getScoreText({ score: -1 })).toBe('?');
  });
});

// ---------------------------------------------------------------------------
// colLove
// ---------------------------------------------------------------------------

describe('colLove', () => {
  beforeEach(() => {
    win.client_is_observer = () => false;
    win.client = {
      conn: {
        playing: { playerno: 0 },
      },
    };
    win.PLRF_AI = 0;
  });

  afterEach(() => {
    delete win.client_is_observer;
    delete win.client;
    delete win.PLRF_AI;
  });

  it('should return "-" when player is the current player', () => {
    const pplayer = {
      playerno: 0,
      flags: { isSet: () => true },
      love: { 0: 500 },
    };
    expect(colLove(pplayer)).toBe('-');
  });

  it('should return "-" when client is observer', () => {
    win.client_is_observer = () => true;
    const pplayer = {
      playerno: 1,
      flags: { isSet: () => true },
      love: { 0: 500 },
    };
    expect(colLove(pplayer)).toBe('-');
  });

  it('should return "-" when player is not AI', () => {
    const pplayer = {
      playerno: 1,
      flags: { isSet: () => false },
      love: { 0: 500 },
    };
    expect(colLove(pplayer)).toBe('-');
  });

  it('should return love text for AI player', () => {
    const pplayer = {
      playerno: 1,
      flags: { isSet: (flag: number) => flag === 0 },
      love: { 0: 500 },
    };
    expect(colLove(pplayer)).toBe('Helpful');
  });

  it('should return "Genocidal" for AI with very low love', () => {
    const pplayer = {
      playerno: 1,
      flags: { isSet: (flag: number) => flag === 0 },
      love: { 0: -950 },
    };
    expect(colLove(pplayer)).toBe('Genocidal');
  });
});
