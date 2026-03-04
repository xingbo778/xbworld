/**
 * Packet handler registry and dispatcher.
 * Migrated from packhand.js — maps packet IDs to typed handlers.
 *
 * Packet IDs MUST match freeciv/common/networking/packets.def (v3.2).
 */

import { store } from '../data/store';
import { globalEvents } from '../core/events';
import { logError, logNormal } from '../core/log';
import { BitVector } from '../utils/bitvector';
import { mapAllocate } from '../data/map';
import { send_message as sendMessage } from './connection';

type PacketHandler = (packet: Record<string, unknown>) => void;

const handlers = new Map<number, PacketHandler>();

export function registerHandler(pid: number, handler: PacketHandler): void {
  handlers.set(pid, handler);
}

export function handlePacket(packet: Record<string, unknown>): void {
  const pid = packet['pid'] as number;
  const handler = handlers.get(pid);
  if (handler) {
    try {
      handler(packet);
    } catch (e) {
      logError(`Packet handler error for pid=${pid}:`, e);
    }
  }
  globalEvents.emit(`packet:${pid}`, packet);
}

// --- Core packet handlers (IDs from packets.def v3.2) ---

registerHandler(5, (packet) => {
  // PACKET_SERVER_JOIN_REPLY = 5
  if (packet['you_can_join'] as boolean) {
    store.client.conn.id = packet['conn_id'] as number;
    globalEvents.emit('net:joined', packet);
    if (store.observing) {
      logNormal('Observer mode: sending /observe command');
      sendMessage('/observe ');
    }
  } else {
    globalEvents.emit('ui:alert', {
      title: 'Connection refused',
      text: packet['message'] as string,
      type: 'error',
    });
  }
});

registerHandler(15, (packet) => {
  // PACKET_TILE_INFO = 15
  const index = (packet['tile'] as number) ?? (packet['index'] as number);
  const existing = store.tiles[index];
  if (existing) {
    Object.assign(existing, packet);
    if (packet['extras'] && Array.isArray(packet['extras'])) {
      existing.extras = packet['extras'] as number[];
      (existing as Record<string, unknown>)['extras'] = new BitVector(packet['extras'] as number[]);
    }
  }
  globalEvents.emit('tile:updated', index);
});

registerHandler(16, (packet) => {
  // PACKET_GAME_INFO = 16
  store.gameInfo = packet as unknown as typeof store.gameInfo;
  globalEvents.emit('game:info', packet);
});

registerHandler(17, (packet) => {
  // PACKET_MAP_INFO = 17
  store.mapInfo = packet as unknown as typeof store.mapInfo;
  mapAllocate();
  globalEvents.emit('map:allocated');
});

registerHandler(25, (packet) => {
  // PACKET_CHAT_MSG = 25
  globalEvents.emit('chat:message', packet);
});

registerHandler(28, (packet) => {
  // PACKET_EARLY_CHAT_MSG = 28
  globalEvents.emit('chat:message', packet);
});

registerHandler(30, (packet) => {
  // PACKET_CITY_REMOVE = 30
  const id = packet['city_id'] as number;
  delete store.cities[id];
  globalEvents.emit('city:removed', id);
});

registerHandler(31, (packet) => {
  // PACKET_CITY_INFO = 31
  const city = packet as unknown as (typeof store.cities)[0];
  store.cities[city.id] = city;
  globalEvents.emit('city:updated', city.id);
});

registerHandler(32, (packet) => {
  // PACKET_CITY_SHORT_INFO = 32
  const city = packet as unknown as (typeof store.cities)[0];
  store.cities[city.id] = { ...store.cities[city.id], ...city };
  globalEvents.emit('city:updated', city.id);
});

registerHandler(51, (packet) => {
  // PACKET_PLAYER_INFO = 51
  const player = packet as unknown as (typeof store.players)[0];
  store.players[player.playerno] = player;
  globalEvents.emit('player:updated', player.playerno);
});

registerHandler(62, (packet) => {
  // PACKET_UNIT_REMOVE = 62
  const id = packet['unit_id'] as number;
  delete store.units[id];
  globalEvents.emit('unit:removed', id);
});

