import { describe, it, expect } from 'vitest';
import { BitVector } from '@/utils/bitvector';

describe('BitVector', () => {
  it('should initialize from raw bytes', () => {
    const bv = new BitVector([0b10101010, 0b01010101]);
    expect(bv.isSet(0)).toBe(false);
    expect(bv.isSet(1)).toBe(true);
    expect(bv.isSet(7)).toBe(true);
    expect(bv.isSet(8)).toBe(true);
    expect(bv.isSet(9)).toBe(false);
  });

  it('should set and unset bits', () => {
    const bv = new BitVector([0, 0]);
    expect(bv.isSet(5)).toBe(false);
    bv.set(5);
    expect(bv.isSet(5)).toBe(true);
    bv.unset(5);
    expect(bv.isSet(5)).toBe(false);
  });

  it('should return correct bit set', () => {
    const bv = new BitVector([0b00001001]); // bits 0 and 3
    expect(bv.toBitSet()).toEqual([0, 3]);
  });

  it('should convert to string', () => {
    const bv = new BitVector([0b00000101]); // bits 0 and 2
    const str = bv.toString();
    expect(str[0]).toBe('1');
    expect(str[1]).toBe('0');
    expect(str[2]).toBe('1');
  });

  it('should handle Uint8Array input', () => {
    const bv = new BitVector(new Uint8Array([0xff]));
    for (let i = 0; i < 8; i++) {
      expect(bv.isSet(i)).toBe(true);
    }
  });

  it('should handle empty vector', () => {
    const bv = new BitVector([]);
    expect(bv.toBitSet()).toEqual([]);
    expect(bv.toString()).toBe('');
  });
});
