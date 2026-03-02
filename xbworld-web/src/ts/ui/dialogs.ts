/**
 * Dialog system replacing jQuery UI dialogs.
 * Uses native HTML dialog element with custom styling.
 */

import { $id, create, remove, on, setHtml } from '../utils/dom';

interface DialogOptions {
  title: string;
  content: string;
  modal?: boolean;
  width?: string;
  buttons?: Record<string, () => void>;
  onClose?: () => void;
  autoClose?: number;
  minimizable?: boolean;
}

const activeDialogs = new Map<string, HTMLDialogElement>();

export function showDialog(id: string, options: DialogOptions): HTMLDialogElement {
  closeDialog(id);

  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'xb-dialog';
  if (options.width) dialog.style.width = options.width;

  const header = create('div', { class: 'xb-dialog-header' });
  const title = create('span', { class: 'xb-dialog-title' });
  title.textContent = options.title;
  header.appendChild(title);

  const controls = create('div', { class: 'xb-dialog-controls' });

  if (options.minimizable) {
    const minBtn = create('button', { class: 'xb-dialog-btn', title: 'Minimize' });
    minBtn.textContent = '−';
    on(minBtn, 'click', () => {
      const body = dialog.querySelector('.xb-dialog-body') as HTMLElement;
      const footer = dialog.querySelector('.xb-dialog-footer') as HTMLElement;
      if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
      if (footer) footer.style.display = footer.style.display === 'none' ? '' : 'none';
    });
    controls.appendChild(minBtn);
  }

  const closeBtn = create('button', { class: 'xb-dialog-btn xb-dialog-close', title: 'Close' });
  closeBtn.textContent = '×';
  on(closeBtn, 'click', () => closeDialog(id));
  controls.appendChild(closeBtn);
  header.appendChild(controls);

  const body = create('div', { class: 'xb-dialog-body' });
  body.innerHTML = options.content;

  dialog.appendChild(header);
  dialog.appendChild(body);

  if (options.buttons) {
    const footer = create('div', { class: 'xb-dialog-footer' });
    for (const [label, handler] of Object.entries(options.buttons)) {
      const btn = create('button', { class: 'xb-btn' });
      btn.textContent = label;
      on(btn, 'click', handler);
      footer.appendChild(btn);
    }
    dialog.appendChild(footer);
  }

  on(dialog, 'close' as keyof HTMLElementEventMap, () => {
    options.onClose?.();
    activeDialogs.delete(id);
    dialog.remove();
  });

  // Draggable header
  let dragX = 0, dragY = 0;
  on(header, 'pointerdown', (e: PointerEvent) => {
    dragX = e.clientX - dialog.offsetLeft;
    dragY = e.clientY - dialog.offsetTop;
    const onMove = (ev: PointerEvent) => {
      dialog.style.left = `${ev.clientX - dragX}px`;
      dialog.style.top = `${ev.clientY - dragY}px`;
      dialog.style.margin = '0';
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  document.body.appendChild(dialog);
  activeDialogs.set(id, dialog);

  if (options.modal) {
    dialog.showModal();
  } else {
    dialog.show();
  }

  if (options.autoClose && options.autoClose > 0) {
    setTimeout(() => closeDialog(id), options.autoClose);
  }

  return dialog;
}

export function closeDialog(id: string): void {
  const dialog = activeDialogs.get(id);
  if (dialog) {
    dialog.close();
    dialog.remove();
    activeDialogs.delete(id);
  }
}

export function showAlert(title: string, text: string, type: 'info' | 'error' | 'warning' = 'info'): void {
  showDialog('xb-alert', {
    title,
    content: `<p class="xb-alert-${type}">${text}</p>`,
    modal: true,
    width: '400px',
    buttons: { Ok: () => closeDialog('xb-alert') },
  });
}

export function showMessage(title: string, message: string): void {
  showDialog('generic_dialog', {
    title,
    content: message,
    width: window.innerWidth <= 600 ? '90%' : '50%',
    minimizable: true,
    autoClose: 24000,
    buttons: { Ok: () => closeDialog('generic_dialog') },
  });
}
