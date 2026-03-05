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
  getRandomInt,
  isSmallScreen,
  getTilesetFileExtension,
  blur_input_on_touchdevice,
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

  it('should return 0s for negative values', () => {
    expect(secondsToHumanTime(-5)).toBe('0s');
  });

  it('should handle exactly 60 seconds', () => {
    expect(secondsToHumanTime(60)).toBe('1m 0s');
  });

  it('should handle exactly 3600 seconds', () => {
    expect(secondsToHumanTime(3600)).toBe('1h 0m');
  });
});

// ---------------------------------------------------------------------------
// Additional edge case tests
// ---------------------------------------------------------------------------

describe('clone edge cases', () => {
  it('should clone arrays', () => {
    const arr = [1, 2, { a: 3 }];
    const cloned = clone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[2]).not.toBe(arr[2]);
  });

  it('should return undefined as-is', () => {
    expect(clone(undefined)).toBe(undefined);
  });

  it('should return boolean as-is', () => {
    expect(clone(true)).toBe(true);
    expect(clone(false)).toBe(false);
  });
});

describe('DIVIDE edge cases', () => {
  it('should handle large numbers', () => {
    expect(DIVIDE(1000000, 3)).toBe(333333);
  });

  it('should handle negative divisor', () => {
    expect(DIVIDE(7, -3)).toBe(-3);
    expect(DIVIDE(-7, -3)).toBe(2);
  });

  it('should handle exact division', () => {
    expect(DIVIDE(9, 3)).toBe(3);
    expect(DIVIDE(-9, 3)).toBe(-3);
  });
});

describe('FC_WRAP edge cases', () => {
  it('should handle value equal to range', () => {
    expect(FC_WRAP(10, 10)).toBe(0);
  });

  it('should handle large negative values', () => {
    expect(FC_WRAP(-100, 7)).toBe(FC_WRAP(-100 % 7 + 7, 7));
  });

  it('should handle value much larger than range', () => {
    expect(FC_WRAP(25, 4)).toBe(1);
  });
});

describe('XOR with truthy/falsy values', () => {
  it('should work with truthy/falsy non-boolean values', () => {
    expect(XOR(1, 0)).toBe(true);
    expect(XOR(0, 1)).toBe(true);
    expect(XOR(1, 1)).toBe(false);
    expect(XOR(0, 0)).toBe(false);
    expect(XOR('a', '')).toBe(true);
    expect(XOR(null, undefined)).toBe(false);
  });
});

describe('numberWithCommas edge cases', () => {
  it('should handle negative numbers', () => {
    expect(numberWithCommas(-1000)).toBe('-1,000');
  });

  it('should handle string input', () => {
    expect(numberWithCommas('1234567')).toBe('1,234,567');
  });
});

describe('toTitleCase edge cases', () => {
  it('should handle single word', () => {
    expect(toTitleCase('hello')).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('should handle already title case', () => {
    expect(toTitleCase('Hello World')).toBe('Hello World');
  });
});

describe('stringUnqualify edge cases', () => {
  it('should handle ? without colon', () => {
    expect(stringUnqualify('?noColon')).toBe('?noColon');
  });

  it('should handle string starting with other char', () => {
    expect(stringUnqualify('normal:text')).toBe('normal:text');
  });

  it('should handle empty string', () => {
    expect(stringUnqualify('')).toBe('');
  });
});

describe('getRandomInt', () => {
  it('should return integer in [min, max) range', () => {
    for (let i = 0; i < 20; i++) {
      const val = getRandomInt(0, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('should return min when range is 1', () => {
    expect(getRandomInt(5, 6)).toBe(5);
  });
});

describe('isSmallScreen', () => {
  it('should return a boolean', () => {
    expect(typeof isSmallScreen()).toBe('boolean');
  });
});

describe('getTilesetFileExtension', () => {
  it('should return .png', () => {
    expect(getTilesetFileExtension()).toBe('.png');
  });
});

describe('blur_input_on_touchdevice', () => {
  it('should not throw when called', () => {
    expect(() => blur_input_on_touchdevice()).not.toThrow();
  });
});
