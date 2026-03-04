/**
 * City data module — pure data queries and logic migrated from city.js.
 *
 * Phase 7: Migrates 29 pure-data functions from legacy city.js.
 * UI/DOM functions (show_city_dialog, city_worklist_dialog, etc.) remain
 * in legacy city.js until the UI layer migration phase.
 */

import {
  FC_INFINITY,
  VUT_UTYPE,
  VUT_IMPROVEMENT,
  O_SHIELD,
  CAPITAL_PRIMARY,
} from './fcTypes';

// ---------------------------------------------------------------------------
// Legacy global references (via window)
// ---------------------------------------------------------------------------
const w = window as unknown as Record<string, any>;

// ---------------------------------------------------------------------------
// Constants (also defined in city.js — will be removed from there)
// ---------------------------------------------------------------------------
export const CITYO_DISBAND = 0;
export const CITYO_NEW_EINSTEIN = 1;
export const CITYO_NEW_TAXMAN = 2;
export const CITYO_LAST = 3;

export const FEELING_BASE = 0;
export const FEELING_LUXURY = 1;
export const FEELING_EFFECT = 2;
export const FEELING_NATIONALITY = 3;
export const FEELING_MARTIAL = 4;
export const FEELING_FINAL = 5;

export const MAX_LEN_WORKLIST = 64;
export const INCITE_IMPOSSIBLE_COST = 1000 * 1000 * 1000;

// ---------------------------------------------------------------------------
// Internal state for city tile map (replaces global city_tile_map)
// ---------------------------------------------------------------------------
let cityTileMap: {
  radius_sq: number;
  radius: number;
  base_sorted: number[][];
  maps: (number[] | null)[];
} | null = null;

// ---------------------------------------------------------------------------
// Basic city queries
// ---------------------------------------------------------------------------

/** Returns the tile object for a city. */
export function cityTile(pcity: any): any {
  if (pcity == null) return null;
  return w.index_to_tile(pcity['tile']);
}

/** Returns the player id (owner) of a city. */
export function cityOwnerPlayerId(pcity: any): number | null {
  if (pcity == null) return null;
  return pcity['owner'];
}

/** Returns the player object that owns the city. */
export function cityOwner(pcity: any): any {
  return w.players[cityOwnerPlayerId(pcity)!];
}

/** Removes a city from the game. */
export function removeCity(pcityId: number): void {
  if (pcityId == null || w.client?.conn?.playing == null) return;
  const pcity = w.cities[pcityId];
  if (pcity == null) return;

  const update =
    w.client.conn.playing.playerno &&
    cityOwner(pcity).playerno === w.client.conn.playing.playerno;
  const ptile = cityTile(w.cities[pcityId]);
  delete w.cities[pcityId];
  if (w.renderer === w.RENDERER_WEBGL) {
    w.update_city_position(ptile);
  }
  if (update) {
    w.city_screen_updater?.update();
    w.bulbs_output_updater?.update();
  }
}

/** Returns true if the tile is the city center. */
export function isCityCenter(city: any, tile: any): boolean {
  return city['tile'] === tile['index'];
}

/** Returns true if the tile is free-worked (same as city center). */
export function isFreeWorked(city: any, tile: any): boolean {
  return city['tile'] === tile['index'];
}

/** Returns true if the city is the primary capital. */
export function isPrimaryCapital(city: any): boolean {
  return city['capital'] === CAPITAL_PRIMARY;
}

// ---------------------------------------------------------------------------
// Production queries
// ---------------------------------------------------------------------------

/** Returns the sprite and type info for the city's current production. */
export function getCityProductionTypeSprite(pcity: any): any {
  if (pcity == null) return null;
  if (pcity['production_kind'] === VUT_UTYPE) {
    const punitType = w.unit_types[pcity['production_value']];
    return {
      type: punitType,
      sprite: w.get_unit_type_image_sprite(punitType),
    };
  }
  if (pcity['production_kind'] === VUT_IMPROVEMENT) {
    const improvement = w.improvements[pcity['production_value']];
    return {
      type: improvement,
      sprite: w.get_improvement_image_sprite(improvement),
    };
  }
  return null;
}

