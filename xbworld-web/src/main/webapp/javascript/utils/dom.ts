/**
 * Native DOM utilities — drop-in replacements for common jQuery patterns.
 *
 * Usage in new TypeScript files:
 *   import { $, getUrlParam, fetchJSON } from './utils/dom';
 *
 * These work alongside jQuery — no need to remove jQuery all at once.
 */

/** querySelector shorthand */
export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

/** querySelectorAll shorthand */
export function $$(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector));
}

/** Get URL search parameter */
export function getUrlParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

/** Typed fetch wrapper */
export async function fetchJSON<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

/** Show/hide element */
export function show(el: HTMLElement | null): void {
  if (el) el.style.display = "";
}

export function hide(el: HTMLElement | null): void {
  if (el) el.style.display = "none";
}

/** Add event listener with auto-cleanup */
export function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | null,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
): () => void {
  if (!el) return () => {};
  el.addEventListener(event, handler);
  return () => el.removeEventListener(event, handler);
}
