/**
 * Client main — migrated from client_main.js (Phase 9.2).
 *
 * Covers the 8 functions not yet in TS:
 *   set_client_state, setup_window_size, show_new_game_message,
 *   alert_war, show_endgame_dialog, update_metamessage_on_gamestart,
 *   update_metamessage_game_running_status, set_default_mapview_active.
 *
 * Global state variables (C_S_*, civclient_state, endgame_player_info,
 * height_offset, width_offset, mapview_canvas_ctx) remain as legacy globals
 * declared in client_main.js — they are NOT re-declared here to avoid
 * double-declaration conflicts while client_main.js is still loaded.
 * Once client_main.js is deleted, the `if (w.xxx === undefined)` guards
 * below will initialise them.
 */

import { exposeToLegacy } from '../bridge/legacy';

const w = window as any;

// ---------------------------------------------------------------------------
// Global state initialisation (guards for when client_main.js is removed)
// ---------------------------------------------------------------------------
if (w.C_S_INITIAL === undefined)    w.C_S_INITIAL    = 0;
if (w.C_S_PREPARING === undefined)  w.C_S_PREPARING  = 1;
if (w.C_S_RUNNING === undefined)    w.C_S_RUNNING    = 2;
if (w.C_S_OVER === undefined)       w.C_S_OVER       = 3;
if (w.civclient_state === undefined) w.civclient_state = w.C_S_INITIAL;
if (w.endgame_player_info === undefined) w.endgame_player_info = [];
if (w.height_offset === undefined)  w.height_offset  = 52;
if (w.width_offset === undefined)   w.width_offset   = 10;
// mapview_canvas_ctx is initialised by set_default_mapview_active at runtime

// ---------------------------------------------------------------------------
// set_client_state
// ---------------------------------------------------------------------------

/**
 * Sets the client state (initial, pre, running, over etc).
 * Mirrors the logic in client_main.js set_client_state().
 */
