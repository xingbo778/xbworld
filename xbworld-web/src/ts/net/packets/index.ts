export { PacketType, type Packet, type PacketHandler } from './protocol';
import type { Packet, PacketHandler } from './protocol';
import { logError } from '../../core/log';
import { globalEvents } from '../../core/events';

const handlers = new Map<number, PacketHandler>();

export function registerHandler(pid: number, handler: PacketHandler): void {
  handlers.set(pid, handler);
}

export function handlePacket(packet: Packet): void {
  const { pid } = packet;
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

import { registerCityHandlers } from './city';
import { registerUnitHandlers } from './unit';
import { registerRulesetHandlers } from './ruleset';
import { registerGameHandlers } from './game';
import { registerDiplomacyHandlers } from './diplomacy';
import { registerConnectionHandlers } from './connection';

registerCityHandlers();
registerUnitHandlers();
registerRulesetHandlers();
registerGameHandlers();
registerDiplomacyHandlers();
registerConnectionHandlers();
