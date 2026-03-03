/**
 * GameDialog — A modern replacement for jQuery UI Dialog + dialogExtend.
 *
 * Provides draggable, resizable, minimizable/maximizable dialogs using
 * native HTML <dialog> element and vanilla TypeScript. Designed as a
 * drop-in replacement for the jQuery UI dialog API used throughout the
 * legacy codebase.
 *
 * Usage (new API):
 *   const dlg = new GameDialog('#city_dialog', {
 *     title: 'City',
 *     width: 600,
 *     modal: true,
 *     closable: true,
 *     minimizable: true,
 *     maximizable: true,
 *     position: { my: 'center', at: 'center' },
 *     buttons: { 'Close': () => dlg.close() },
 *     onClose: () => { ... },
 *     onMinimize: () => { ... },
 *     onRestore: () => { ... },
 *   });
 *   dlg.open();
 *   dlg.close();
 *   dlg.minimize();
 *   dlg.restore();
 *   dlg.state; // 'normal' | 'minimized' | 'maximized'
 */

export interface DialogButton {
  text: string;
  click: () => void;
}

export interface DialogPosition {
  my?: string;  // e.g. 'center', 'left top', 'right bottom'
  at?: string;  // e.g. 'center', 'left top', 'right bottom'
  of?: HTMLElement | Window;
  within?: HTMLElement;
}

export interface GameDialogOptions {
  title?: string;
  width?: number | string;
  height?: number | string;
  modal?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  closable?: boolean;
  closeOnEscape?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  position?: DialogPosition;
  dialogClass?: string;
  buttons?: Record<string, () => void> | DialogButton[];
  onOpen?: () => void;
  onClose?: (event?: Event) => void;
  onMinimize?: (event?: Event) => void;
  onRestore?: (event?: Event) => void;
  onMaximize?: (event?: Event) => void;
  onBeforeClose?: () => boolean;  // return false to prevent close
}

export type DialogState = 'normal' | 'minimized' | 'maximized';

const DEFAULT_OPTIONS: GameDialogOptions = {
  title: '',
  width: 300,
  height: 'auto',
  modal: true,
  draggable: true,
  resizable: true,
  closable: true,
  closeOnEscape: true,
  minimizable: false,
  maximizable: false,
};

/** Registry of all active dialogs for z-index management */
const activeDialogs: Set<GameDialog> = new Set();
let topZIndex = 1000;

export class GameDialog {
  private el: HTMLElement;
  private wrapper: HTMLDialogElement;
  private titleBar: HTMLElement;
  private titleText: HTMLElement;
  private buttonBar: HTMLElement | null = null;
  private contentEl: HTMLElement;
  private options: GameDialogOptions;
  private _state: DialogState = 'normal';
  private savedRect: { width: string; height: string; top: string; left: string } | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(selector: string | HTMLElement, options: GameDialogOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Resolve the content element
    if (typeof selector === 'string') {
      const found = document.querySelector(selector);
      if (!found) throw new Error(`GameDialog: element not found: ${selector}`);
      this.el = found as HTMLElement;
    } else {
      this.el = selector;
    }

    // Build the dialog DOM structure
    this.wrapper = document.createElement('dialog');
    this.wrapper.className = 'game-dialog' + (this.options.dialogClass ? ' ' + this.options.dialogClass : '');
    this.wrapper.setAttribute('role', 'dialog');

    // Title bar
    this.titleBar = document.createElement('div');
    this.titleBar.className = 'game-dialog-titlebar';

    this.titleText = document.createElement('span');
    this.titleText.className = 'game-dialog-title';
    this.titleText.textContent = this.options.title || '';
    this.titleBar.appendChild(this.titleText);

    // Title bar buttons container
    const titleButtons = document.createElement('div');
    titleButtons.className = 'game-dialog-titlebar-buttons';

    if (this.options.minimizable) {
      const minBtn = this._createTitleButton('_', 'game-dialog-btn-minimize', () => this.minimize());
      titleButtons.appendChild(minBtn);
    }

    if (this.options.maximizable) {
      const maxBtn = this._createTitleButton('□', 'game-dialog-btn-maximize', () => this.toggleMaximize());
      titleButtons.appendChild(maxBtn);
    }

    if (this.options.closable !== false) {
      const closeBtn = this._createTitleButton('×', 'game-dialog-btn-close', () => this.close());
      titleButtons.appendChild(closeBtn);
    }

    this.titleBar.appendChild(titleButtons);
    this.wrapper.appendChild(this.titleBar);

    // Content area
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'game-dialog-content';
    // Move the original element's content into the dialog
    this.contentEl.appendChild(this.el);
    this.el.style.display = '';
    this.wrapper.appendChild(this.contentEl);

    // Button bar
    if (this.options.buttons) {
      this.buttonBar = document.createElement('div');
      this.buttonBar.className = 'game-dialog-buttonpane';
      this._renderButtons();
      this.wrapper.appendChild(this.buttonBar);
    }

    // Apply dimensions
    if (this.options.width) {
      this.wrapper.style.width = typeof this.options.width === 'number'
        ? `${this.options.width}px` : this.options.width;
    }
    if (this.options.height && this.options.height !== 'auto') {
      this.wrapper.style.height = typeof this.options.height === 'number'
        ? `${this.options.height}px` : String(this.options.height);
    }

    // Resizable
    if (this.options.resizable) {
      this.wrapper.style.resize = 'both';
      this.wrapper.style.overflow = 'auto';
    }

    // Draggable
    if (this.options.draggable) {
      this._setupDrag();
    }

    // Close on Escape
    if (this.options.closeOnEscape) {
      this.wrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
      // Prevent default dialog close on Escape (we handle it ourselves)
      this.wrapper.addEventListener('cancel', (e) => {
        e.preventDefault();
        this.close();
      });
    }

    // Click to bring to front
    this.wrapper.addEventListener('mousedown', () => this._bringToFront());

    // Append to body
    document.body.appendChild(this.wrapper);
  }

