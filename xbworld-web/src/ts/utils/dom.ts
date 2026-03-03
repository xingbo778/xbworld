/**
 * Lightweight DOM helpers replacing jQuery.
 * Every function operates on native DOM elements.
 */

export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function $$(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector));
}

export function $id(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function show(el: HTMLElement | null): void {
  if (el) el.style.display = '';
}

export function hide(el: HTMLElement | null): void {
  if (el) el.style.display = 'none';
}

export function setHtml(el: HTMLElement | null, html: string): void {
  if (el) el.innerHTML = html;
}

export function setText(el: HTMLElement | null, text: string): void {
  if (el) el.textContent = text;
}

export function addClass(el: HTMLElement | null, ...classes: string[]): void {
  if (el) el.classList.add(...classes);
}

export function removeClass(el: HTMLElement | null, ...classes: string[]): void {
  if (el) el.classList.remove(...classes);
}

export function toggleClass(el: HTMLElement | null, cls: string, force?: boolean): void {
  if (el) el.classList.toggle(cls, force);
}

export function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Document | Window | null,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void {
  el?.addEventListener(event, handler as EventListener, options);
}

export function off<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Document | Window | null,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
): void {
  el?.removeEventListener(event, handler as EventListener);
}

export function delegate(
  parent: HTMLElement | Document,
  selector: string,
  event: string,
  handler: (ev: Event, target: HTMLElement) => void,
): void {
  parent.addEventListener(event, (ev) => {
    const target = (ev.target as HTMLElement).closest(selector) as HTMLElement | null;
    if (target && parent.contains(target)) {
      handler(ev, target);
    }
  });
}

export function create(
  tag: string,
  attrs?: Record<string, string>,
  parent?: HTMLElement,
): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  if (parent) parent.appendChild(el);
  return el;
}

export function remove(el: HTMLElement | null): void {
  el?.remove();
}

export function setCSS(el: HTMLElement | null, styles: Partial<CSSStyleDeclaration>): void {
  if (!el) return;
  for (const [k, v] of Object.entries(styles)) {
    (el.style as unknown as Record<string, unknown>)[k] = v;
  }
}

export function ready(fn: () => void): void {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/** Blocking UI overlay (replaces $.blockUI). */
let blockOverlay: HTMLElement | null = null;

export function blockUI(message: string): void {
  unblockUI();
  blockOverlay = create('div');
  blockOverlay.className = 'xb-block-overlay';
  blockOverlay.innerHTML = `<div class="xb-block-message">${message}</div>`;
  document.body.appendChild(blockOverlay);
}

export function unblockUI(): void {
  if (blockOverlay) {
    blockOverlay.remove();
    blockOverlay = null;
  }
}
