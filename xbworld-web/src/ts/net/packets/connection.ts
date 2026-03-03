import { registerHandler } from './index';
import { PacketType } from './protocol';
import { store } from '../../data/store';
import { globalEvents } from '../../core/events';

export function registerConnectionHandlers(): void {
  registerHandler(PacketType.CONN_INFO, (packet) => {
    const p = packet as any;
    store.connections[p.id] = p;
    globalEvents.emit('connection:updated', packet);
  });

  registerHandler(PacketType.CONN_PING, (packet) => {
    globalEvents.emit('net:ping', packet);
  });

  registerHandler(PacketType.CONN_PING_INFO, (packet) => {
    globalEvents.emit('net:pinginfo', packet);
  });

  registerHandler(PacketType.CHAT_MSG, (packet) => {
    globalEvents.emit('chat:message', packet);
  });

  registerHandler(PacketType.EARLY_CHAT_MSG, (packet) => {
    globalEvents.emit('chat:message', packet);
  });

  registerHandler(PacketType.CONNECT_MSG, (packet) => {
    globalEvents.emit('chat:connect', packet);
  });

  registerHandler(PacketType.PAGE_MSG, (packet) => {
    globalEvents.emit('chat:pagemsg', packet);
  });

  registerHandler(PacketType.PAGE_MSG_PART, (packet) => {
    globalEvents.emit('chat:pagemsgpart', packet);
  });
}
