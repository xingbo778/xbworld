/**
 * Civ client initialisation — migrated from civclient.js (Phase 9.3).
 *
 * Covers all 7 functions in civclient.js:
 *   civclient_init, init_common_intro_dialog, close_dialog_message,
 *   closing_dialog_message, show_dialog_message, show_auth_dialog,
 *   switch_renderer.
 *
 * Global state variables declared in civclient.js (client, client_frozen,
 * phase_start_time, debug_active, autostart, username, fc_seedrandom,
 * game_type, music_list, audio, audio_enabled, last_turn_change_time,
 * turn_change_elapsed, seconds_to_phasedone, seconds_to_phasedone_sync,
 * dialog_close_trigger, dialog_message_close_task, RENDERER_2DCANVAS,
 * RENDERER_WEBGL, renderer) remain as legacy globals while civclient.js
 * is still loaded. Guards below initialise them once civclient.js is removed.
 */

import { exposeToLegacy } from '../bridge/legacy';

const w = window as any;

// ---------------------------------------------------------------------------
// Global state guards (active once civclient.js is deleted)
// ---------------------------------------------------------------------------
if (w.client === undefined || Object.keys(w.client).length === 0) {
  // Only set if truly absent — civclient.js sets this to {}
  if (w.client === undefined) w.client = {};
}
if (w.client_frozen === undefined)          w.client_frozen = false;
if (w.phase_start_time === undefined)       w.phase_start_time = 0;
if (w.debug_active === undefined)           w.debug_active = false;
if (w.autostart === undefined)              w.autostart = false;
if (w.username === undefined)               w.username = null;
if (w.fc_seedrandom === undefined)          w.fc_seedrandom = null;
if (w.game_type === undefined)              w.game_type = '';
if (w.audio === undefined)                  w.audio = null;
if (w.audio_enabled === undefined)          w.audio_enabled = false;
if (w.last_turn_change_time === undefined)  w.last_turn_change_time = 0;
if (w.turn_change_elapsed === undefined)    w.turn_change_elapsed = 0;
if (w.seconds_to_phasedone === undefined)   w.seconds_to_phasedone = 0;
if (w.seconds_to_phasedone_sync === undefined) w.seconds_to_phasedone_sync = 0;
if (w.dialog_close_trigger === undefined)   w.dialog_close_trigger = '';
if (w.dialog_message_close_task === undefined) w.dialog_message_close_task = undefined;
if (w.RENDERER_2DCANVAS === undefined)      w.RENDERER_2DCANVAS = 1;
if (w.RENDERER_WEBGL === undefined)         w.RENDERER_WEBGL = 2;
if (w.renderer === undefined)               w.renderer = w.RENDERER_2DCANVAS;
if (!w.music_list) {
  w.music_list = [
    'battle-epic', 'battle2', 'battle3', 'battle4',
    'battle5', 'battle6', 'battle7', 'battle8'
  ];
}

// ---------------------------------------------------------------------------
// civclient_init
// ---------------------------------------------------------------------------

/**
 * Main client initialisation — called from index.html $(document).ready.
 */
