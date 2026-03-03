import { registerHandler } from './index';
import { PacketType } from './protocol';
import { store } from '../../data/store';
import { globalEvents } from '../../core/events';
import { mapAllocate } from '../../data/map';
import { sendMessage } from '../connection';

export function registerGameHandlers(): void {
  registerHandler(PacketType.PROCESSING_STARTED, () => {
    store.frozen = true;
  });

  registerHandler(PacketType.PROCESSING_FINISHED, () => {
    store.frozen = false;
    globalEvents.emit('game:unfrozen');
  });

  registerHandler(PacketType.SERVER_JOIN_REPLY, (packet) => {
    const p = packet as Record<string, unknown>;
    if (p.you_can_join) {
      store.client.conn.id = (p.conn_id as number) ?? 0;
      globalEvents.emit('net:joined');
      if (store.observing) {
        sendMessage('/observe ');
      }
    } else {
      globalEvents.emit('ui:alert', {
        title: 'Join failed',
        text: (p.reason as string) ?? 'Cannot join',
        type: 'error',
      } as any);
    }
  });

  registerHandler(PacketType.GAME_INFO, (packet) => {
    store.gameInfo = packet as any;
    globalEvents.emit('game:info', packet);
  });

  registerHandler(PacketType.MAP_INFO, (packet) => {
    store.mapInfo = packet as any;
    mapAllocate();
    globalEvents.emit('map:allocated');
  });

  registerHandler(PacketType.CALENDAR_INFO, (packet) => {
    store.calendarInfo = packet as any;
  });

  registerHandler(PacketType.TIMEOUT_INFO, (packet) => {
    if (store.gameInfo) {
      (store.gameInfo as Record<string, unknown>).timeout = (packet as Record<string, unknown>).timeout;
    }
  });

  registerHandler(PacketType.BEGIN_TURN, () => {
    globalEvents.emit('game:beginturn');
  });

  registerHandler(PacketType.END_TURN, () => {
    globalEvents.emit('game:endturn');
  });

  registerHandler(PacketType.NEW_YEAR, () => {
    globalEvents.emit('game:newyear');
  });

  registerHandler(PacketType.START_PHASE, () => {
    globalEvents.emit('game:startphase');
  });

  registerHandler(PacketType.END_PHASE, () => {
    globalEvents.emit('game:endphase');
  });

  registerHandler(PacketType.FREEZE_CLIENT, () => {
    store.frozen = true;
  });

  registerHandler(PacketType.THAW_CLIENT, () => {
    store.frozen = false;
  });

  registerHandler(PacketType.SERVER_SHUTDOWN, (packet) => {
    const p = packet as Record<string, unknown>;
    globalEvents.emit('ui:alert', {
      title: 'Server Shutdown',
      text: (p.message as string) ?? (p.reason as string) ?? 'Server is shutting down',
      type: 'error',
    } as any);
  });
}