export function setClientState(newstate: number): void {
  if (w.civclient_state === newstate) return;
  w.civclient_state = newstate;

  switch (newstate) {
    case w.C_S_RUNNING:
      try {
        if (typeof w.clear_chatbox === 'function') w.clear_chatbox();
        if (typeof w.$.unblockUI === 'function') w.$.unblockUI();
        if (typeof w.show_new_game_message === 'function') w.show_new_game_message();
      } catch (e) {
        console.error('[set_client_state] Error in pre-page setup:', e);
      }
      if (typeof w.set_client_page === 'function') w.set_client_page(w.PAGE_GAME);
      if (typeof w.setup_window_size === 'function') w.setup_window_size();
      if (typeof w.update_metamessage_on_gamestart === 'function') w.update_metamessage_on_gamestart();
      if (w.is_pbem && w.is_pbem()) {
        setTimeout(function () {
          if (typeof w.set_human_pbem_players === 'function') w.set_human_pbem_players();
          if (typeof w.advance_unit_focus === 'function') w.advance_unit_focus();
        }, 1500);
      }
      // remove context menu from pregame
      if (w.$) w.$('.context-menu-root').remove();
      if (w.renderer === w.RENDERER_WEBGL && typeof w.init_webgl_mapview === 'function') {
        w.init_webgl_mapview();
      }
      if (w.observing || w.$.getUrlVar('action') === 'multi' || (w.is_longturn && w.is_longturn()) || w.game_loaded) {
        if (typeof w.center_on_any_city === 'function') w.center_on_any_city();
        if (typeof w.advance_unit_focus === 'function') w.advance_unit_focus();
      }
      break;

    case w.C_S_OVER:
      setTimeout(function () {
        if (typeof w.show_endgame_dialog === 'function') w.show_endgame_dialog();
      }, 500);
      break;

    case w.C_S_PREPARING:
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// setup_window_size
// ---------------------------------------------------------------------------

/**
 * Refreshes the size of UI elements based on new window and screen size.
 */
export function setupWindowSize(): void {
  const winWidth  = w.$(window).width()  as number;
  const winHeight = w.$(window).height() as number;
  const new_mapview_width  = winWidth  - (w.width_offset  as number);
  const new_mapview_height = winHeight - (w.height_offset as number);

  if (w.renderer === w.RENDERER_2DCANVAS) {
    w.mapview_canvas.width  = new_mapview_width;
    w.mapview_canvas.height = new_mapview_height;
    w.buffer_canvas.width   = Math.floor(new_mapview_width  * 1.5);
    w.buffer_canvas.height  = Math.floor(new_mapview_height * 1.5);
    w.mapview['width']        = new_mapview_width;
    w.mapview['height']       = new_mapview_height;
    w.mapview['store_width']  = new_mapview_width;
    w.mapview['store_height'] = new_mapview_height;
    if (w.mapview_canvas_ctx) w.mapview_canvas_ctx.font = w.canvas_text_font;
    if (w.buffer_canvas_ctx)  w.buffer_canvas_ctx.font  = w.canvas_text_font;
  }

  w.$('#pregame_message_area').height(new_mapview_height - 80 - w.$('#pregame_game_info').outerHeight());
  w.$('#pregame_player_list').height(new_mapview_height - 80);
  w.$('#nations').height(new_mapview_height - 100);
  w.$('#nations').width(new_mapview_width);
  w.$('#tabs').css('height', w.$(window).height());
  w.$('#tabs-map').height('auto');
  w.$('#city_viewport').height(new_mapview_height - 20);
  w.$('#opt_tab').show();
  w.$('#players_tab').show();
  w.$('#cities_tab').show();
  w.$('#freeciv_logo').show();
  w.$('#tabs-hel').hide();

  if (w.is_small_screen && w.is_small_screen()) {
    w.$('#map_tab').children().html("<i class='fa fa-globe' aria-hidden='true'></i>");
    w.$('#opt_tab').children().html("<i class='fa fa-cogs' aria-hidden='true'></i>");
    w.$('#players_tab').children().html("<i class='fa fa-flag' aria-hidden='true'></i>");
    w.$('#cities_tab').children().html("<i class='fa fa-fort-awesome' aria-hidden='true'></i>");
    w.$('#tech_tab').children().html("<i class='fa fa-flask' aria-hidden='true'></i>");
    w.$('#civ_tab').children().html("<i class='fa fa-university' aria-hidden='true'></i>");
    w.$('#hel_tab').children().html("<i class='fa fa-question-circle-o' aria-hidden='true'></i>");
    w.$('.ui-tabs-anchor').css('padding', '7px');
    w.$('.overview_dialog').hide();
    w.$('.ui-dialog-titlebar').hide();
    w.$('#freeciv_logo').hide();
    w.overview_active = false;
    if (w.$('#game_unit_orders_default').length > 0) w.$('#game_unit_orders_default').remove();
    if (w.$('#game_unit_orders_settlers').length > 0) w.$('#game_unit_orders_settlers').remove();
    w.$('#game_status_panel_bottom').css('font-size', '0.8em');
  }

  if (w.overview_active && typeof w.init_overview === 'function') w.init_overview();
  if (w.unitpanel_active && typeof w.init_game_unit_panel === 'function') w.init_game_unit_panel();
}

// ---------------------------------------------------------------------------
// show_new_game_message
// ---------------------------------------------------------------------------

/**
 * Shows the intro message when a new game starts.
 */
export function showNewGameMessage(): void {
  let message: string | null = null;
  if (typeof w.clear_chatbox === 'function') w.clear_chatbox();

  if (w.observing || w.$.getUrlVar('autostart') === 'true') {
    return;
  } else if (w.is_hotseat && w.is_hotseat()) {
    if (typeof w.show_hotseat_new_phase === 'function') w.show_hotseat_new_phase();
    return;
  } else if (w.is_pbem && w.is_pbem()) {
    message = 'Welcome ' + w.username + '! It is now your turn to play. Each player will ' +
      'get an e-mail when it is their turn to play, and can only play one turn at a time. ' +
      'Click the end turn button to end your turn and let the next opponent play.';
    setTimeout(function () {
      if (typeof w.check_queued_tech_gained_dialog === 'function') w.check_queued_tech_gained_dialog();
    }, 2500);
  } else if (w.is_longturn && w.is_longturn()) {
    message = 'Welcome ' + w.username + '! This is a One Turn per Day game, where you play one ' +
      'turn every day. Click the Turn Done button when you are done with your turn. To play your next ' +
      'turn in this One Turn per Day game, you can bookmark this page and use that link to play your next turn. ' +
      'You can also find this game by going to ' + window.location.host + ' and clicking on the One Turn per Day button. ' +
      'Good luck, have fun and see you again tomorrow!';
  } else if (w.is_small_screen && w.is_small_screen()) {
    message = 'Welcome ' + w.username + '! You lead a great civilization. Your task is to conquer the world!\n' +
      'Click on units for giving them orders, and drag units on the map to move them.\n' +
      'Good luck, and have a lot of fun!';
  } else if (w.client?.conn?.playing != null && !w.game_loaded) {
    const pplayer = w.client.conn.playing;
    const player_nation_text = 'Welcome, ' + w.username + ' ruler of the ' + w.nations[pplayer['nation']]['adjective'] + ' empire.';
    if (w.is_touch_device && w.is_touch_device()) {
      message = player_nation_text + ' Your\n' +
        'task is to create a great empire! You should start by\n' +
        'exploring the land around you with your explorer,\n' +
        'and using your settlers to find a good place to build\n' +
        'a city. Click on units to get a list of available orders. \n' +
        'To move your units around, carefully drag the units to the \n' +
        'place you want it to go.\n' +
        'Good luck, and have a lot of fun!';
    } else {
      message = player_nation_text + ' Your\n' +
        'task is to create a great empire! You should start by\n' +
        'exploring the land around you with your explorer,\n' +
        'and using your settlers to find a good place to build\n' +
        'a city. Right-click with the mouse on your units for a list of available \n' +
        'orders such as move, explore, build cities and attack. \n' +
        'Good luck, and have a lot of fun!';
    }
  } else if (w.game_loaded) {
    message = 'Welcome back, ' + w.username;
    if (w.client?.conn?.playing != null) {
      message += ' ruler of the ' + w.nations[w.client.conn.playing['nation']]['adjective'] + ' empire.';
    }
  } else {
    return;
  }

  if (message && w.message_log) {
    w.message_log.update({ event: w.E_CONNECTION, message: message });
  }
}

// ---------------------------------------------------------------------------
// alert_war
// ---------------------------------------------------------------------------

/**
 * Logs a war declaration message to the chat.
 */
export function alertWar(player_no: number): void {
  const pplayer = w.players[player_no];
  if (w.message_log) {
    w.message_log.update({
      event: w.E_DIPLOMACY,
      message: 'War: You are now at war with the ' +
        w.nations[pplayer['nation']]['adjective'] +
        ' leader ' + pplayer['name'] + '!'
    });
  }
}

// ---------------------------------------------------------------------------
// show_endgame_dialog
// ---------------------------------------------------------------------------

/**
 * Shows the endgame dialog with final scores.
 */
export function showEndgameDialog(): void {
  const title = 'Final Report: The Greatest Civilizations in the world!';
  let message = "<p id='hof_msg'></p>";
  for (let i = 0; i < w.endgame_player_info.length; i++) {
    const pplayer = w.players[w.endgame_player_info[i]['player_id']];
    const nation_adj = w.nations[pplayer['nation']]['adjective'];
    message += (i + 1) + ': The ' + nation_adj + ' ruler ' + pplayer['name'] +
      ' scored ' + w.endgame_player_info[i]['score'] + ' points' + '<br>';
  }
  w.$('#dialog').remove();
  w.$("<div id='dialog'></div>").appendTo('div#game_page');
  w.$('#dialog').html(message);
  w.$('#dialog').attr('title', title);
  w.$('#dialog').dialog({
    bgiframe: true,
    modal: true,
    width: (w.is_small_screen && w.is_small_screen()) ? '90%' : '50%',
    buttons: {
      'Game replay': function () {
        if (typeof w.show_replay === 'function') w.show_replay();
      },
      'Show Scores': function () {
        w.$('#dialog').dialog('close');
        if (typeof w.view_game_scores === 'function') w.view_game_scores();
      },
      Ok: function () {
        w.$('#dialog').dialog('close');
        w.$('#game_text_input').blur();
      }
    }
  });
  w.$('#dialog').dialog('open');
  w.$('#game_text_input').blur();
  w.$('#dialog').css('max-height', '500px');
  setTimeout(function () {
    if (typeof w.submit_game_to_hall_of_fame === 'function') w.submit_game_to_hall_of_fame();
  }, 1000);
}

// ---------------------------------------------------------------------------
// update_metamessage_on_gamestart
// ---------------------------------------------------------------------------

/**
 * Updates the metaserver message when the game starts.
 */
export function updateMetamessageOnGamestart(): void {
  if (!w.observing && !w.metamessage_changed &&
      w.client?.conn?.playing != null &&
      w.client.conn.playing['pid'] === w.players[0]?.['pid'] &&
      w.$.getUrlVar('action') === 'new') {
    const pplayer = w.client.conn.playing;
    const metasuggest = w.username + ' ruler of the ' + w.nations[pplayer['nation']]['adjective'] + '.';
    if (typeof w.send_message === 'function') w.send_message('/metamessage ' + metasuggest);
    setInterval(function () {
      if (typeof w.update_metamessage_game_running_status === 'function') w.update_metamessage_game_running_status();
    }, 200000);
  }
  const action = w.$.getUrlVar('action');
  if (action === 'new' || action === 'earthload' || w.$.getUrlVar('scenario') === 'true') {
    if (w.renderer === w.RENDERER_2DCANVAS) {
      w.$.post('/freeciv_time_played_stats?type=single2d').fail(function () {});
    } else {
      w.$.post('/freeciv_time_played_stats?type=single3d').fail(function () {});
    }
  }
  if (action === 'multi' && w.client?.conn?.playing != null &&
      w.client.conn.playing['pid'] === w.players[0]?.['pid'] &&
      !(w.is_longturn && w.is_longturn())) {
    w.$.post('/freeciv_time_played_stats?type=multi').fail(function () {});
  }
  if (action === 'hotseat') {
    w.$.post('/freeciv_time_played_stats?type=hotseat').fail(function () {});
    if (typeof w.send_message === 'function') w.send_message('/metamessage hotseat game');
  }
}

// ---------------------------------------------------------------------------
// update_metamessage_game_running_status
// ---------------------------------------------------------------------------

/**
 * Updates the metaserver message during a running game.
 */
export function updateMetamessageGameRunningStatus(): void {
  if (w.client?.conn?.playing != null && !w.metamessage_changed) {
    const pplayer = w.client.conn.playing;
    const govName = w.governments?.[pplayer['government']]?.['name'] ?? '-';
    const techName = w.techs?.[pplayer['researching']]?.['name'] ?? '-';
    const metasuggest = w.nations[pplayer['nation']]['adjective'] +
      ' | ' + govName +
      ' | People:' + (typeof w.civ_population === 'function' ? w.civ_population(pplayer.playerno) : '?') +
      ' | Score:' + pplayer['score'] +
      ' | Research:' + techName;
    if (typeof w.send_message === 'function') w.send_message('/metamessage ' + metasuggest);
  }
}

// ---------------------------------------------------------------------------
// set_default_mapview_active
// ---------------------------------------------------------------------------

/**
 * Resets the UI to the default map view state.
 */
export function setDefaultMapviewActive(): void {
  if (w.renderer === w.RENDERER_2DCANVAS && w.mapview_canvas) {
    w.mapview_canvas_ctx = w.mapview_canvas.getContext('2d');
    if (w.mapview_canvas_ctx) w.mapview_canvas_ctx.font = w.canvas_text_font;
  }

  const active_tab = w.$('#tabs').tabs('option', 'active');
  if (active_tab === 4) {
    // cities dialog is active — don't switch away
    return;
  }

  if (w.unitpanel_active && typeof w.update_active_units_dialog === 'function') {
    w.update_active_units_dialog();
  }

  if (w.chatbox_active) {
    w.$('#game_chatbox_panel').parent().show();
    if (w.current_message_dialog_state === 'minimized') {
      w.$('#game_chatbox_panel').dialogExtend('minimize');
    }
  }

  w.$('#tabs').tabs('option', 'active', 0);
  w.$('#tabs-map').height('auto');
  w.tech_dialog_active   = false;
  w.allow_right_click    = false;
  w.keyboard_input       = true;

  w.$('#freeciv_custom_scrollbar_div').mCustomScrollbar('scrollTo', 'bottom', { scrollInertia: 0 });

  if (w.is_small_screen && !w.is_small_screen()) {
    w.$('#game_overview_panel').parent().show();
    w.$('.overview_dialog').position({
      my: 'left bottom',
      at: 'left bottom',
      of: window,
      within: w.$('#game_page')
    });
    if (w.overview_current_state === 'minimized') {
      w.$('#game_overview_panel').dialogExtend('minimize');
    }
  }

  if (typeof w.mark_all_dirty === 'function') w.mark_all_dirty();
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('set_client_state',                       setClientState);
exposeToLegacy('setup_window_size',                      setupWindowSize);
exposeToLegacy('show_new_game_message',                  showNewGameMessage);
exposeToLegacy('alert_war',                              alertWar);
exposeToLegacy('show_endgame_dialog',                    showEndgameDialog);
exposeToLegacy('update_metamessage_on_gamestart',        updateMetamessageOnGamestart);
exposeToLegacy('update_metamessage_game_running_status', updateMetamessageGameRunningStatus);
exposeToLegacy('set_default_mapview_active',             setDefaultMapviewActive);