export function civClientInit(): void {
  w.$.blockUI.defaults['css']['backgroundColor'] = '#222';
  w.$.blockUI.defaults['css']['color'] = '#fff';
  w.$.blockUI.defaults['theme'] = true;

  const action = w.$.getUrlVar('action');
  w.game_type = w.$.getUrlVar('type');
  if (w.game_type == null) {
    if (action === 'pbem') {
      w.game_type = 'pbem';
    } else {
      w.game_type = 'singleplayer';
    }
  }

  if (action === 'observe') {
    w.observing = true;
    w.$('#civ_tab').remove();
    w.$('#cities_tab').remove();
    w.$('#pregame_buttons').remove();
    w.$('#game_unit_orders_default').remove();
    w.$('#civ_dialog').remove();
  }

  // Initialise seeded random number generator
  w.fc_seedrandom = new (w.Math.seedrandom || w.seedrandom)('xbworld');

  if (window.requestAnimationFrame == null) {
    if (typeof w.swal === 'function') w.swal('Please upgrade your browser.');
    return;
  }

  if ((w.is_longturn && w.is_longturn()) && w.observing) {
    if (typeof w.swal === 'function') w.swal("LongTurn games can't be observed.");
    return;
  }

  if (typeof w.init_mapview === 'function') w.init_mapview();
  if (typeof w.game_init === 'function') w.game_init();
  w.$('#tabs').tabs({ heightStyle: 'fill' });
  if (typeof w.control_init === 'function') w.control_init();
  if (typeof w.init_replay === 'function') w.init_replay();

  w.timeoutTimerId = setInterval(function () {
    if (typeof w.update_timeout === 'function') w.update_timeout();
  }, 1000);
  if (typeof w.update_game_status_panel === 'function') w.update_game_status_panel();
  w.statusTimerId = setInterval(function () {
    if (typeof w.update_game_status_panel === 'function') w.update_game_status_panel();
  }, 6000);

  if (w.overviewTimerId === -1) {
    w.OVERVIEW_REFRESH = (w.renderer === w.RENDERER_WEBGL) ? 12000 : 6000;
    w.overviewTimerId = setInterval(function () {
      if (typeof w.redraw_overview === 'function') w.redraw_overview();
    }, w.OVERVIEW_REFRESH);
  }

  if (typeof w.motd_init === 'function') w.motd_init();

  // IE polyfill for Array.indexOf (kept for historical compatibility)
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj: unknown): number {
      for (let i = 0; i < this.length; i++) {
        if (this[i] === obj) return i;
      }
      return -1;
    };
  }

  w.$('#tabs').css('height', w.$(window).height());
  w.$('#tabs-map').height('auto');
  w.$('#tabs-civ').height('auto');
  w.$('#tabs-tec').height('auto');
  w.$('#tabs-nat').height('auto');
  w.$('#tabs-cities').height('auto');
  w.$('#tabs-opt').height('auto');
  w.$('#tabs-hel').height('auto');
  w.$('.button').button();

  w.sounds_enabled = w.simpleStorage.get('sndFX');
  if (w.sounds_enabled == null) {
    // Default to true, except when known to be problematic.
    w.sounds_enabled = (w.platform?.name === 'Safari') ? false : true;
  }

  /* Initialise audio.js music player */
  if (w.audiojs) {
    w.audiojs.events.ready(function () {
      const as = w.audiojs.createAll({
        trackEnded: function () {
          const list: string[] = w.music_list;
          const track = list[Math.floor(Math.random() * list.length)];
          const ext = (typeof w.supports_mp3 === 'function' && !w.supports_mp3()) ? '.ogg' : '.mp3';
          if (w.audio) {
            w.audio.load('/music/' + track + ext);
            w.audio.play();
          }
        }
      });
      w.audio = as[0];
    });
  }

  if (typeof w.init_common_intro_dialog === 'function') w.init_common_intro_dialog();
  if (typeof w.setup_window_size === 'function') w.setup_window_size();
}

// ---------------------------------------------------------------------------
// init_common_intro_dialog
// ---------------------------------------------------------------------------

/**
 * Shows an intro dialog depending on game type.
 */