  /** Current dialog state */
  get state(): DialogState {
    return this._state;
  }

  /** The underlying <dialog> element */
  get widget(): HTMLDialogElement {
    return this.wrapper;
  }

  /** Open the dialog */
  open(): void {
    if (this.options.modal) {
      this.wrapper.showModal();
    } else {
      this.wrapper.show();
    }
    this._bringToFront();
    this._applyPosition();
    activeDialogs.add(this);
    this.options.onOpen?.();
  }

  /** Close the dialog */
  close(): void {
    if (this.options.onBeforeClose && this.options.onBeforeClose() === false) {
      return;
    }
    this.wrapper.close();
    activeDialogs.delete(this);
    this.options.onClose?.();
  }

  /** Minimize to title bar only */
  minimize(): void {
    if (this._state === 'minimized') return;
    this.savedRect = {
      width: this.wrapper.style.width,
      height: this.wrapper.style.height,
      top: this.wrapper.style.top,
      left: this.wrapper.style.left,
    };
    this.contentEl.style.display = 'none';
    if (this.buttonBar) this.buttonBar.style.display = 'none';
    this.wrapper.style.height = 'auto';
    this.wrapper.style.resize = 'none';
    this._state = 'minimized';
    this.wrapper.classList.add('game-dialog-minimized');
    this.wrapper.classList.remove('game-dialog-maximized');
    this.options.onMinimize?.();
  }

  /** Restore from minimized or maximized state */
  restore(): void {
    if (this._state === 'normal') return;
    this.contentEl.style.display = '';
    if (this.buttonBar) this.buttonBar.style.display = '';
    if (this.savedRect) {
      this.wrapper.style.width = this.savedRect.width;
      this.wrapper.style.height = this.savedRect.height;
      this.wrapper.style.top = this.savedRect.top;
      this.wrapper.style.left = this.savedRect.left;
    }
    if (this.options.resizable) {
      this.wrapper.style.resize = 'both';
    }
    this._state = 'normal';
    this.wrapper.classList.remove('game-dialog-minimized', 'game-dialog-maximized');
    this.options.onRestore?.();
  }

  /** Maximize to fill the viewport */
  maximize(): void {
    if (this._state === 'maximized') return;
    if (this._state !== 'minimized') {
      this.savedRect = {
        width: this.wrapper.style.width,
        height: this.wrapper.style.height,
        top: this.wrapper.style.top,
        left: this.wrapper.style.left,
      };
    }
    this.contentEl.style.display = '';
    if (this.buttonBar) this.buttonBar.style.display = '';
    this.wrapper.style.width = '100vw';
    this.wrapper.style.height = '100vh';
    this.wrapper.style.top = '0';
    this.wrapper.style.left = '0';
    this.wrapper.style.resize = 'none';
    this._state = 'maximized';
    this.wrapper.classList.add('game-dialog-maximized');
    this.wrapper.classList.remove('game-dialog-minimized');
    this.options.onMaximize?.();
  }

