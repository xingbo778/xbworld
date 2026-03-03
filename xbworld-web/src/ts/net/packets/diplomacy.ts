import { registerHandler } from './index';
import { PacketType } from './protocol';
import { globalEvents } from '../../core/events';

export function registerDiplomacyHandlers(): void {
  registerHandler(PacketType.DIPLOMACY_INIT_MEETING, (packet) => {
    globalEvents.emit('diplomacy:meeting', packet);
  });
  registerHandler(PacketType.DIPLOMACY_CANCEL_MEETING, (packet) => {
    globalEvents.emit('diplomacy:cancel', packet);
  });
  registerHandler(PacketType.DIPLOMACY_CREATE_CLAUSE, (packet) => {
    globalEvents.emit('diplomacy:clause', packet);
  });
  registerHandler(PacketType.DIPLOMACY_REMOVE_CLAUSE, (packet) => {
    globalEvents.emit('diplomacy:removeclause', packet);
  });
  registerHandler(PacketType.DIPLOMACY_ACCEPT_TREATY, (packet) => {
    globalEvents.emit('diplomacy:accept', packet);
  });
}
