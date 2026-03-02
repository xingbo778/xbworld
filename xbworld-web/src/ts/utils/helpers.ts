/**
 * General-purpose utility functions.
 */

/** Deep clone a plain object (no circular refs). */
export function clone<T>(obj: T): T {
  if (obj == null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

/** Integer division that rounds toward negative infinity. */
export function DIVIDE(n: number, d: number): number {
  return Math.floor(n / d);
}

/** Wrap `value` into [0, range). */
export function FC_WRAP(value: number, range: number): number {
  if (value < 0) {
    const mod = value % range;
    return mod !== 0 ? mod + range : 0;
  }
  return value >= range ? value % range : value;
}

export function XOR(a: unknown, b: unknown): boolean {
  return (!!a || !!b) && !(!!a && !!b);
}

export function numberWithCommas(x: number | string): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

/** Remove Freeciv translation qualifier prefix like "?qualifier:text". */
export function stringUnqualify(str: string): string {
  if (str.charAt(0) === '?' && str.includes(':')) {
    return str.slice(str.indexOf(':') + 1);
  }
  return str;
}

export function secondsToHumanTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds - h * 3600) / 60);
  const s = seconds - h * 3600 - m * 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Parse URL query parameters. */
export function getUrlVar(name: string): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? undefined;
}

export function isSmallScreen(): boolean {
  return window.innerWidth <= 600 || window.innerHeight <= 600;
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function supportsMp3(): boolean {
  const a = document.createElement('audio');
  return !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
}

export function getTilesetFileExtension(): string {
  return '.png';
}
