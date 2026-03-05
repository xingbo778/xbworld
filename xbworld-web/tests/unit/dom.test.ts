import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  $,
  $$,
  $id,
  show,
  hide,
  setHtml,
  setText,
  addClass,
  removeClass,
  toggleClass,
  setCSS,
  on,
  off,
  create,
  remove,
  delegate,
  ready,
  blockUI,
  unblockUI,
} from '@/utils/dom';

describe('DOM utilities', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-container">
        <div id="child1" class="item">Hello</div>
        <div id="child2" class="item hidden">World</div>
        <button id="btn">Click</button>
      </div>
    `;
  });

  it('$ should select single element', () => {
    expect($('#child1')?.textContent).toBe('Hello');
    expect($('#nonexistent')).toBeNull();
  });

  it('$$ should select multiple elements', () => {
    expect($$('.item')).toHaveLength(2);
  });

  it('$id should find by id', () => {
    expect($id('child1')?.textContent).toBe('Hello');
  });

  it('show/hide should toggle display', () => {
    const el = $id('child1')!;
    hide(el);
    expect(el.style.display).toBe('none');
    show(el);
    expect(el.style.display).toBe('');
  });

  it('setHtml should set innerHTML', () => {
    const el = $id('child1')!;
    setHtml(el, '<b>New</b>');
    expect(el.innerHTML).toBe('<b>New</b>');
  });

  it('setText should set textContent', () => {
    const el = $id('child1')!;
    setText(el, 'Updated');
    expect(el.textContent).toBe('Updated');
  });

  it('addClass/removeClass should modify classes', () => {
    const el = $id('child1')!;
    addClass(el, 'active', 'highlight');
    expect(el.classList.contains('active')).toBe(true);
    expect(el.classList.contains('highlight')).toBe(true);
    removeClass(el, 'active');
    expect(el.classList.contains('active')).toBe(false);
  });

  it('on/off should add/remove event listeners', () => {
    const btn = $id('btn')!;
    let clicked = false;
    const handler = () => {
      clicked = true;
    };
    on(btn, 'click', handler);
    btn.click();
    expect(clicked).toBe(true);
    clicked = false;
    off(btn, 'click', handler);
    btn.click();
    expect(clicked).toBe(false);
  });

  it('create should create element with attributes', () => {
    const container = $id('test-container')!;
    const el = create('span', { class: 'new-span', 'data-value': '42' }, container);
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('new-span');
    expect(el.getAttribute('data-value')).toBe('42');
    expect(container.contains(el)).toBe(true);
  });

  it('remove should remove element', () => {
    const el = $id('child1')!;
    remove(el);
    expect($id('child1')).toBeNull();
  });

  it('delegate should handle delegated events', () => {
    const container = $id('test-container')!;
    let clickedId = '';
    delegate(container, '.item', 'click', (_ev, target) => {
      clickedId = target.id;
    });
    $id('child1')!.click();
    expect(clickedId).toBe('child1');
  });

  // -------------------------------------------------------------------------
  // toggleClass
  // -------------------------------------------------------------------------

  it('toggleClass should toggle a class on an element', () => {
    const el = $id('child1')!;
    expect(el.classList.contains('active')).toBe(false);
    toggleClass(el, 'active');
    expect(el.classList.contains('active')).toBe(true);
    toggleClass(el, 'active');
    expect(el.classList.contains('active')).toBe(false);
  });

  it('toggleClass should accept force parameter', () => {
    const el = $id('child1')!;
    toggleClass(el, 'active', true);
    expect(el.classList.contains('active')).toBe(true);
    toggleClass(el, 'active', true);
    expect(el.classList.contains('active')).toBe(true);
    toggleClass(el, 'active', false);
    expect(el.classList.contains('active')).toBe(false);
  });

  it('toggleClass should handle null element', () => {
    expect(() => toggleClass(null, 'active')).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // setCSS
  // -------------------------------------------------------------------------

  it('setCSS should set multiple CSS properties', () => {
    const el = $id('child1')!;
    setCSS(el, { color: 'red', fontSize: '20px' });
    expect(el.style.color).toBe('red');
    expect(el.style.fontSize).toBe('20px');
  });

  it('setCSS should handle null element', () => {
    expect(() => setCSS(null, { color: 'red' })).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // blockUI / unblockUI
  // -------------------------------------------------------------------------

  it('blockUI should create overlay with message', () => {
    blockUI('Loading...');
    const overlay = document.querySelector('.xb-block-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.querySelector('.xb-block-message')!.textContent).toBe('Loading...');
    unblockUI(); // cleanup
  });

  it('unblockUI should remove overlay', () => {
    blockUI('Loading...');
    expect(document.querySelector('.xb-block-overlay')).not.toBeNull();
    unblockUI();
    expect(document.querySelector('.xb-block-overlay')).toBeNull();
  });

  it('unblockUI should be safe to call when no overlay exists', () => {
    expect(() => unblockUI()).not.toThrow();
  });

  it('blockUI called twice should only show one overlay', () => {
    blockUI('First');
    blockUI('Second');
    const overlays = document.querySelectorAll('.xb-block-overlay');
    expect(overlays.length).toBe(1);
    expect(overlays[0].querySelector('.xb-block-message')!.textContent).toBe('Second');
    unblockUI();
  });

  // -------------------------------------------------------------------------
  // Null-safety for show/hide/setHtml/setText/addClass/removeClass
  // -------------------------------------------------------------------------

  it('show/hide should handle null element', () => {
    expect(() => show(null)).not.toThrow();
    expect(() => hide(null)).not.toThrow();
  });

  it('setHtml/setText should handle null element', () => {
    expect(() => setHtml(null, 'test')).not.toThrow();
    expect(() => setText(null, 'test')).not.toThrow();
  });

  it('addClass/removeClass should handle null element', () => {
    expect(() => addClass(null, 'test')).not.toThrow();
    expect(() => removeClass(null, 'test')).not.toThrow();
  });

  it('remove should handle null element', () => {
    expect(() => remove(null)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // create without parent
  // -------------------------------------------------------------------------

  it('create without parent should not append to DOM', () => {
    const el = create('div', { id: 'orphan' });
    expect(el.tagName).toBe('DIV');
    expect(document.getElementById('orphan')).toBeNull();
  });

  it('create without attrs should create plain element', () => {
    const el = create('p');
    expect(el.tagName).toBe('P');
    expect(el.attributes.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // ready
  // -------------------------------------------------------------------------

  it('ready should call fn immediately when document is already loaded', () => {
    let called = false;
    ready(() => { called = true; });
    expect(called).toBe(true);
  });
});
