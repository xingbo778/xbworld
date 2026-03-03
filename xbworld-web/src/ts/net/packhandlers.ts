/**
 * Packet handler migrations from packhand.js.
 *
 * Only pure-data-assignment and simple-logic handlers are migrated here.
 * Complex handlers with UI side effects, module-local variable dependencies,
 * or jQuery/DOM operations remain in Legacy packhand.js.
 *
 * Migration criteria (from MIGRATION_GUIDE.md):
 * - Must be a pure query/computation function OR pure data assignment
 * - Must NOT depend on module-local variables (terrain_control, roads, bases, page_msg)
 * - Must NOT call UI functions (show_*, update_*, jQuery, DOM)
 * - Return value format must match Legacy exactly
 */

import { exposeToLegacy } from '../bridge/legacy';

// ============================================================================
// Batch 1: Pure data assignment — ruleset handlers
// Pattern: globals[packet.id] = packet (or similar one-liner)
// ============================================================================

/**
 * handle_ruleset_terrain — Store terrain type data.
 * Note: includes two XBWorld-specific hacks for Lake/Glacier rendering.
 */
function handleRulesetTerrain(packet: any): void {
  const w = window as any;
  /* FIXME: These two hacks are here since XBWorld doesn't support
   *        rendering Lake nor Glacier correctly. */
  if (packet['name'] === 'Lake') {
    packet['graphic_str'] = 'coast';
  }
  if (packet['name'] === 'Glacier') {
    packet['graphic_str'] = 'arctic';
  }
  w.terrains[packet['id']] = packet;
}

/** handle_ruleset_resource — Store resource data. */
function handleRulesetResource(packet: any): void {
  (window as any).resources[packet['id']] = packet;
}

/** handle_ruleset_game — Store game rules. */
function handleRulesetGame(packet: any): void {
  (window as any).game_rules = packet;
}

/** handle_ruleset_specialist — Store specialist data. */
function handleRulesetSpecialist(packet: any): void {
  (window as any).specialists[packet['id']] = packet;
}

/** handle_ruleset_nation_groups — Store nation group list. */
function handleRulesetNationGroups(packet: any): void {
  (window as any).nation_groups = packet['groups'];
}

/** handle_ruleset_nation — Store nation data. */
function handleRulesetNation(packet: any): void {
  (window as any).nations[packet['id']] = packet;
}

/** handle_ruleset_city — Store city style rules. */
function handleRulesetCity(packet: any): void {
  (window as any).city_rules[packet['style_id']] = packet;
}

/** handle_ruleset_government — Store government data. */
function handleRulesetGovernment(packet: any): void {
  (window as any).governments[packet['id']] = packet;
}

/** handle_ruleset_summary — Store ruleset summary text. */
function handleRulesetSummary(packet: any): void {
  (window as any).ruleset_summary = packet['text'];
}

/** handle_ruleset_action — Store action data with empty enablers array. */
function handleRulesetAction(packet: any): void {
  (window as any).actions[packet['id']] = packet;
  packet['enablers'] = [];
}

/** handle_ruleset_goods — Store goods data. */
function handleRulesetGoods(packet: any): void {
  (window as any).goods[packet['id']] = packet;
}

/** handle_ruleset_clause — Store clause info. */
function handleRulesetClause(packet: any): void {
  (window as any).clause_infos[packet['type']] = packet;
}

/** handle_game_info — Store game info packet. */
function handleGameInfo(packet: any): void {
  (window as any).game_info = packet;
}

/** handle_calendar_info — Store calendar info. */
function handleCalendarInfo(packet: any): void {
  (window as any).calendar_info = packet;
}

/** handle_spaceship_info — Store spaceship data per player. */
function handleSpaceshipInfo(packet: any): void {
  (window as any).spaceship_info[packet['player_num']] = packet;
}

// ============================================================================
// Batch 2: Ruleset handlers with simple logic
// ============================================================================

/** handle_ruleset_description_part — Accumulate ruleset description text. */
function handleRulesetDescriptionPart(packet: any): void {
  const w = window as any;
  if (w.ruleset_description == null) {
    w.ruleset_description = packet['text'];
  } else {
    w.ruleset_description += packet['text'];
  }
}

/** handle_ruleset_effect — Group effects by type. */
function handleRulesetEffect(packet: any): void {
  const w = window as any;
  if (w.effects[packet['effect_type']] == null) {
    w.effects[packet['effect_type']] = [];
  }
  w.effects[packet['effect_type']].push(packet);
}

/**
 * handle_ruleset_base — Attach base data to the first matching extra
 * that is caused by EC_BASE and doesn't have base data yet.
 */
function handleRulesetBase(packet: any): void {
  const w = window as any;
  for (let i = 0; i < w.ruleset_control['num_extra_types']; i++) {
    if (w.is_extra_caused_by(w.extras[i], w.EC_BASE)
        && w.extras[i]['base'] == null) {
      w.extras[i]['base'] = packet;
      w.extras[w.extras[i]['rule_name']]['base'] = packet;
      return;
    }
  }
  console.log("Didn't find Extra to put Base on");
  console.log(packet);
}

/**
 * handle_ruleset_road — Attach road data to the first matching extra
 * that is caused by EC_ROAD and doesn't have road data yet.
 */