/** Returns the type object (unit type or improvement) being produced. */
export function getCityProductionType(pcity: any): any {
  if (pcity == null) return null;
  if (pcity['production_kind'] === VUT_UTYPE) {
    return w.unit_types[pcity['production_value']];
  }
  if (pcity['production_kind'] === VUT_IMPROVEMENT) {
    return w.improvements[pcity['production_value']];
  }
  return null;
}

/**
 * Calculates the turns needed to build the requested item in the city.
 * GUI Independent.
 */
export function cityTurnsToBuild(
  pcity: any,
  target: any,
  includeShieldStock: boolean,
): number {
  const citySurplus = pcity['surplus'][O_SHIELD];
  const cityStock = includeShieldStock ? pcity['shield_stock'] : 0;
  const cost = w.universal_build_shield_cost(pcity, target);

  if (includeShieldStock && pcity['shield_stock'] >= cost) {
    return 1;
  } else if (pcity['surplus'][O_SHIELD] > 0) {
    return Math.floor((cost - cityStock - 1) / citySurplus + 1);
  } else {
    return FC_INFINITY;
  }
}

/** Returns the number of turns to complete current city production. */
export function getCityProductionTime(pcity: any): number {
  if (pcity == null) return FC_INFINITY;

  if (pcity['production_kind'] === VUT_UTYPE) {
    const punitType = w.unit_types[pcity['production_value']];
    return cityTurnsToBuild(pcity, punitType, true);
  }

  if (pcity['production_kind'] === VUT_IMPROVEMENT) {
    const improvement = w.improvements[pcity['production_value']];
    if (improvement['name'] === 'Coinage') {
      return FC_INFINITY;
    }
    return cityTurnsToBuild(pcity, improvement, true);
  }

  return FC_INFINITY;
}

/** Returns city production progress string, e.g. "5/30". */
export function getProductionProgress(pcity: any): string {
  if (pcity == null) return ' ';

  if (pcity['production_kind'] === VUT_UTYPE) {
    const punitType = w.unit_types[pcity['production_value']];
    return (
      pcity['shield_stock'] +
      '/' +
      w.universal_build_shield_cost(pcity, punitType)
    );
  }

  if (pcity['production_kind'] === VUT_IMPROVEMENT) {
    const improvement = w.improvements[pcity['production_value']];
    if (improvement['name'] === 'Coinage') {
      return ' ';
    }
    return (
      pcity['shield_stock'] +
      '/' +
      w.universal_build_shield_cost(pcity, improvement)
    );
  }

  return ' ';
}

/** Generates the full production list (units + improvements). */
export function generateProductionList(): any[] {
  const productionList: any[] = [];

  for (const unitTypeId in w.unit_types) {
    const punitType = w.unit_types[unitTypeId];
    // FIXME: web client doesn't support unit flags yet, so this is a hack
    if (
      punitType['name'] === 'Barbarian Leader' ||
      punitType['name'] === 'Leader'
    )
      continue;

    productionList.push({
      kind: VUT_UTYPE,
      value: punitType['id'],
      text: punitType['name'],
      helptext: punitType['helptext'],
      rule_name: punitType['rule_name'],
      build_cost: punitType['build_cost'],
      unit_details:
        punitType['attack_strength'] +
        ', ' +
        punitType['defense_strength'] +
        ', ' +
        punitType['firepower'],
      sprite: w.get_unit_type_image_sprite(punitType),
    });
  }

  for (const improvementId in w.improvements) {
    const pimprovement = w.improvements[improvementId];
    let buildCost: string | number = pimprovement['build_cost'];
    if (pimprovement['name'] === 'Coinage') buildCost = '-';
    productionList.push({
      kind: VUT_IMPROVEMENT,
      value: pimprovement['id'],
      text: pimprovement['name'],
      helptext: pimprovement['helptext'],
      rule_name: pimprovement['rule_name'],
      build_cost: buildCost,
      unit_details: '-',
      sprite: w.get_improvement_image_sprite(pimprovement),
    });
  }
  return productionList;
}

