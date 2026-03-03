/**
 * Game status panel (top bar showing gold, year, rates, etc).
 * Migrated from game.js update_game_status_panel.
 */

import { store } from '../data/store';
import { $id, setHtml, show, hide, setCSS } from '../utils/dom';
import { numberWithCommas, isSmallScreen } from '../utils/helpers';
import { globalEvents } from '../core/events';

export function initStatusPanel(): void {
  globalEvents.on('game:info', updateGameStatusPanel);
  globalEvents.on('game:beginturn', updateGameStatusPanel);
  setInterval(updateGameStatusPanel, 6000);
}

export function updateGameStatusPanel(): void {
  if (!store.gameInfo) return;

  const player = store.client.conn.playing;
  let html = '';

  if (player) {
    const nation = store.nations[player.nation];
    const adj = nation?.adjective ?? '';
    const tax = player.tax;
    const lux = player.luxury;
    const sci = player.science;
    const netIncome =
      player.expected_income >= 0 ? `+${player.expected_income}` : `${player.expected_income}`;
    const negClass = player.expected_income < 0 ? ' class="negative_net_income"' : '';

    if (!isSmallScreen()) {
      const pop = civPopulation(player.playerno);
      html += `<b>${adj}</b> &nbsp;&nbsp; <i class="fa fa-child" title="Population"></i>: <b>${pop}</b> &nbsp;&nbsp;`;
      html += `<i class="fa fa-clock-o" title="Year"></i>: <b>${getYearString()}</b> &nbsp;&nbsp;`;
    }
    html += `<i class="fa fa-money" title="Gold"></i>: <b${negClass}>${player.gold} (${netIncome})</b> &nbsp;&nbsp;`;
    html += `<span style="cursor:pointer" data-action="taxrates">`;
    html += `<i class="fa fa-btc" title="Tax"></i>: <b>${tax}</b>% `;
    html += `<i class="fa fa-music" title="Luxury"></i>: <b>${lux}</b>% `;
    html += `<i class="fa fa-flask" title="Science"></i>: <b>${sci}</b>%</span>`;
  } else if (store.serverSettings['metamessage']) {
    html += `${(store.serverSettings['metamessage'] as { val: string }).val} Observing - `;
    html += `Turn: <b>${store.gameInfo.turn}</b>`;
  }

  const panelTop = $id('game_status_panel_top');
  const panelBottom = $id('game_status_panel_bottom');

  if (window.innerWidth > 800) {
    if (panelTop) {
      show(panelTop);
      setHtml(panelTop, html);
    }
    if (panelBottom) hide(panelBottom);
  } else {
    if (panelTop) hide(panelTop);
    if (panelBottom) {
      show(panelBottom);
      setCSS(panelBottom, { width: `${window.innerWidth}px` });
      setHtml(panelBottom, html);
    }
  }

  document.title = `XBWorld - ${store.username ?? ''} (turn:${store.gameInfo.turn})`;
}

function civPopulation(playerno: number): string {
  let pop = 0;
  for (const city of Object.values(store.cities)) {
    if (city.owner === playerno) {
      pop += city.size * 10000;
    }
  }
  return numberWithCommas(pop);
}

export function getYearString(): string {
  const gi = store.gameInfo;
  if (!gi) return '';
  const ci = store.calendarInfo;
  let year = '';
  if (gi.year < 0) {
    year = `${Math.abs(gi.year)}${ci?.negative_year_label ?? ' BC'}`;
  } else {
    year = `${gi.year}${ci?.positive_year_label ?? ' AD'}`;
  }
  return isSmallScreen() ? `${year} (T:${gi.turn})` : `${year} (Turn:${gi.turn})`;
}

export function currentTurnTimeout(): number {
  const gi = store.gameInfo;
  if (!gi) return 0;
  if (gi.turn === 1 && gi.first_timeout !== -1) return gi.first_timeout;
  return gi.timeout;
}
