/**
 * Pregame lobby UI.
 * Migrated from pregame.js — handles intro dialogs, nation picker, game settings.
 */

import { store } from '../data/store';
import { $id, on, show } from '../utils/dom';
import { getUrlVar, isSmallScreen } from '../utils/helpers';
import { networkInit, networkInitManualHack, sendMessage } from '../net/connection';
import { showDialog, closeDialog } from './dialogs';

export function initPregame(): void {
  const startBtn = $id('start_game_button');
  const loadBtn = $id('load_game_button');
  const nationBtn = $id('pick_nation_button');
  const settingsBtn = $id('pregame_settings_button');

  if (startBtn) on(startBtn, 'click', () => sendMessage('/start'));
  if (loadBtn) on(loadBtn, 'click', showLoadDialog);
  if (nationBtn) on(nationBtn, 'click', showNationPicker);
  if (settingsBtn) on(settingsBtn, 'click', showGameSettings);
}

export function showIntroDialog(title: string, message: string): void {
  showDialog('intro_dialog', {
    title,
    content: `
      <p>${message}</p>
      <div style="margin-top: 12px;">
        <label for="username_req">Username:</label>
        <input id="username_req" type="text" maxlength="32" style="width: 200px; padding: 4px;" />
        <div id="username_validation_result" style="color: red; display: none;"></div>
      </div>
    `,
    modal: true,
    width: isSmallScreen() ? '90%' : '50%',
    buttons: {
      'Start Game': () => {
        const input = $id('username_req') as HTMLInputElement | null;
        if (!input) return;
        const name = input.value.trim();
        if (!name || name.length < 3) {
          const valResult = $id('username_validation_result');
          if (valResult) {
            valResult.textContent = 'Username must be at least 3 characters.';
            show(valResult);
          }
          return;
        }
        store.username = name;
        localStorage.setItem('username', name);
        closeDialog('intro_dialog');
        networkInit();
      },
    },
  });

  const savedName = localStorage.getItem('username');
  if (savedName) {
    const input = $id('username_req') as HTMLInputElement | null;
    if (input) input.value = savedName;
  }
}

export function initCommonIntroDialog(): void {
  const action = getUrlVar('action');

  if (store.observing) {
    showIntroDialog(
      'Welcome to XBWorld',
      'You have joined the game as an observer. Please enter your name:',
    );
    return;
  }

  if (action === 'hack') {
    const port = getUrlVar('civserverport');
    const user = getUrlVar('username') ?? localStorage.getItem('username');
    if (!port || !user) {
      showIntroDialog('Welcome to XBWorld', 'Hack mode disabled. Falling back to regular mode.');
      return;
    }
    if (getUrlVar('autostart') === 'true') store.autostart = true;
    networkInitManualHack(port, user, getUrlVar('savegame'));
    return;
  }

  if (action === 'multi') {
    showIntroDialog(
      'Welcome to XBWorld',
      'You are about to join a multiplayer game. Customize settings and wait for players.',
    );
  } else if (action === 'load') {
    showIntroDialog(
      'Welcome to XBWorld',
      'Load a savegame, tutorial, or scenario map. Please enter your name:',
    );
  } else {
    showIntroDialog(
      'Welcome to XBWorld',
      'Play a singleplayer game against the XBWorld AI. Enter your name to start:',
    );
  }
}

function showLoadDialog(): void {
  showDialog('load_dialog', {
    title: 'Load Game',
    content: '<p>Select a savegame to load:</p><div id="savegame_list"></div>',
    width: '60%',
    buttons: { Cancel: () => closeDialog('load_dialog') },
  });
}

function showNationPicker(): void {
  const nations = Object.values(store.nations);
  const html = nations
    .map((n) => `<div class="nation-option" data-id="${n.id}">${n.translation_name}</div>`)
    .join('');

  showDialog('nation_dialog', {
    title: 'Pick Nation',
    content: `<div class="nation-grid">${html}</div>`,
    width: '70%',
    buttons: { Cancel: () => closeDialog('nation_dialog') },
  });
}

function showGameSettings(): void {
  showDialog('settings_dialog', {
    title: 'Game Settings',
    content: '<div id="game_settings_form"><p>Game settings will appear here.</p></div>',
    width: '60%',
    buttons: { Cancel: () => closeDialog('settings_dialog') },
  });
}