// ---------------------------------------------------------------------------
// Build capability queries
// ---------------------------------------------------------------------------

/** Return whether given city can build given unit, ignoring obsolete. */
export function canCityBuildUnitDirect(_pcity: any, _punittype: any): boolean {
  // TODO: implement
  return true;
}

/** Return whether given city can build given unit now. */
export function canCityBuildUnitNow(pcity: any, punittypeId: number): boolean {
  return (
    pcity != null &&
    typeof pcity['can_build_unit'] !== 'undefined' &&
    pcity['can_build_unit'].isSet(punittypeId)
  );
}

/** Return whether given city can build given improvement now. */
export function canCityBuildImprovementNow(
  pcity: any,
  pimproveId: number,
): boolean {
  return (
    pcity != null &&
    typeof pcity['can_build_improvement'] !== 'undefined' &&
    pcity['can_build_improvement'].isSet(pimproveId)
  );
}

/** Return whether given city can build given item. */
export function canCityBuildNow(
  pcity: any,
  kind: number | null,
  value: number | null,
): boolean {
  return (
    kind != null &&
    value != null &&
    (kind === VUT_UTYPE
      ? canCityBuildUnitNow(pcity, value)
      : canCityBuildImprovementNow(pcity, value))
  );
}

/** Return TRUE iff the city has this building in it. */
export function cityHasBuilding(pcity: any, improvementId: number): boolean {
  return (
    0 <= improvementId &&
    improvementId < w.ruleset_control.num_impr_types &&
    pcity['improvements'] &&
    pcity['improvements'].isSet(improvementId)
  );
}

/** Return TRUE iff the city has this improvement (by name). */
export function doesCityHaveImprovement(
  pcity: any,
  improvementName: string,
): boolean {
  if (pcity == null || pcity['improvements'] == null) return false;

  for (let z = 0; z < w.ruleset_control.num_impr_types; z++) {
    if (
      pcity['improvements'] != null &&
      pcity['improvements'].isSet(z) &&
      w.improvements[z] != null &&
      w.improvements[z]['name'] === improvementName
    ) {
      return true;
    }
  }
  return false;
}

/** Simplified check: can the city buy its current production? */
export function cityCanBuy(pcity: any): boolean {
  const improvement = w.improvements[pcity['production_value']];
  return (
    !pcity['did_buy'] &&
    pcity['turn_founded'] !== w.game_info?.['turn'] &&
    improvement['name'] !== 'Coinage'
  );
}

// ---------------------------------------------------------------------------
// City growth and state
// ---------------------------------------------------------------------------

/** Create text describing city growth. */
export function cityTurnsToGrowthText(pcity: any): string {
  const turns = pcity['granary_turns'];
  if (turns === 0) {
    return 'blocked';
  } else if (turns > 1000000) {
    return 'never';
  } else if (turns < 0) {
    return 'Starving in ' + Math.abs(turns) + ' turns';
  } else {
    return turns + ' turns';
  }
}

/** Return TRUE iff the city is unhappy. */
export function cityUnhappy(pcity: any): boolean {
  return (
    pcity['ppl_happy'][FEELING_FINAL] <
    pcity['ppl_unhappy'][FEELING_FINAL] +
      2 * pcity['ppl_angry'][FEELING_FINAL]
  );
}

/** Returns how many thousand citizens live in this city. */
export function cityPopulation(pcity: any): number {
  return pcity['size'] * (pcity['size'] + 1) * 5;
}

// ---------------------------------------------------------------------------
// City tile map functions
// ---------------------------------------------------------------------------

/**
 * Returns an index for a flat array containing x,y data.
 * dx,dy are displacements from the center, r is the "radius".
 */
export function dxyToCenterIndex(dx: number, dy: number, r: number): number {
  return (dx + r) * (2 * r + 1) + dy + r;
}

