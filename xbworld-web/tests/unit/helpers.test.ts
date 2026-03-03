import { describe, it, expect } from 'vitest';
import {
  clone,
  DIVIDE,
  FC_WRAP,
  XOR,
  numberWithCommas,
  toTitleCase,
  stringUnqualify,
  secondsToHumanTime,
} from '@/utils/helpers';

describe('clone', () => {
  it('should deep clone objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('should return primitives as-is', () => {
    expect(clone(42)).toBe(42);
    expect(clone('hello')).toBe('hello');
    expect(clone(null)).toBe(null);
  });
});

describe('DIVIDE', () => {
  it('should divide and floor toward negative infinity', () => {
    expect(DIVIDE(7, 3)).toBe(2);
    expect(DIVIDE(-7, 3)).toBe(-3);
    expect(DIVIDE(6, 3)).toBe(2);
    expect(DIVIDE(0, 5)).toBe(0);
  });
});

describe('FC_WRAP', () => {
  it('should wrap positive values', () => {
    expect(FC_WRAP(5, 4)).toBe(1);
    expect(FC_WRAP(4, 4)).toBe(0);
    expect(FC_WRAP(3, 4)).toBe(3);
  });

  it('should wrap negative values', () => {
    expect(FC_WRAP(-1, 4)).toBe(3);
    expect(FC_WRAP(-4, 4)).toBe(0);
    expect(FC_WRAP(-5, 4)).toBe(3);
  });

  it('should handle zero', () => {
    expect(FC_WRAP(0, 4)).toBe(0);
  });
});

describe('XOR', () => {
  it('should return correct XOR', () => {
    expect(XOR(true, false)).toBe(true);
    expect(XOR(false, true)).toBe(true);
    expect(XOR(true, true)).toBe(false);
    expect(XOR(false, false)).toBe(false);
  });
});

describe('numberWithCommas', () => {
  it('should format numbers with commas', () => {
    expect(numberWithCommas(1000)).toBe('1,000');
    expect(numberWithCommas(1000000)).toBe('1,000,000');
    expect(numberWithCommas(999)).toBe('999');
    expect(numberWithCommas(0)).toBe('0');
  });
});

describe('toTitleCase', () => {
  it('should convert to title case', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
    expect(toTitleCase('HELLO')).toBe('Hello');
  });
});

describe('stringUnqualify', () => {
  it('should remove translation qualifier', () => {
    expect(stringUnqualify('?terrain:Plains')).toBe('Plains');
    expect(stringUnqualify('Plains')).toBe('Plains');
    expect(stringUnqualify('?:Empty')).toBe('Empty');
  });
});

describe('secondsToHumanTime', () => {
  it('should format seconds as human time', () => {
    expect(secondsToHumanTime(0)).toBe('0s');
    expect(secondsToHumanTime(45)).toBe('45s');
    expect(secondsToHumanTime(125)).toBe('2m 5s');
    expect(secondsToHumanTime(3661)).toBe('1h 1m');
  });
});