registerHandler(63, (packet) => {
  // PACKET_UNIT_INFO = 63
  const unit = packet as unknown as (typeof store.units)[0];
  store.units[unit.id] = unit;
  globalEvents.emit('unit:updated', unit.id);
});

registerHandler(64, (packet) => {
  // PACKET_UNIT_SHORT_INFO = 64
  const unit = packet as unknown as (typeof store.units)[0];
  store.units[unit.id] = { ...store.units[unit.id], ...unit };
  globalEvents.emit('unit:updated', unit.id);
});

registerHandler(88, (packet) => {
  // PACKET_CONN_PING = 88
  globalEvents.emit('net:ping', packet);
});

registerHandler(115, (packet) => {
  // PACKET_CONN_INFO = 115
  const conn = packet as unknown as (typeof store.connections)[0];
  store.connections[conn.id] = conn;
  globalEvents.emit('connection:updated', conn.id);
});

registerHandler(125, (packet) => {
  // PACKET_END_PHASE = 125
  globalEvents.emit('game:endphase', packet);
});

registerHandler(126, (packet) => {
  // PACKET_START_PHASE = 126
  globalEvents.emit('game:startphase', packet);
});

registerHandler(127, (packet) => {
  // PACKET_NEW_YEAR = 127
  globalEvents.emit('game:newyear', packet);
});

registerHandler(128, (packet) => {
  // PACKET_BEGIN_TURN = 128
  globalEvents.emit('game:beginturn', packet);
});

registerHandler(129, (packet) => {
  // PACKET_END_TURN = 129
  globalEvents.emit('game:endturn', packet);
});

registerHandler(140, (packet) => {
  // PACKET_RULESET_UNIT = 140
  const ut = packet as unknown as (typeof store.unitTypes)[0];
  store.unitTypes[ut.id] = ut;
});

registerHandler(144, (packet) => {
  // PACKET_RULESET_TECH = 144
  const tech = packet as unknown as (typeof store.techs)[0];
  store.techs[tech.id] = tech;
});

registerHandler(145, (packet) => {
  // PACKET_RULESET_GOVERNMENT = 145
  const gov = packet as unknown as (typeof store.governments)[0];
  store.governments[gov.id] = gov;
});

registerHandler(148, (packet) => {
  // PACKET_RULESET_NATION = 148
  const nation = packet as unknown as (typeof store.nations)[0];
  store.nations[nation.id] = nation;
});

registerHandler(150, (packet) => {
  // PACKET_RULESET_BUILDING = 150
  const imp = packet as unknown as (typeof store.improvements)[0];
  store.improvements[imp.id] = imp;
});

registerHandler(151, (packet) => {
  // PACKET_RULESET_TERRAIN = 151
  const terrain = packet as unknown as (typeof store.terrains)[0];
  store.terrains[terrain.id] = terrain;
});

registerHandler(155, (packet) => {
  // PACKET_RULESET_CONTROL = 155
  store.rulesControl = packet as Record<string, unknown>;
  globalEvents.emit('rules:control', packet);
});

registerHandler(164, (packet) => {
  // PACKET_SERVER_SETTING_CONTROL = 164
  globalEvents.emit('settings:control', packet);
});

registerHandler(165, (packet) => {
  // PACKET_SERVER_SETTING_CONST = 165
  globalEvents.emit('settings:const', packet);
});

registerHandler(232, (packet) => {
  // PACKET_RULESET_EXTRA = 232
  const extra = packet as unknown as (typeof store.extras)[0];
  store.extras[extra.id] = extra;
});

registerHandler(247, (packet) => {
  // PACKET_RULESET_DESCRIPTION_PART = 247
  store.rulesDescription = packet['text'] as string;
});

registerHandler(251, (packet) => {
  // PACKET_RULESET_SUMMARY = 251
  store.rulesSummary = packet['text'] as string;
});

registerHandler(255, (packet) => {
  // PACKET_CALENDAR_INFO = 255
  store.calendarInfo = packet as unknown as typeof store.calendarInfo;
});
