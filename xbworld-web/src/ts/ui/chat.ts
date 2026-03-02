/**
 * Chat/message system.
 * Migrated from messages.js.
 */

import { $id, on, create, setHtml } from '../utils/dom';
import { globalEvents, ThrottledEmitter } from '../core/events';
import { sendMessage } from '../net/connection';

interface ChatMessage {
  event?: number;
  message: string;
  timestamp?: number;
}

const messageHistory: ChatMessage[] = [];
const MAX_MESSAGES = 500;

const chatUpdater = new ThrottledEmitter(() => renderMessages(), 200);

export function initChat(): void {
  const pregameInput = $id('pregame_text_input') as HTMLInputElement | null;
  const gameInput = $id('game_text_input') as HTMLInputElement | null;

  if (pregameInput) {
    on(pregameInput, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const msg = pregameInput.value.trim();
        if (msg && msg !== '>') {
          sendMessage(msg.startsWith('>') ? msg.slice(1).trim() : msg);
        }
        pregameInput.value = '>';
      }
    });
  }

  if (gameInput) {
    on(gameInput, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const msg = gameInput.value.trim();
        if (msg) {
          sendMessage(msg);
        }
        gameInput.value = '';
      }
    });
  }

  globalEvents.on<Record<string, unknown>>('chat:message', (packet) => {
    addMessage({
      event: packet?.['event'] as number,
      message: packet?.['message'] as string ?? '',
      timestamp: Date.now(),
    });
  });
}

export function addMessage(msg: ChatMessage): void {
  messageHistory.push(msg);
  if (messageHistory.length > MAX_MESSAGES) {
    messageHistory.shift();
  }
  chatUpdater.update();
}

function renderMessages(): void {
  const pregameArea = $id('pregame_message_area');
  const gameArea = $id('game_message_area');

  const target = gameArea ?? pregameArea;
  if (!target) return;

  const last20 = messageHistory.slice(-20);
  const html = last20
    .map((m) => `<li>${escapeHtml(m.message)}</li>`)
    .join('');
  target.innerHTML = html;
  target.scrollTop = target.scrollHeight;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getMessageHistory(): readonly ChatMessage[] {
  return messageHistory;
}
