/**
 * Packet handler registry and dispatcher.
 * Migrated from packhand.js — maps packet IDs to typed handlers.
 */

import { store } from '../data/store';
import { globalEvents } from '../core/events';
import { logError, logNormal } from '../core/log';
import { BitVector } from '../utils/bitvector';
import { mapAllocate } from '../data/map';

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

// --- Core packet handlers ---

registerHandler(5, (packet) => {
  // SERVER_JOIN_REPLY
  if (packet['you_can_join'] as boolean) {
    store.client.conn.id = packet['conn_id'] as number;
    globalEvents.emit('net:joined', packet);
  } else {
    globalEvents.emit('ui:alert', {
      title: 'Connection refused',
      text: packet['message'] as string,
      type: 'error',
    });
  }
});

registerHandler(15, (packet) => {
  // GAME_INFO
  store.gameInfo = packet as unknown as typeof store.gameInfo;
  globalEvents.emit('game:info', packet);
});

registerHandler(254, (packet) => {
  // CALENDAR_INFO
  store.calendarInfo = packet as unknown as typeof store.calendarInfo;
});

registerHandler(16, (packet) => {
  // MAP_INFO
  store.mapInfo = packet as unknown as typeof store.mapInfo;
  mapAllocate();
  globalEvents.emit('map:allocated');
});

registerHandler(17, (packet) => {
  // TILE_INFO
  const index = packet['tile'] as number ?? packet['index'] as number;
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

registerHandler(49, (packet) => {
  // UNIT_INFO / UNIT_SHORT_INFO
  const unit = packet as unknown as typeof store.units[0];
  store.units[unit.id] = unit;
  globalEvents.emit('unit:updated', unit.id);
});

registerHandler(50, (packet) => {
  // UNIT_SHORT_INFO
  const unit = packet as unknown as typeof store.units[0];
  store.units[unit.id] = { ...store.units[unit.id], ...unit };
  globalEvents.emit('unit:updated', unit.id);
});

registerHandler(62, (packet) => {
  // UNIT_REMOVE
  const id = packet['unit_id'] as number;
  delete store.units[id];
  globalEvents.emit('unit:removed', id);
});

registerHandler(30, (packet) => {
  // CITY_INFO
  const city = packet as unknown as typeof store.cities[0];
  store.cities[city.id] = city;
  globalEvents.emit('city:updated', city.id);
});

registerHandler(31, (packet) => {
  // CITY_SHORT_INFO
  const city = packet as unknown as typeof store.cities[0];
  store.cities[city.id] = { ...store.cities[city.id], ...city };
  globalEvents.emit('city:updated', city.id);
});

registerHandler(32, (packet) => {
  // CITY_REMOVE
  const id = packet['city_id'] as number;
  delete store.cities[id];
  globalEvents.emit('city:removed', id);
});

registerHandler(51, (packet) => {
  // PLAYER_INFO
  const player = packet as unknown as typeof store.players[0];
  store.players[player.playerno] = player;
  globalEvents.emit('player:updated', player.playerno);
});

registerHandler(88, (packet) => {
  // CONN_INFO
  const conn = packet as unknown as typeof store.connections[0];
  store.connections[conn.id] = conn;
  globalEvents.emit('connection:updated', conn.id);
});

registerHandler(21, (packet) => {
  // RULESET_TERRAIN
  const terrain = packet as unknown as typeof store.terrains[0];
  store.terrains[terrain.id] = terrain;
});

registerHandler(140, (packet) => {
  // RULESET_UNIT
  const ut = packet as unknown as typeof store.unitTypes[0];
  store.unitTypes[ut.id] = ut;
});

registerHandler(145, (packet) => {
  // RULESET_TECH
  const tech = packet as unknown as typeof store.techs[0];
  store.techs[tech.id] = tech;
});

registerHandler(150, (packet) => {
  // RULESET_GOVERNMENT
  const gov = packet as unknown as typeof store.governments[0];
  store.governments[gov.id] = gov;
});

registerHandler(155, (packet) => {
  // RULESET_BUILDING
  const imp = packet as unknown as typeof store.improvements[0];
  store.improvements[imp.id] = imp;
});

registerHandler(160, (packet) => {
  // RULESET_NATION
  const nation = packet as unknown as typeof store.nations[0];
  store.nations[nation.id] = nation;
});

registerHandler(165, (packet) => {
  // RULESET_EXTRA
  const extra = packet as unknown as typeof store.extras[0];
  store.extras[extra.id] = extra;
});

registerHandler(24, (packet) => {
  // CHAT_MSG
  globalEvents.emit('chat:message', packet);
});

registerHandler(25, (packet) => {
  // EARLY_CHAT_MSG
  globalEvents.emit('chat:message', packet);
});

registerHandler(125, (packet) => {
  // PING
  globalEvents.emit('net:ping', packet);
});

registerHandler(126, (packet) => {
  // PONG
  globalEvents.emit('net:pong', packet);
});

registerHandler(19, (packet) => {
  // NEW_YEAR
  globalEvents.emit('game:newyear', packet);
});

registerHandler(20, (packet) => {
  // BEGIN_TURN
  globalEvents.emit('game:beginturn', packet);
});

registerHandler(22, (packet) => {
  // END_TURN
  globalEvents.emit('game:endturn', packet);
});

registerHandler(116, (packet) => {
  // SERVER_SETTING_CONTROL
  globalEvents.emit('settings:control', packet);
});

registerHandler(117, (packet) => {
  // SERVER_SETTING_CONST
  globalEvents.emit('settings:const', packet);
});

registerHandler(130, (packet) => {
  // RULESET_CONTROL
  store.rulesControl = packet as Record<string, unknown>;
  globalEvents.emit('rules:control', packet);
});

registerHandler(131, (packet) => {
  // RULESET_SUMMARY
  store.rulesSummary = packet['text'] as string;
});

registerHandler(132, (packet) => {
  // RULESET_DESCRIPTION
  store.rulesDescription = packet['text'] as string;
});

registerHandler(255, (packet) => {
  // END_PHASE
  globalEvents.emit('game:endphase', packet);
});

registerHandler(256, (packet) => {
  // START_PHASE
  globalEvents.emit('game:startphase', packet);
});
