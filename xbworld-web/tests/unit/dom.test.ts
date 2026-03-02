import { describe, it, expect, beforeEach } from 'vitest';
import { $, $$, $id, show, hide, setHtml, setText, addClass, removeClass, on, off, create, remove, delegate } from '@/utils/dom';

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
    const handler = () => { clicked = true; };
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
});