export function initCommonIntroDialog(): void {
  const action = w.$.getUrlVar('action');

  if (w.observing) {
    if (typeof w.show_intro_dialog === 'function') {
      w.show_intro_dialog('Welcome to XBWorld', 'You have joined the game as an observer. Please enter your name:');
    }
    w.$('#turn_done_button').button('option', 'disabled', true);
  } else if (action === 'pbem') {
    if (typeof w.show_pbem_dialog === 'function') w.show_pbem_dialog();
  } else if (action === 'hotseat') {
    if (typeof w.show_hotseat_dialog === 'function') w.show_hotseat_dialog();
  } else if (w.is_small_screen && w.is_small_screen()) {
    if (w.is_longturn && w.is_longturn()) {
      setTimeout(function () {
        if (typeof w.show_longturn_intro_dialog === 'function') w.show_longturn_intro_dialog();
      }, 300);
    } else {
      if (typeof w.show_intro_dialog === 'function') {
        w.show_intro_dialog('Welcome to XBWorld', 'You are about to join the game. Please enter your name:');
      }
    }
  } else if (action === 'earthload') {
    if (typeof w.show_intro_dialog === 'function') {
      w.show_intro_dialog('Welcome to XBWorld',
        'You can now play XBWorld on the earth map you have chosen. Please enter your name: ');
    }
  } else if (action === 'load') {
    if (typeof w.show_intro_dialog === 'function') {
      w.show_intro_dialog('Welcome to XBWorld',
        'You are about to join this game server, where you can ' +
        'load a savegame, tutorial, custom map generated from an image or a historical scenario map. ' +
        'Please enter your name: ');
    }
  } else if (action === 'multi') {
    if (w.is_longturn && w.is_longturn()) {
      setTimeout(function () {
        if (typeof w.show_longturn_intro_dialog === 'function') w.show_longturn_intro_dialog();
      }, 300);
    } else {
      if (typeof w.show_intro_dialog === 'function') {
        const msg = 'You are about to join this game server, where you can ' +
          'participate in a multiplayer game. You can customize the game ' +
          'settings, and wait for the minimum number of players before ' +
          'the game can start. ';
        w.show_intro_dialog('Welcome to XBWorld', msg);
      }
    }
  } else if (action === 'hack') {
    let hack_port: string | null = null;
    let hack_username: string | null = null;

    if (w.$.getUrlVar('civserverport') != null) {
      hack_port = w.$.getUrlVar('civserverport');
    } else {
      if (typeof w.show_intro_dialog === 'function') {
        w.show_intro_dialog('Welcome to XBWorld',
          'Hack mode disabled because civserverport wasn\'t specified. Falling back to regular mode.');
      }
      return;
    }

    if (w.$.getUrlVar('username') != null) {
      hack_username = w.$.getUrlVar('username');
    } else if (w.simpleStorage.hasKey('username')) {
      hack_username = w.simpleStorage.get('username');
    } else {
      if (typeof w.show_intro_dialog === 'function') {
        w.show_intro_dialog('Welcome to XBWorld',
          'Hack mode disabled because "username" wasn\'t specified and no ' +
          'stored user name was found. Falling back to regular mode.');
      }
      return;
    }

    if (w.$.getUrlVar('autostart') === 'true') {
      w.autostart = true;
    }

    if (typeof w.network_init_manual_hack === 'function') {
      w.network_init_manual_hack(hack_port, hack_username, w.$.getUrlVar('savegame'));
    }
  } else {
    if (typeof w.show_intro_dialog === 'function') {
      w.show_intro_dialog('Welcome to XBWorld',
        'You are about to join this game server, where you can ' +
        'play a singleplayer game against the XBWorld AI. You can ' +
        'start the game directly by entering any name, or customize the game settings. ' +
        'Creating a user account is optional, but savegame support requires that you create a user account. ' +
        '(<a class=\'pwd_reset\' href=\'#\' style=\'color: #555555;\'>Forgot password?</a>) Have fun! <br>' +
        'Please enter your name: ');
      w.$('.pwd_reset').click(function () {
        if (typeof w.forgot_pbem_password === 'function') w.forgot_pbem_password();
      });
    }
  }
}

// ---------------------------------------------------------------------------
// close_dialog_message / closing_dialog_message
// ---------------------------------------------------------------------------

/**
 * Closes the generic message dialog.
 */
export function closeDialogMessage(): void {
  w.$('#generic_dialog').dialog('close');
}

/**
 * Cleanup callback when the generic message dialog is closing.
 */
export function closingDialogMessage(): void {
  clearTimeout(w.dialog_message_close_task);
  w.$('#game_text_input').blur();
}

// ---------------------------------------------------------------------------
// show_dialog_message
// ---------------------------------------------------------------------------

/**
 * Shows a generic message dialog with auto-close after 24 seconds.
 */
export function showDialogMessage(title: string, message: string): void {
  w.$('#generic_dialog').remove();
  w.$("<div id='generic_dialog'></div>").appendTo('div#game_page');
  if (typeof w.speak === 'function') w.speak(title);
  if (typeof w.speak === 'function') w.speak(message);
  w.$('#generic_dialog').html(message);
  w.$('#generic_dialog').attr('title', title);
  w.$('#generic_dialog').dialog({
    bgiframe: true,
    modal: false,
    width: (w.is_small_screen && w.is_small_screen()) ? '90%' : '50%',
    close: function () { if (typeof w.closing_dialog_message === 'function') w.closing_dialog_message(); },
    buttons: {
      Ok: function () { if (typeof w.close_dialog_message === 'function') w.close_dialog_message(); }
    }
  }).dialogExtend({
    minimizable: true,
    closable: true,
    icons: {
      minimize: 'ui-icon-circle-minus',
      restore: 'ui-icon-bullet'
    }
  });
  w.$('#generic_dialog').dialog('open');
  w.$('#game_text_input').blur();
  // Auto-close after 24 seconds
  w.dialog_message_close_task = setTimeout(function () {
    if (typeof w.close_dialog_message === 'function') w.close_dialog_message();
  }, 24000);
  w.$('#generic_dialog').css('max-height', '450px');
}

// ---------------------------------------------------------------------------
// show_auth_dialog
// ---------------------------------------------------------------------------

/**
 * Shows the authentication/password dialog for private servers.
 */
