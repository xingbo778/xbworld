/**
 * Efficient bit vector backed by a Uint8Array.
 *
 * Replaces bitvector.js — exposes BitVector constructor to window so that
 * legacy JS (webclient.min.js, packhandlers, etc.) can call `new BitVector(raw)`.
 *
 * Compatibility note: Legacy code passes a plain number[] as `raw`.
 * The TS constructor accepts both number[] and Uint8Array.
 */

import { exposeToLegacy } from '../bridge/legacy';

export class BitVector {
  private readonly data: Uint8Array;

  constructor(raw: number[] | Uint8Array) {
    this.data = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  }

  isSet(bit: number): boolean {
    return (this.data[bit >>> 3]! & (1 << (bit & 7))) !== 0;
  }

  set(bit: number): void {
    this.data[bit >>> 3]! |= 1 << (bit & 7);
  }

  unset(bit: number): void {
    this.data[bit >>> 3]! &= ~(1 << (bit & 7));
  }

  toBitSet(): number[] {
    const out: number[] = [];
    const len = this.data.length << 3;
    for (let i = 0; i < len; i++) {
      if (this.isSet(i)) out.push(i);
    }
    return out;
  }

  toString(): string {
    let out = '';
    const len = this.data.length << 3;
    for (let i = 0; i < len; i++) {
      out += this.isSet(i) ? '1' : '0';
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

// Expose the BitVector constructor so legacy JS can call `new BitVector(raw)`.
// This replaces bitvector.js which defined it as a plain constructor function.
exposeToLegacy('BitVector', BitVector);
