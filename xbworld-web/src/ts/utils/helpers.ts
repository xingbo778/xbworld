/**
 * XBWorld — General-purpose utility functions (migrated from utility.js)
 *
 * All functions here are pure (no side effects, no module-local state),
 * safe to exposeToLegacy.
 *
 * NOTE: get_random_int depends on window.fc_seedrandom (set by civclient.js).
 * NOTE: is_right_mouse_selection_supported depends on window.platform (external lib).
 * NOTE: is_touch_device is defined in control.js, not utility.js.
 */

import { exposeToLegacy } from '../bridge/legacy';

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
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
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

/**
 * Get a random integer in [min, max) using the seeded RNG.
 * Falls back to Math.random if fc_seedrandom is not available.
 */
export function getRandomInt(min: number, max: number): number {
  const rng = (window as any).fc_seedrandom;
  const rand = typeof rng === 'function' ? rng() : Math.random();
  return Math.floor(rand * (max - min)) + min;
}

/**
 * Check if right-click-and-drag selection is supported.
 * Mac OS X and Chrome OS do not support it.
 */
export function isRightMouseSelectionSupported(): boolean {
  if (isTouchDevice()) return false;
  const platform = (window as any).platform;
  if (platform && platform.description) {
    const desc = platform.description as string;
    if (desc.indexOf('Mac OS X') > 0 || desc.indexOf('Chrome OS') > 0 || desc.indexOf('CrOS') > 0) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Expose to legacy — function names must match Legacy snake_case names
// ---------------------------------------------------------------------------

exposeToLegacy('clone', clone);
exposeToLegacy('DIVIDE', DIVIDE);
exposeToLegacy('FC_WRAP', FC_WRAP);
exposeToLegacy('XOR', XOR);
exposeToLegacy('numberWithCommas', numberWithCommas);
exposeToLegacy('to_title_case', toTitleCase);
exposeToLegacy('string_unqualify', stringUnqualify);
exposeToLegacy('seconds_to_human_time', secondsToHumanTime);
exposeToLegacy('get_random_int', getRandomInt);
exposeToLegacy('supports_mp3', supportsMp3);
exposeToLegacy('is_right_mouse_selection_supported', isRightMouseSelectionSupported);
exposeToLegacy('get_tileset_file_extention', getTilesetFileExtension);
// NOTE: $.getUrlVar is a jQuery plugin, not a standalone function — not migrated
// NOTE: civclient_benchmark uses setTimeout with string eval — not migrated
