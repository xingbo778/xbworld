/**
 * WebSocket connection manager.
 * Replaces clinet.js with a clean, typed API.
 */

import { store } from '../data/store';
import { globalEvents } from '../core/events';
import { logError, logNormal } from '../core/log';
import { blockUI, unblockUI } from '../utils/dom';
import { getUrlVar } from '../utils/helpers';

const FREECIV_VERSION = '+Freeciv.Web.Devel-3.3';
const PING_CHECK_INTERVAL = 240_000;

let ws: WebSocket | null = null;
let civserverport: string | null = null;
let pingLast = Date.now();
let pingTimer: ReturnType<typeof setInterval> | null = null;
let clinetLastSend = 0;

export const debugClientSpeedList: number[] = [];

export function getWebSocket(): WebSocket | null {
  return ws;
}

export function getCivserverPort(): string | null {
  return civserverport;
}

export function networkInitManualHack(port: string, username: string, savegame?: string): void {
  civserverport = port;
  store.username = username;
  websocketInit();

  if (savegame) {
    globalEvents.once('text:received', () => {
      globalEvents.emit('game:load', savegame);
    });
  }
}

export async function networkInit(): Promise<void> {
  if (!('WebSocket' in window)) {
    globalEvents.emit('ui:alert', {
      title: 'WebSockets not supported',
      text: '',
      type: 'error',
    });
    return;
  }

  let url = '/civclientlauncher';
  const action = getUrlVar('action');
  const portParam = getUrlVar('civserverport');
  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (portParam) params.set('civserverport', portParam);
  const qs = params.toString();
  if (qs) url += '?' + qs;

  try {
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    const port = data.port?.toString() ?? response.headers.get('port');
    const result = data.result ?? response.headers.get('result');

    if (port && result === 'success') {
      civserverport = port;
      websocketInit();
      globalEvents.emit('game:checkload');
    } else {
      globalEvents.emit('ui:dialog', {
        title: 'Network error',
        message: 'Invalid server port. Error: ' + result,
      });
    }
  } catch (err) {
    globalEvents.emit('ui:dialog', {
      title: 'Network error',
      message: 'Unable to communicate with game launcher. Error: ' + err,
    });
  }
}

function websocketInit(): void {
  blockUI('<h2>Please wait while connecting to the server.</h2>');

  const proxyport = 1000 + Number(civserverport);
  const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const port = location.port ? ':' + location.port : '';
  ws = new WebSocket(`${protocol}${location.hostname}${port}/civsocket/${proxyport}`);

  ws.onopen = checkWebsocketReady;

  ws.onmessage = (event) => {
    pingLast = Date.now();
    try {
      const parsed = JSON.parse(event.data as string);
      const packets = Array.isArray(parsed) ? parsed : [parsed];
      for (const packet of packets) {
        globalEvents.emit('packet:received', packet);
      }
    } catch (e) {
      logError('Failed to parse packet:', e);
    }
  };

  ws.onclose = (event) => {
    globalEvents.emit('ui:alert', {
      title: 'Network Error',
      text: 'Connection to server is closed. Please reload the page to restart.',
      type: 'error',
    });
    logNormal(`WebSocket closed: code=${event.code}, reason=${event.reason}`);

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    globalEvents.emit('net:disconnected');
  };

  ws.onerror = (evt) => {
    globalEvents.emit('ui:dialog', {
      title: 'Network error',
      message: `WebSocket error connecting to ${ws?.url}: ${evt}`,
    });
    logError('WebSocket error:', evt);
  };
}

function checkWebsocketReady(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setTimeout(checkWebsocketReady, 500);
    return;
  }

  const storedPassword = localStorage.getItem('password');
  let shaPassword: string | null = null;
  if (storedPassword) {
    // SHA-512 will be computed async if needed; for now pass raw
    shaPassword = storedPassword;
  }

  const googleToken =
    ((window as unknown as Record<string, unknown>).google_user_token as string | null) ?? null;

  const loginMessage = {
    pid: 4,
    username: store.username,
    capability: FREECIV_VERSION,
    version_label: '-dev',
    major_version: 3,
    minor_version: 1,
    patch_version: 90,
    port: civserverport,
    password: googleToken ?? shaPassword,
  };
  ws.send(JSON.stringify(loginMessage));

  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    return 'Do you really want to leave your nation behind now?';
  });

  pingTimer = setInterval(pingCheck, PING_CHECK_INTERVAL);
  unblockUI();
  globalEvents.emit('net:connected');
}

export function networkStop(): void {
  ws?.close();
  ws = null;
}

export function sendRequest(payload: string): void {
  if (!ws) return;
  ws.send(payload);
  if (store.debugActive) {
    clinetLastSend = Date.now();
  }
}

export function sendMessage(message: string): void {
  const packet = { pid: 26, message }; // packet_chat_msg_req = 26
  sendRequest(JSON.stringify(packet));
}

export function sendMessageDelayed(message: string, delay: number): void {
  setTimeout(() => sendMessage(message), delay);
}

function pingCheck(): void {
  const elapsed = Date.now() - pingLast;
  if (elapsed > PING_CHECK_INTERVAL) {
    logNormal('Warning: Missing PING from server, possible connection issue.');
  }
}

export function clinetDebugCollect(): void {
  const elapsed = Date.now() - clinetLastSend;
  debugClientSpeedList.push(elapsed);
  clinetLastSend = Date.now();
}