  /** Toggle between maximized and normal */
  toggleMaximize(): void {
    if (this._state === 'maximized') {
      this.restore();
    } else {
      this.maximize();
    }
  }

  /** Update the title text */
  setTitle(title: string): void {
    this.titleText.textContent = title;
  }

  /** Set a dialog option dynamically */
  setOption(key: string, value: unknown): void {
    (this.options as Record<string, unknown>)[key] = value;
    if (key === 'title') this.setTitle(value as string);
    if (key === 'draggable') {
      if (value) this._setupDrag();
    }
    if (key === 'width') {
      this.wrapper.style.width = typeof value === 'number' ? `${value}px` : String(value);
    }
    if (key === 'height') {
      this.wrapper.style.height = typeof value === 'number' ? `${value}px` : String(value);
    }
  }

  /** Destroy the dialog and restore the original element */
  destroy(): void {
    activeDialogs.delete(this);
    if (this.wrapper.open) this.wrapper.close();
    // Move content back
    this.wrapper.parentNode?.insertBefore(this.el, this.wrapper);
    this.wrapper.remove();
  }

  /** Check if dialog is open */
  isOpen(): boolean {
    return this.wrapper.open;
  }

  // --- Private helpers ---

  private _createTitleButton(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `game-dialog-titlebar-btn ${className}`;
    btn.textContent = text;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private _renderButtons(): void {
    if (!this.buttonBar || !this.options.buttons) return;
    this.buttonBar.innerHTML = '';

    if (Array.isArray(this.options.buttons)) {
      for (const btn of this.options.buttons) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'game-dialog-btn';
        el.textContent = btn.text;
        el.addEventListener('click', btn.click);
        this.buttonBar.appendChild(el);
      }
    } else {
      for (const [text, click] of Object.entries(this.options.buttons)) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'game-dialog-btn';
        el.textContent = text;
        el.addEventListener('click', click);
        this.buttonBar.appendChild(el);
      }
    }
  }

  private _setupDrag(): void {
    this.titleBar.style.cursor = 'move';
    this.titleBar.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      this.isDragging = true;
      const rect = this.wrapper.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.wrapper.style.left = `${x}px`;
      this.wrapper.style.top = `${y}px`;
      this.wrapper.style.margin = '0'; // Override dialog centering
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  private _bringToFront(): void {
    topZIndex++;
    this.wrapper.style.zIndex = String(topZIndex);
  }

  private _applyPosition(): void {
    const pos = this.options.position;
    if (!pos) return;

    const target = (pos.of || window) as Window | HTMLElement;
    const within = pos.within || document.documentElement;

    let targetRect: DOMRect;
    if (target === window) {
      targetRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    } else {
      targetRect = (target as HTMLElement).getBoundingClientRect();
    }

    const dialogRect = this.wrapper.getBoundingClientRect();
    const myParts = (pos.my || 'center').split(' ');
    const atParts = (pos.at || 'center').split(' ');

    // Calculate "at" point on the target
    let atX = targetRect.left + targetRect.width / 2;
    let atY = targetRect.top + targetRect.height / 2;

    if (atParts[0] === 'left') atX = targetRect.left;
    else if (atParts[0] === 'right') atX = targetRect.right;

    if (atParts.length > 1) {
      if (atParts[1] === 'top') atY = targetRect.top;
      else if (atParts[1] === 'bottom') atY = targetRect.bottom;
    }

    // Calculate offset based on "my" anchor
    let offsetX = -dialogRect.width / 2;
    let offsetY = -dialogRect.height / 2;

    if (myParts[0] === 'left') offsetX = 0;
    else if (myParts[0] === 'right') offsetX = -dialogRect.width;

    if (myParts.length > 1) {
      if (myParts[1] === 'top') offsetY = 0;
      else if (myParts[1] === 'bottom') offsetY = -dialogRect.height;
    }

    this.wrapper.style.left = `${atX + offsetX}px`;
    this.wrapper.style.top = `${atY + offsetY}px`;
    this.wrapper.style.margin = '0';
  }
}

/**
 * Expose GameDialog to the global scope for use by legacy JS code.
 * Legacy code can use: new GameDialog('#selector', options)
 */
export function exposeGameDialog(): void {
  (window as any).GameDialog = GameDialog;
}