/** Converts from coordinate offset from city center to index. */
export function getCityDxyToIndex(dx: number, dy: number, pcity: any): number {
  buildCityTileMap(pcity.city_radius_sq);
  const cityTileMapIndex = dxyToCenterIndex(dx, dy, cityTileMap!.radius);
  const ctile = cityTile(w.active_city);
  return getCityTileMapForPos(ctile.x, ctile.y)[cityTileMapIndex];
}

/** Builds city_tile_map info for a given squared city radius. */
export function buildCityTileMap(radiusSq: number): void {
  if (cityTileMap == null || cityTileMap.radius_sq < radiusSq) {
    const r = Math.floor(Math.sqrt(radiusSq));
    const vectors: number[][] = [];

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const dSq = w.map_vector_to_sq_distance(dx, dy);
        if (dSq <= radiusSq) {
          vectors.push([dx, dy, dSq, dxyToCenterIndex(dx, dy, r)]);
        }
      }
    }

    vectors.sort(function (a, b) {
      let d = a[2] - b[2];
      if (d !== 0) return d;
      d = a[0] - b[0];
      if (d !== 0) return d;
      return a[1] - b[1];
    });

    const baseMap: number[] = [];
    for (let i = 0; i < vectors.length; i++) {
      baseMap[vectors[i][3]] = i;
    }

    cityTileMap = {
      radius_sq: radiusSq,
      radius: r,
      base_sorted: vectors,
      maps: [baseMap],
    };

    // Also update the legacy global
    w.city_tile_map = cityTileMap;
  }
}

/**
 * Helper for get_city_tile_map_for_pos.
 * From position, radius and size, returns [delta_min, delta_max, clipped_index].
 */
export function deltaTileHelper(
  pos: number,
  r: number,
  size: number,
): [number, number, number] {
  const dMin = -pos;
  const dMax = size - 1 - pos;
  let i = 0;
  if (dMin > -r) {
    i = r + dMin;
  } else if (dMax < r) {
    i = 2 * r - dMax;
  }
  return [dMin, dMax, i];
}

/** Builds the city_tile_map with the given delta limits. */
export function buildCityTileMapWithLimits(
  dxMin: number,
  dxMax: number,
  dyMin: number,
  dyMax: number,
): number[] {
  const clippedMap: number[] = [];
  const v = cityTileMap!.base_sorted;
  const vl = v.length;
  let index = 0;
  for (let vi = 0; vi < vl; vi++) {
    const tileData = v[vi];
    if (
      tileData[0] >= dxMin &&
      tileData[0] <= dxMax &&
      tileData[1] >= dyMin &&
      tileData[1] <= dyMax
    ) {
      clippedMap[tileData[3]] = index;
      index++;
    }
  }
  return clippedMap;
}

/**
 * Returns the mapping of position from city center to index in city_info.
 * Uses self-replacing function pattern based on map wrap flags.
 */
export function getCityTileMapForPos(x: number, y: number): number[] {
  if (w.wrap_has_flag(w.WRAP_X)) {
    if (w.wrap_has_flag(w.WRAP_Y)) {
      // Torus
      getCityTileMapForPos = function (_x: number, _y: number): number[] {
        return cityTileMap!.maps[0]!;
      };
    } else {
      // Cylinder with N-S axis
      getCityTileMapForPos = function (_x: number, y: number): number[] {
        const r = cityTileMap!.radius;
        const d = deltaTileHelper(y, r, w.map.ysize);
        if (cityTileMap!.maps[d[2]] == null) {
          const m = buildCityTileMapWithLimits(-r, r, d[0], d[1]);
          cityTileMap!.maps[d[2]] = m;
        }
        return cityTileMap!.maps[d[2]]!;
      };
    }
  } else {
    if (w.wrap_has_flag(w.WRAP_Y)) {
      // Cylinder with E-W axis
      getCityTileMapForPos = function (x: number, _y: number): number[] {
        const r = cityTileMap!.radius;
        const d = deltaTileHelper(x, r, w.map.xsize);
        if (cityTileMap!.maps[d[2]] == null) {
          const m = buildCityTileMapWithLimits(d[0], d[1], -r, r);
          cityTileMap!.maps[d[2]] = m;
        }
        return cityTileMap!.maps[d[2]]!;
      };
    } else {
      // Flat
      getCityTileMapForPos = function (x: number, y: number): number[] {
        const r = cityTileMap!.radius;
        const dx = deltaTileHelper(x, r, w.map.xsize);
        const dy = deltaTileHelper(y, r, w.map.ysize);
        const mapI = (2 * r + 1) * dx[2] + dy[2];
        if (cityTileMap!.maps[mapI] == null) {
          const m = buildCityTileMapWithLimits(dx[0], dx[1], dy[0], dy[1]);
          cityTileMap!.maps[mapI] = m;
        }
        return cityTileMap!.maps[mapI]!;
      };
    }
  }

  return getCityTileMapForPos(x, y);
}

