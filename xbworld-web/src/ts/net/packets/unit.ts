import { registerHandler } from './index';
import { PacketType } from './protocol';
import { store } from '../../data/store';
import { globalEvents } from '../../core/events';

export function registerUnitHandlers(): void {
  registerHandler(PacketType.UNIT_INFO, (packet) => {
    const p = packet as any;
    store.units[p.id] = p;
    globalEvents.emit('unit:updated', packet);
  });

  registerHandler(PacketType.UNIT_SHORT_INFO, (packet) => {
    const p = packet as any;
    const id = p.id ?? p.unit_id;
    if (id !== undefined) {
      store.units[id] = { ...store.units[id], ...p } as any;
    }
    globalEvents.emit('unit:updated', packet);
  });

  registerHandler(PacketType.UNIT_REMOVE, (packet) => {
    const p = packet as any;
    delete store.units[p.unit_id];
    globalEvents.emit('unit:removed', packet);
  });

  registerHandler(PacketType.UNIT_COMBAT_INFO, (packet) => {
    globalEvents.emit('unit:combat', packet);
  });

  registerHandler(PacketType.UNIT_ACTIONS, (packet) => {
    globalEvents.emit('unit:actions', packet);
  });

  registerHandler(PacketType.UNIT_ACTION_ANSWER, (packet) => {
    globalEvents.emit('unit:actionanswer', packet);
  });
}