export function showAuthDialog(packet: any): void {
  w.$('#dialog').remove();
  w.$("<div id='dialog'></div>").appendTo('div#game_page');
  const intro_html = packet['message'] +
    "<br><br> Password: <input id='password_req' type='text' size='25'>";
  w.$('#dialog').html(intro_html);
  w.$('#dialog').attr('title', 'Private server needs password to enter');
  w.$('#dialog').dialog({
    bgiframe: true,
    modal: true,
    width: (w.is_small_screen && w.is_small_screen()) ? '80%' : '60%',
    buttons: {
      Ok: function () {
        const pwd_packet = {
          pid: w.packet_authentication_reply,
          password: w.$('#password_req').val()
        };
        if (typeof w.send_request === 'function') w.send_request(JSON.stringify(pwd_packet));
        w.$('#dialog').dialog('close');
      }
    }
  });
  w.$('#dialog').dialog('open');
}

// ---------------------------------------------------------------------------
// switch_renderer
// ---------------------------------------------------------------------------

/**
 * Toggles between 2D isometric and 3D WebGL renderer.
 */
export function switchRenderer(): void {
  w.$('#canvas_div').unbind();

  if (w.renderer === w.RENDERER_WEBGL) {
    // Activate 2D isometric renderer
    w.renderer = w.RENDERER_2DCANVAS;
    w.$('#canvas_div').empty();
    if (typeof w.init_mapview === 'function') w.init_mapview();
    if (typeof w.set_default_mapview_active === 'function') w.set_default_mapview_active();
    if (typeof w.update_map_canvas_check === 'function') {
      requestAnimationFrame(function () { w.update_map_canvas_check(); });
    }
    if (typeof w.mapctrl_init_2d === 'function') w.mapctrl_init_2d();

    // Center on first known tile
    if (w.tiles) {
      for (const tile_id in w.tiles) {
        if (typeof w.tile_get_known === 'function' &&
            w.tile_get_known(w.tiles[tile_id]) === w.TILE_KNOWN_SEEN) {
          if (typeof w.center_tile_mapcanvas === 'function') w.center_tile_mapcanvas(w.tiles[tile_id]);
          break;
        }
      }
    }

    // Reset 3D WebGL data
    if (w.tiles) {
      for (const tile_id in w.tiles) {
        w.tiles[tile_id]['height'] = 0;
      }
    }
    w.scene = null;
    w.heightmap = {};
    w.unit_positions = {};
    w.city_positions = {};
    w.city_label_positions = {};
    w.city_walls_positions = {};
    w.unit_flag_positions = {};
    w.unit_label_positions = {};
    w.unit_activities_positions = {};
    w.unit_health_positions = {};
    w.unit_healthpercentage_positions = {};
    w.forest_positions = {};
    w.jungle_positions = {};
    w.tile_extra_positions = {};
    w.road_positions = {};
    w.rail_positions = {};
    w.river_positions = {};
    w.tiletype_palette = [];
    w.meshes = {};
    w.load_count = 0;
  } else {
    // Activate 3D WebGL renderer
    w.renderer = w.RENDERER_WEBGL;
    w.load_count = 0;
    w.mapview_model_width  = Math.floor(w.MAPVIEW_ASPECT_FACTOR * w.map['xsize']);
    w.mapview_model_height = Math.floor(w.MAPVIEW_ASPECT_FACTOR * w.map['ysize']);
    if (typeof w.set_default_mapview_active === 'function') w.set_default_mapview_active();
    if (typeof w.init_webgl_renderer === 'function') w.init_webgl_renderer();
  }

  // Re-register context menu for the new renderer target
  if (w.$.contextMenu) {
    w.$.contextMenu({
      selector: (w.renderer === w.RENDERER_2DCANVAS) ? '#canvas' : '#canvas_div',
      zIndex: 5000,
      autoHide: true,
      callback: function (key: string) {
        if (typeof w.handle_context_menu_callback === 'function') w.handle_context_menu_callback(key);
      },
      build: function (_$trigger: unknown, _e: unknown) {
        if (!w.context_menu_active) {
          w.context_menu_active = true;
          return false;
        }
        const unit_actions = typeof w.update_unit_order_commands === 'function'
          ? w.update_unit_order_commands()
          : {};
        return {
          callback: function (key: string) {
            if (typeof w.handle_context_menu_callback === 'function') w.handle_context_menu_callback(key);
          },
          items: unit_actions
        };
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('civclient_init',           civClientInit);
exposeToLegacy('init_common_intro_dialog', initCommonIntroDialog);
exposeToLegacy('close_dialog_message',     closeDialogMessage);
exposeToLegacy('closing_dialog_message',   closingDialogMessage);
exposeToLegacy('show_dialog_message',      showDialogMessage);
exposeToLegacy('show_auth_dialog',         showAuthDialog);
exposeToLegacy('switch_renderer',          switchRenderer);