// ---------------------------------------------------------------------------
// Trade routes
// ---------------------------------------------------------------------------

/** Shows traderoutes of active city (returns HTML string). */
export function showCityTraderoutes(): string {
  let msg: string;

  if (w.active_city == null) {
    return '';
  }

  const routes = w.city_trade_routes?.[w.active_city['id']];

  if (w.active_city['traderoute_count'] !== 0 && routes == null) {
    console.log(
      "Can't find the trade routes " +
        w.active_city['name'] +
        ' is said to have',
    );
    return '';
  }

  msg = '';
  for (let i = 0; i < w.active_city['traderoute_count']; i++) {
    if (routes[i] == null) continue;

    const tcityId = routes[i]['partner'];
    if (tcityId === 0 || tcityId == null) continue;

    let good = w.goods?.[routes[i]['goods']];
    if (good == null) {
      console.log('Missing good type ' + routes[i]['goods']);
      good = { name: 'Unknown' };
    }

    const tcity = w.cities[tcityId];
    if (tcity == null) continue;
    msg += good['name'] + ' trade with ' + tcity['name'];
    msg += ' gives ' + routes[i]['value'] + ' gold each turn.<br>';
  }

  if (msg === '') {
    msg = 'No traderoutes.';
    msg += ' (Open the Manual, select Economy and then Trade ';
    msg += 'if you want to learn more about trade and trade routes.)';
  }

  // Also update the DOM if the element exists
  const el = w.document?.getElementById('city_traderoutes_tab');
  if (el) el.innerHTML = msg;

  return msg;
}

// ---------------------------------------------------------------------------
// 3D model helpers
// ---------------------------------------------------------------------------

/** Returns the 3d model name for the given city. */
export function cityTo3dModelName(pcity: any): string {
  let size = 0;
  if (pcity['size'] >= 3 && pcity['size'] <= 6) {
    size = 1;
  } else if (pcity['size'] > 6 && pcity['size'] <= 9) {
    size = 2;
  } else if (pcity['size'] > 9 && pcity['size'] <= 11) {
    size = 3;
  } else if (pcity['size'] > 11) {
    size = 4;
  }

  let styleId = pcity['style'];
  if (styleId === -1) styleId = 0;
  const cityRule = w.city_rules[styleId];

  let cityStyleName = 'european';
  if (
    cityRule['rule_name'] === 'Industrial' ||
    cityRule['rule_name'] === 'ElectricAge' ||
    cityRule['rule_name'] === 'Modern' ||
    cityRule['rule_name'] === 'PostModern' ||
    cityRule['rule_name'] === 'Asian'
  ) {
    cityStyleName = 'modern';
  }

  return 'city_' + cityStyleName + '_' + size;
}

/** Returns the city walls scale for the given city. */
export function getCitywallsScale(pcity: any): number {
  let scale = 8;
  if (pcity['size'] >= 3 && pcity['size'] <= 6) {
    scale = 9;
  } else if (pcity['size'] > 6 && pcity['size'] <= 9) {
    scale = 10;
  } else if (pcity['size'] > 9 && pcity['size'] <= 11) {
    scale = 11;
  } else if (pcity['size'] > 11) {
    scale = 12;
  }
  return scale;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------

// Constants
// Basic queries
// Production queries
// Build capability
// Growth and state
// Tile map
// Trade routes
// 3D model helpers
