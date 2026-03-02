/**
 * XBWorld Web Client — Main entry point.
 * Bootstraps the entire application using ES modules.
 */

import { store } from './data/store';
import { globalEvents } from './core/events';
import { handlePacket } from './net/packets';
import { PixiRenderer } from './renderer/PixiRenderer';
import { initChat } from './ui/chat';
import { initControls } from './ui/controls';
import { initStatusPanel } from './ui/statusPanel';
import { initPregame, initCommonIntroDialog } from './ui/pregame';
import { audioManager } from './audio/AudioManager';
import { showAlert, showMessage } from './ui/dialogs';
import { $id, ready, on, show, hide } from './utils/dom';
import { getUrlVar } from './utils/helpers';
import { logNormal } from './core/log';

let renderer: PixiRenderer | null = null;

async function init(): Promise<void> {
  logNormal('XBWorld Web Client initializing...');

  store.gameType = getUrlVar('type') ?? 'singleplayer';
  store.observing = getUrlVar('action') === 'observe';

  // Wire up global event handlers
  globalEvents.on('packet:received', handlePacket);

  globalEvents.on<{ title: string; text: string; type: string }>('ui:alert', (data) => {
    if (data) showAlert(data.title, data.text, data.type as 'info' | 'error');
  });

  globalEvents.on<{ title: string; message: string }>('ui:dialog', (data) => {
    if (data) showMessage(data.title, data.message);
  });

  // Initialize subsystems
  initChat();
  initControls();
  initStatusPanel();
  initPregame();
  audioManager.init();

  // Initialize PixiJS renderer
  const canvasDiv = $id('canvas_div');
  if (canvasDiv) {
    renderer = new PixiRenderer({
      tileWidth: 96,
      tileHeight: 48,
      container: canvasDiv,
    });
    await renderer.init();
    logNormal('PixiJS renderer ready');
  }

  // Set up tab navigation (replacing jQuery UI tabs)
  initTabs();

  // Setup window resize handler
  on(window, 'resize', handleResize);
  handleResize();

  // Show intro dialog
  initCommonIntroDialog();

  // Handle game start
  globalEvents.on('game:beginturn', () => {
    const pregame = $id('pregame_page');
    const gamePage = $id('game_page');
    if (pregame) hide(pregame);
    if (gamePage) show(gamePage);
    renderer?.renderAll();
  });

  // Center on first visible tile when map loads
  globalEvents.on('map:allocated', () => {
    if (renderer) {
      const firstTile = Object.values(store.tiles).find((t) => t.known === 2);
      if (firstTile) renderer.centerOnTile(firstTile);
    }
  });

  // Focus unit → center map
  globalEvents.on<number>('unit:focus', (unitId) => {
    if (unitId == null || !renderer) return;
    const unit = store.units[unitId];
    if (!unit) return;
    const tile = store.tiles[unit.tile];
    if (tile) renderer.centerOnTile(tile);
  });

  logNormal('XBWorld Web Client initialized');
}

function initTabs(): void {
  const tabLinks = document.querySelectorAll('#tabs_menu a[href^="#tabs-"]');
  const tabPanels = document.querySelectorAll('[id^="tabs-"]');

  tabLinks.forEach((link) => {
    on(link as HTMLElement, 'click', (e: MouseEvent) => {
      e.preventDefault();
      const href = (link as HTMLAnchorElement).getAttribute('href');
      if (!href) return;

      tabPanels.forEach((panel) => {
        (panel as HTMLElement).style.display = 'none';
      });
      tabLinks.forEach((l) => {
        l.parentElement?.classList.remove('ui-state-active');
      });

      const target = document.querySelector(href) as HTMLElement;
      if (target) target.style.display = '';
      link.parentElement?.classList.add('ui-state-active');

      if (href === '#tabs-map') {
        renderer?.renderAll();
      }
    });
  });

  // Show map tab by default
  tabPanels.forEach((panel, i) => {
    (panel as HTMLElement).style.display = i === 0 ? '' : 'none';
  });
}

function handleResize(): void {
  const tabs = $id('tabs');
  if (tabs) {
    tabs.style.height = `${window.innerHeight}px`;
  }
}

ready(init);
