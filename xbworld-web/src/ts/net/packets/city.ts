import { registerHandler } from './index';
import { PacketType } from './protocol';
import { store } from '../../data/store';
import { globalEvents } from '../../core/events';

function mergeCity(packet: Record<string, unknown>, key: 'id' | 'city_id' = 'id'): void {
  const id = packet[key] as number;
  if (id !== undefined) {
    store.cities[id] = { ...store.cities[id], ...packet } as any;
  }
}

export function registerCityHandlers(): void {
  registerHandler(PacketType.CITY_INFO, (packet) => {
    const p = packet as any;
    store.cities[p.id] = p;
    globalEvents.emit('city:updated', packet);
  });

  registerHandler(PacketType.CITY_SHORT_INFO, (packet) => {
    mergeCity(packet as any);
    globalEvents.emit('city:updated', packet);
  });

  registerHandler(PacketType.CITY_REMOVE, (packet) => {
    const p = packet as any;
    delete store.cities[p.city_id];
    globalEvents.emit('city:removed', packet);
  });

  registerHandler(PacketType.CITY_NAME_SUGGESTION_INFO, (packet) => {
    globalEvents.emit('city:namesuggestion', packet);
  });

  registerHandler(PacketType.WEB_CITY_INFO_ADDITION, (packet) => {
    const p = packet as any;
    store.cities[p.id] = { ...store.cities[p.id], ...p } as any;
  });

  registerHandler(PacketType.CITY_NATIONALITIES, (packet) => {
    mergeCity(packet as any, 'city_id');
  });

  registerHandler(PacketType.CITY_RALLY_POINT, (packet) => {
    mergeCity(packet as any, 'city_id');
  });

  registerHandler(PacketType.TRADE_ROUTE_INFO, (packet) => {
    globalEvents.emit('city:traderoute', packet);
  });
}