function handleRulesetRoad(packet: any): void {
  const w = window as any;
  for (let i = 0; i < w.ruleset_control['num_extra_types']; i++) {
    if (w.is_extra_caused_by(w.extras[i], w.EC_ROAD)
        && w.extras[i]['road'] == null) {
      w.extras[i]['road'] = packet;
      w.extras[w.extras[i]['rule_name']]['road'] = packet;
      return;
    }
  }
  console.log("Didn't find Extra to put Road on");
  console.log(packet);
}

/**
 * handle_ruleset_action_enabler — Attach enabler to its parent action.
 */
function handleRulesetActionEnabler(packet: any): void {
  const w = window as any;
  const paction = w.actions[packet.enabled_action];
  if (paction === undefined) {
    console.log("Unknown action " + packet.action + " for enabler ");
    console.log(packet);
    return;
  }
  paction.enablers.push(packet);
}

// ============================================================================
// Batch 3: Simple game state handlers
// ============================================================================

/** handle_new_year — Update game_info with new year/turn data. */
function handleNewYear(packet: any): void {
  const w = window as any;
  w.game_info['year'] = packet['year'];
  w.game_info['fragments'] = packet['fragments'];
  w.game_info['turn'] = packet['turn'];
}

/** handle_timeout_info — Update turn timeout tracking. */
function handleTimeoutInfo(packet: any): void {
  const w = window as any;
  w.last_turn_change_time = Math.ceil(packet['last_turn_change_time']);
  w.seconds_to_phasedone = Math.floor(packet['seconds_to_phasedone']);
  w.seconds_to_phasedone_sync = new Date().getTime();
}

/** handle_trade_route_info — Store trade route data per city. */
function handleTradeRouteInfo(packet: any): void {
  const w = window as any;
  if (w.city_trade_routes[packet['city']] == null) {
    w.city_trade_routes[packet['city']] = {};
  }
  w.city_trade_routes[packet['city']][packet['index']] = packet;
}

/** handle_processing_started — Freeze client during server processing. */
function handleProcessingStarted(_packet: any): void {
  (window as any).client_frozen = true;
}

/** handle_processing_finished — Unfreeze client after server processing. */
function handleProcessingFinished(_packet: any): void {
  (window as any).client_frozen = false;
}

/** handle_freeze_hint — Freeze client (hint from server). */
function handleFreezeHint(_packet: any): void {
  (window as any).client_frozen = true;
}

/** handle_thaw_hint — Thaw client (hint from server). */
function handleThawHint(_packet: any): void {
  (window as any).client_frozen = false;
}

/** handle_freeze_client — Freeze client. */
function handleFreezeClient(_packet: any): void {
  (window as any).client_frozen = true;
}

/** handle_thaw_client — Thaw client. */
function handleThawClient(_packet: any): void {
  (window as any).client_frozen = false;
}

/** handle_endgame_player — Accumulate endgame player info. */
function handleEndgamePlayer(packet: any): void {
  (window as any).endgame_player_info.push(packet);
}

/** handle_unknown_research — Remove research data for unknown tech. */
function handleUnknownResearch(packet: any): void {
  delete (window as any).research_data[packet['id']];
}

// ============================================================================
// Expose to Legacy
// ============================================================================

// Batch 1: Pure data assignment ruleset handlers
exposeToLegacy('handle_ruleset_terrain', handleRulesetTerrain);
exposeToLegacy('handle_ruleset_resource', handleRulesetResource);
exposeToLegacy('handle_ruleset_game', handleRulesetGame);
exposeToLegacy('handle_ruleset_specialist', handleRulesetSpecialist);
exposeToLegacy('handle_ruleset_nation_groups', handleRulesetNationGroups);
exposeToLegacy('handle_ruleset_nation', handleRulesetNation);
exposeToLegacy('handle_ruleset_city', handleRulesetCity);
exposeToLegacy('handle_ruleset_government', handleRulesetGovernment);
exposeToLegacy('handle_ruleset_summary', handleRulesetSummary);
exposeToLegacy('handle_ruleset_action', handleRulesetAction);
exposeToLegacy('handle_ruleset_goods', handleRulesetGoods);
exposeToLegacy('handle_ruleset_clause', handleRulesetClause);
exposeToLegacy('handle_game_info', handleGameInfo);
exposeToLegacy('handle_calendar_info', handleCalendarInfo);
exposeToLegacy('handle_spaceship_info', handleSpaceshipInfo);

// Batch 2: Ruleset handlers with simple logic
exposeToLegacy('handle_ruleset_description_part', handleRulesetDescriptionPart);
exposeToLegacy('handle_ruleset_effect', handleRulesetEffect);
exposeToLegacy('handle_ruleset_base', handleRulesetBase);
exposeToLegacy('handle_ruleset_road', handleRulesetRoad);
exposeToLegacy('handle_ruleset_action_enabler', handleRulesetActionEnabler);

// Batch 3: Simple game state handlers
exposeToLegacy('handle_new_year', handleNewYear);
exposeToLegacy('handle_timeout_info', handleTimeoutInfo);
exposeToLegacy('handle_trade_route_info', handleTradeRouteInfo);
exposeToLegacy('handle_processing_started', handleProcessingStarted);
exposeToLegacy('handle_processing_finished', handleProcessingFinished);
exposeToLegacy('handle_freeze_hint', handleFreezeHint);
exposeToLegacy('handle_thaw_hint', handleThawHint);
exposeToLegacy('handle_freeze_client', handleFreezeClient);
exposeToLegacy('handle_thaw_client', handleThawClient);
exposeToLegacy('handle_endgame_player', handleEndgamePlayer);
exposeToLegacy('handle_unknown_research', handleUnknownResearch);
