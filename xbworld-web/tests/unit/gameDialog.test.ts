import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameDialog, exposeGameDialog } from '@/ui/GameDialog';
import type { GameDialogOptions } from '@/ui/GameDialog';

describe('GameDialog', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-dialog';
    container.innerHTML = '<p>Test content</p>';
    document.body.appendChild(container);

    // jsdom doesn't implement HTMLDialogElement.showModal/show/close natively.
    // Polyfill them for testing.
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
        (this as any).open = true;
      };
    }
    if (!HTMLDialogElement.prototype.show) {
      HTMLDialogElement.prototype.show = function () {
        this.setAttribute('open', '');
        (this as any).open = true;
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        (this as any).open = false;
      };
    }
  });

  afterEach(() => {
    // Clean up all dialogs
    document.querySelectorAll('dialog.game-dialog').forEach((el) => el.remove());
    container.remove();
  });

  it('should create a dialog from a selector', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Test' });
    expect(dlg).toBeDefined();
    expect(dlg.widget).toBeInstanceOf(HTMLDialogElement);
    expect(dlg.widget.querySelector('.game-dialog-title')?.textContent).toBe('Test');
  });

  it('should create a dialog from an element', () => {
    const el = document.createElement('div');
    el.textContent = 'Direct element';
    document.body.appendChild(el);
    const dlg = new GameDialog(el, { title: 'Direct' });
    expect(dlg.widget.querySelector('.game-dialog-title')?.textContent).toBe('Direct');
    el.remove();
  });

  it('should throw for non-existent selector', () => {
    expect(() => new GameDialog('#nonexistent')).toThrow('element not found');
  });

  it('should open and close', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Open/Close' });
    expect(dlg.isOpen()).toBe(false);
    dlg.open();
    expect(dlg.isOpen()).toBe(true);
    dlg.close();
    expect(dlg.isOpen()).toBe(false);
  });

  it('should call onOpen and onClose callbacks', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const dlg = new GameDialog('#test-dialog', { title: 'Callbacks', onOpen, onClose });
    dlg.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    dlg.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when onBeforeClose returns false', () => {
    const onBeforeClose = vi.fn().mockReturnValue(false);
    const onClose = vi.fn();
    const dlg = new GameDialog('#test-dialog', { title: 'Prevent', onBeforeClose, onClose });
    dlg.open();
    dlg.close();
    expect(onBeforeClose).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(dlg.isOpen()).toBe(true);
  });

  it('should minimize and restore', () => {
    const onMinimize = vi.fn();
    const onRestore = vi.fn();
    const dlg = new GameDialog('#test-dialog', {
      title: 'Min/Restore',
      minimizable: true,
      onMinimize,
      onRestore,
    });
    dlg.open();
    expect(dlg.state).toBe('normal');

    dlg.minimize();
    expect(dlg.state).toBe('minimized');
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(dlg.widget.classList.contains('game-dialog-minimized')).toBe(true);

    dlg.restore();
    expect(dlg.state).toBe('normal');
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(dlg.widget.classList.contains('game-dialog-minimized')).toBe(false);
  });

  it('should maximize and restore', () => {
    const onMaximize = vi.fn();
    const onRestore = vi.fn();
    const dlg = new GameDialog('#test-dialog', {
      title: 'Max/Restore',
      maximizable: true,
      onMaximize,
      onRestore,
    });
    dlg.open();

    dlg.maximize();
    expect(dlg.state).toBe('maximized');
    expect(onMaximize).toHaveBeenCalledTimes(1);
    expect(dlg.widget.classList.contains('game-dialog-maximized')).toBe(true);

    dlg.restore();
    expect(dlg.state).toBe('normal');
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('should toggle maximize', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Toggle', maximizable: true });
    dlg.open();

    dlg.toggleMaximize();
    expect(dlg.state).toBe('maximized');

    dlg.toggleMaximize();
    expect(dlg.state).toBe('normal');
  });

  it('should not minimize if already minimized', () => {
    const onMinimize = vi.fn();
    const dlg = new GameDialog('#test-dialog', { title: 'NoDouble', minimizable: true, onMinimize });
    dlg.open();
    dlg.minimize();
    dlg.minimize(); // second call should be no-op
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('should render buttons from object', () => {
    const clickFn = vi.fn();
    const dlg = new GameDialog('#test-dialog', {
      title: 'Buttons',
      buttons: { 'OK': clickFn, 'Cancel': vi.fn() },
    });
    const buttons = dlg.widget.querySelectorAll('.game-dialog-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('OK');
    expect(buttons[1].textContent).toBe('Cancel');
  });

  it('should render buttons from array', () => {
    const dlg = new GameDialog('#test-dialog', {
      title: 'ButtonArray',
      buttons: [
        { text: 'Save', click: vi.fn() },
        { text: 'Delete', click: vi.fn() },
      ],
    });
    const buttons = dlg.widget.querySelectorAll('.game-dialog-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Save');
    expect(buttons[1].textContent).toBe('Delete');
  });

  it('should set title dynamically', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Initial' });
    expect(dlg.widget.querySelector('.game-dialog-title')?.textContent).toBe('Initial');
    dlg.setTitle('Updated');
    expect(dlg.widget.querySelector('.game-dialog-title')?.textContent).toBe('Updated');
  });

  it('should set options dynamically', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Options', width: 300 });
    dlg.setOption('title', 'New Title');
    expect(dlg.widget.querySelector('.game-dialog-title')?.textContent).toBe('New Title');
    dlg.setOption('width', 500);
    expect(dlg.widget.style.width).toBe('500px');
  });

  it('should destroy and restore original element', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Destroy' });
    expect(document.querySelector('dialog.game-dialog')).not.toBeNull();
    dlg.destroy();
    expect(document.querySelector('dialog.game-dialog')).toBeNull();
    // Original element should be back in body
    expect(document.getElementById('test-dialog')).not.toBeNull();
  });

  it('should have close button by default', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Closable' });
    expect(dlg.widget.querySelector('.game-dialog-btn-close')).not.toBeNull();
  });

  it('should have minimize button when minimizable', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Min', minimizable: true });
    expect(dlg.widget.querySelector('.game-dialog-btn-minimize')).not.toBeNull();
  });

  it('should have maximize button when maximizable', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Max', maximizable: true });
    expect(dlg.widget.querySelector('.game-dialog-btn-maximize')).not.toBeNull();
  });

  it('should apply dialogClass', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Class', dialogClass: 'unit_dialog no-close' });
    expect(dlg.widget.classList.contains('unit_dialog')).toBe(true);
    expect(dlg.widget.classList.contains('no-close')).toBe(true);
  });

  it('should apply width and height', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'Size', width: 400, height: 300 });
    expect(dlg.widget.style.width).toBe('400px');
    expect(dlg.widget.style.height).toBe('300px');
  });

  it('should apply string width', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'StrSize', width: '50%' });
    expect(dlg.widget.style.width).toBe('50%');
  });

  it('should open as non-modal when modal is false', () => {
    const dlg = new GameDialog('#test-dialog', { title: 'NonModal', modal: false });
    dlg.open();
    expect(dlg.isOpen()).toBe(true);
  });
});

describe('exposeGameDialog', () => {
  it('should expose GameDialog to window', () => {
    exposeGameDialog();
    expect((window as any).GameDialog).toBe(GameDialog);
  });
});
