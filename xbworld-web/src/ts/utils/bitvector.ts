/**
 * Efficient bit vector backed by a Uint8Array.
 */
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
