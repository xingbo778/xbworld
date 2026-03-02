/**
 * Logging system with severity levels.
 */

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
