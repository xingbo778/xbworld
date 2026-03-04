/**
 * XBWorld — Logging system with severity levels (migrated from log.js).
 *
 * Exposes `freelog` and `LOG_*` constants to `window` for legacy JS compat.
 */

import { exposeToLegacy } from '../bridge/legacy';

export const enum LogLevel {
  FATAL = 0,
  ERROR = 1,
  NORMAL = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

let currentLevel = LogLevel.NORMAL;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level > currentLevel) return;

  if (level <= LogLevel.ERROR) {
    console.error(message, ...args);
  } else if (level === LogLevel.NORMAL) {
    console.log(message, ...args);
  } else {
    console.debug(message, ...args);
  }
}

export function logError(message: string, ...args: unknown[]): void {
  log(LogLevel.ERROR, message, ...args);
}

export function logNormal(message: string, ...args: unknown[]): void {
  log(LogLevel.NORMAL, message, ...args);
}

// ---------------------------------------------------------------------------
// Legacy compat — expose freelog() and LOG_* constants to window
// ---------------------------------------------------------------------------

/** Legacy freelog(level, message) — just logs to console. */
function freelog(_level: number, message: string): void {
  console.log(message);
}

exposeToLegacy('freelog', freelog);
exposeToLegacy('LOG_FATAL', 0 as const);
exposeToLegacy('LOG_ERROR', 1 as const);
exposeToLegacy('LOG_NORMAL', 2 as const);
exposeToLegacy('LOG_VERBOSE', 3 as const);
exposeToLegacy('LOG_DEBUG', 4 as const);
