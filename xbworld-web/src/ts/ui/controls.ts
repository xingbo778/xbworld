/**
 * Keyboard and mouse input handling.
 * Migrated from control.js — handles hotkeys, unit orders, goto mode.
 */

import { globalEvents } from '../core/events';
import { store } from '../data/store';
import { send_request as sendRequest, send_message as sendMessage } from '../net/connection';
import { $id, on } from '../utils/dom';

let gotoActive = false;
let focusedUnitId: number | null = null;

const HOTKEYS: Record<string, () => void> = {
  g: activateGoto,
  x: () => sendUnitOrder('explore'),
  f: () => sendUnitOrder('fortify'),
  b: () => sendUnitOrder('build_city'),
  s: () => sendUnitOrder('sentry'),
  r: () => sendUnitOrder('road'),
  i: () => sendUnitOrder('irrigate'),
  m: () => sendUnitOrder('mine'),
  a: () => sendUnitOrder('auto_work'),
  w: () => sendUnitOrder('wait'),
  ' ': advanceUnitFocus,
};

export function initControls(): void {
  on(document, 'keydown', handleKeyDown);

  globalEvents.on<{ tile: { index: number }; event: PointerEvent }>('map:tileclick', (data) => {
    if (!data) return;
    if (gotoActive && focusedUnitId != null) {
      sendGoto(focusedUnitId, data.tile.index);
      gotoActive = false;
    } else {
      handleTileClick(data.tile.index);
    }
  });

  globalEvents.on<number>('unit:focus', (unitId) => {
    if (unitId != null) focusedUnitId = unitId;
  });

  // Unit order buttons
  setupOrderButtons();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  const key = e.key.toLowerCase();

  if (e.shiftKey && key === 'enter') {
    sendMessage('/turn done');
    return;
  }

  const handler = HOTKEYS[key];
  if (handler) {
    e.preventDefault();
    handler();
  }
}

export function activateGoto(): void {
  gotoActive = true;
  globalEvents.emit('ui:goto:active', true);
}

function sendUnitOrder(order: string): void {
  if (focusedUnitId == null) return;
  const unit = store.units[focusedUnitId];
  if (!unit) return;

  const packet: Record<string, unknown> = {
    pid: 62,
    unit_id: focusedUnitId,
    order,
  };
  sendRequest(JSON.stringify(packet));
}

function sendGoto(unitId: number, tileIndex: number): void {
  const packet = {
    pid: 59,
    unit_id: unitId,
    dest_tile: tileIndex,
  };
  sendRequest(JSON.stringify(packet));
}

function handleTileClick(tileIndex: number): void {
  const tile = store.tiles[tileIndex];
  if (!tile) return;

  const unitsOnTile = Object.values(store.units).filter((u) => u.tile === tileIndex);
  const myUnits = unitsOnTile.filter((u) => u.owner === store.client.conn.playing?.playerno);

  if (myUnits.length > 0) {
    focusedUnitId = myUnits[0].id;
    globalEvents.emit('unit:focus', focusedUnitId);
  } else {
    globalEvents.emit('tile:selected', tileIndex);
  }
}

function advanceUnitFocus(): void {
  const myPlayerno = store.client.conn.playing?.playerno;
  if (myPlayerno == null) return;

  const myUnits = Object.values(store.units).filter(
    (u) => u.owner === myPlayerno && !u.done_moving && u.movesleft > 0,
  );

  if (myUnits.length === 0) return;

  const currentIdx = myUnits.findIndex((u) => u.id === focusedUnitId);
  const next = myUnits[(currentIdx + 1) % myUnits.length];
  focusedUnitId = next.id;
  globalEvents.emit('unit:focus', focusedUnitId);
}

function setupOrderButtons(): void {
  const orders: Record<string, () => void> = {
    order_goto: activateGoto,
    order_explore: () => sendUnitOrder('explore'),
    order_fortify: () => sendUnitOrder('fortify'),
    order_sentry: () => sendUnitOrder('sentry'),
    order_build_city: () => sendUnitOrder('build_city'),
    order_road: () => sendUnitOrder('road'),
    order_irrigate: () => sendUnitOrder('irrigate'),
    order_mine: () => sendUnitOrder('mine'),
    order_auto_workers: () => sendUnitOrder('auto_work'),
    order_disband: () => sendUnitOrder('disband'),
    order_pillage: () => sendUnitOrder('pillage'),
  };

  for (const [id, handler] of Object.entries(orders)) {
    const el = $id(id);
    if (el) on(el, 'click', handler);
  }
}

export function getFocusedUnitId(): number | null {
  return focusedUnitId;
}
