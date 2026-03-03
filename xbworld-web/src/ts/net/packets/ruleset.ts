import { registerHandler } from './index';
import { PacketType } from './protocol';
import { store } from '../../data/store';
import { globalEvents } from '../../core/events';

const RULESET_GENERIC = [
  PacketType.RULESET_GAME,
  PacketType.RULESET_SPECIALIST,
  PacketType.RULESET_UNIT_CLASS,
  PacketType.RULESET_BASE,
  PacketType.RULESET_ROAD,
  PacketType.RULESET_RESOURCE,
  PacketType.RULESET_EFFECT,
  PacketType.RULESET_CITY,
  PacketType.RULESET_STYLE,
  PacketType.RULESET_MUSIC,
  PacketType.RULESET_ACTION,
  PacketType.RULESET_ACTION_ENABLER,
  PacketType.RULESET_GOODS,
  PacketType.RULESET_DISASTER,
  PacketType.RULESET_TRADE,
  PacketType.RULESET_MULTIPLIER,
  PacketType.RULESET_NATION_GROUPS,
  PacketType.RULESET_NATION_SETS,
  PacketType.NATION_AVAILABILITY,
  PacketType.RULESET_GOVERNMENT_RULER_TITLE,
];

const SERVER_SETTING_TYPES = [
  PacketType.SERVER_SETTING_CONTROL,
  PacketType.SERVER_SETTING_CONST,
  PacketType.SERVER_SETTING_BOOL,
  PacketType.SERVER_SETTING_INT,
  PacketType.SERVER_SETTING_STR,
  PacketType.SERVER_SETTING_ENUM,
  PacketType.SERVER_SETTING_BITWISE,
];

export function registerRulesetHandlers(): void {
  registerHandler(PacketType.RULESET_UNIT, (packet) => {
    const p = packet as any;
    store.unitTypes[p.id] = p;
  });
  registerHandler(PacketType.RULESET_TECH, (packet) => {
    const p = packet as any;
    store.techs[p.id] = p;
  });
  registerHandler(PacketType.RULESET_GOVERNMENT, (packet) => {
    const p = packet as any;
    store.governments[p.id] = p;
  });
  registerHandler(PacketType.RULESET_NATION, (packet) => {
    const p = packet as any;
    store.nations[p.id] = p;
  });
  registerHandler(PacketType.RULESET_BUILDING, (packet) => {
    const p = packet as any;
    store.improvements[p.id] = p;
  });
  registerHandler(PacketType.RULESET_TERRAIN, (packet) => {
    const p = packet as any;
    store.terrains[p.id] = p;
  });
  registerHandler(PacketType.RULESET_EXTRA, (packet) => {
    const p = packet as any;
    store.extras[p.id] = p;
  });
  registerHandler(PacketType.RULESET_CONTROL, (packet) => {
    store.rulesControl = packet as any;
    globalEvents.emit('rules:control', packet);
  });
  registerHandler(PacketType.RULESET_SUMMARY, (packet) => {
    store.rulesSummary = (packet as any).text;
  });
  registerHandler(PacketType.RULESET_DESCRIPTION_PART, (packet) => {
    store.rulesDescription = (packet as any).text;
  });
  registerHandler(PacketType.RULESETS_READY, () => {
    globalEvents.emit('rules:ready');
  });
  registerHandler(PacketType.RULESET_TERRAIN_CONTROL, (packet) => {
    globalEvents.emit('rules:terraincontrol', packet);
  });
  registerHandler(PacketType.PLAYER_INFO, (packet) => {
    const p = packet as any;
    store.players[p.playerno] = p;
    globalEvents.emit('player:updated', packet);
  });
  registerHandler(PacketType.PLAYER_REMOVE, (packet) => {
    const p = packet as any;
    delete store.players[p.playerno];
    globalEvents.emit('player:removed', packet);
  });
  registerHandler(PacketType.PLAYER_DIPLSTATE, (packet) => {
    globalEvents.emit('player:diplstate', packet);
  });
  registerHandler(PacketType.RESEARCH_INFO, (packet) => {
    globalEvents.emit('player:research', packet);
  });
  for (const pid of RULESET_GENERIC) {
    registerHandler(pid, (packet) => globalEvents.emit('rules:data', packet));
  }
  for (const pid of SERVER_SETTING_TYPES) {
    registerHandler(pid, () => globalEvents.emit('settings:updated'));
  }
}
