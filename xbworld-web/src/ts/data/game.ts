import type { City } from './types';
import { exposeToLegacy } from '../bridge/legacy';

export const IDENTITY_NUMBER_ZERO = 0;

export function game_init(): void {
  map = {} as typeof map;
  terrains = {};
  resources = {};
  players = {};
  units = {};
  unit_types = {};
  connections = {};
  client.conn = {} as typeof client.conn;
}

export function game_find_city_by_number(id: number): City | undefined {
  return cities[id];
}

export function game_find_unit_by_number(id: number): any {
  return units[id];
}

export function civ_population(playerno: number): string {
  let population = 0;

  for (const city_id in cities) {
    const pcity = cities[city_id];
    if (playerno === pcity['owner']) {
      population += city_population(pcity);
    }
  }
  return numberWithCommas(population * 1000);
}

export function update_game_status_panel(): void {
  if (C_S_RUNNING !== client_state()) return;

  let status_html = '';

  if (client.conn.playing != null) {
    const pplayer = client.conn.playing;
    const tax = client.conn.playing['tax'];
    const lux = client.conn.playing['luxury'];
    const sci = client.conn.playing['science'];

    let net_income: string | number = pplayer['expected_income'];
    if (pplayer['expected_income'] > 0) {
      net_income = '+' + pplayer['expected_income'];
    }

    if (!is_small_screen())
      status_html +=
        '<b>' +
        nations[pplayer['nation']]['adjective'] +
        "</b> &nbsp;&nbsp; <i class='fa fa-child' aria-hidden='true' title='Population'></i>: ";
    if (!is_small_screen())
      status_html += '<b>' + civ_population(client.conn.playing.playerno) + '</b>  &nbsp;&nbsp;';
    if (!is_small_screen())
      status_html +=
        "<i class='fa fa-clock-o' aria-hidden='true' title='Year (turn)'></i>: <b>" +
        get_year_string() +
        '</b> &nbsp;&nbsp;';
    status_html += "<i class='fa fa-money' aria-hidden='true' title='Gold (net income)'></i>: ";
    if (pplayer['expected_income'] >= 0) {
      status_html += "<b title='Gold (net income)'>";
    } else {
      status_html += "<b class='negative_net_income' title='Gold (net income)'>";
    }
    status_html += pplayer['gold'] + ' (' + net_income + ')</b>  &nbsp;&nbsp;';
    status_html +=
      "<span style='cursor:pointer;' onclick='javascript:show_tax_rates_dialog();'><i class='fa fa-btc' aria-hidden='true' title='Tax rate'></i>: <b>" +
      tax +
      '</b>% ';
    status_html +=
      "<i class='fa fa-music' aria-hidden='true' title='Luxury rate'></i>: <b>" + lux + '</b>% ';
    status_html +=
      "<i class='fa fa-flask' aria-hidden='true' title='Science rate'></i>: <b>" +
      sci +
      '</b>%</span> ';
  } else if (server_settings != null && server_settings['metamessage'] != null) {
    status_html += server_settings['metamessage']['val'] + ' Observing - ';
    status_html += 'Turn: <b>' + game_info!['turn'] + '</b>  ';
  }

  const panelTop = document.getElementById('game_status_panel_top');
  const panelBottom = document.getElementById('game_status_panel_bottom');

  if (window.innerWidth - sum_width() > 800) {
    if (panelTop) {
      panelTop.style.display = '';
      panelTop.innerHTML = status_html;
    }
    if (panelBottom) {
      panelBottom.style.display = 'none';
    }
  } else {
    if (panelTop) {
      panelTop.style.display = 'none';
    }
    if (panelBottom) {
      panelBottom.style.display = '';
      panelBottom.style.width = window.innerWidth + 'px';
      panelBottom.innerHTML = status_html;
    }
  }

  let page_title =
    'XBWorld - ' + username + '  (turn:' + game_info!['turn'] + ', port:' + civserverport + ') ';
  if (server_settings['metamessage'] != null) {
    page_title += server_settings['metamessage']['val'];
  }
  document.title = page_title;
}

export function get_year_string(): string {
  let year_string = '';
  if (game_info!['year'] < 0) {
    year_string = Math.abs(game_info!['year']) + calendar_info!['negative_year_label'] + ' ';
  } else if (game_info!['year'] >= 0) {
    year_string = game_info!['year'] + calendar_info!['positive_year_label'] + ' ';
  }
  if (is_small_screen()) {
    year_string += '(T:' + game_info!['turn'] + ')';
  } else {
    year_string += '(Turn:' + game_info!['turn'] + ')';
  }
  return year_string;
}

export function current_turn_timeout(): number {
  if (game_info!['turn'] === 1 && game_info!['first_timeout'] !== -1) {
    return game_info!['first_timeout'];
  } else {
    return game_info!['timeout'];
  }
}

export function sum_width(): number {
  let sum = 0;
  const tabsMenu = document.getElementById('tabs_menu');
  if (tabsMenu) {
    for (const child of Array.from(tabsMenu.children) as HTMLElement[]) {
      if (child.offsetParent !== null && child.id !== 'game_status_panel_top') {
        sum += child.offsetWidth;
      }
    }
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Expose to legacy JS via window
// ---------------------------------------------------------------------------
exposeToLegacy('IDENTITY_NUMBER_ZERO', IDENTITY_NUMBER_ZERO);
exposeToLegacy('game_init', game_init);
exposeToLegacy('game_find_city_by_number', game_find_city_by_number);
exposeToLegacy('game_find_unit_by_number', game_find_unit_by_number);
exposeToLegacy('civ_population', civ_population);
exposeToLegacy('update_game_status_panel', update_game_status_panel);
exposeToLegacy('get_year_string', get_year_string);
exposeToLegacy('current_turn_timeout', current_turn_timeout);
exposeToLegacy('sum_width', sum_width);
