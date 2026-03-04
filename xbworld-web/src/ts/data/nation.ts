/**
 * Nation data module — all functions migrated from legacy nation.js.
 *
 * Phase 7:  Migrated 6 pure-data/logic functions.
 * Phase 9+: Migrated remaining 12 UI/DOM functions so nation.js can be
 *           safely deleted.
 *
 * Global variables previously declared in nation.js:
 *   nations       — now managed by store.ts / syncProp in ts-bundle
 *   nation_groups — initialised here and written by packhandlers.ts
 *   diplstates    — initialised here and written by packhandlers.ts
 *   selected_player — initialised here; mutated by handleNationTableSelect
 */

import { exposeToLegacy } from '../bridge/legacy';

// ---------------------------------------------------------------------------
// Legacy global references (via window)
// ---------------------------------------------------------------------------
const w = window as unknown as Record<string, any>;

// ---------------------------------------------------------------------------
// Global variable initialisation (replaces var declarations in nation.js)
// ---------------------------------------------------------------------------
// nation_groups and diplstates are written by packhandlers.ts via w.*
// selected_player is read/written by the nation-screen functions below.
if (!w['nation_groups']) w['nation_groups'] = [];
if (!w['diplstates'])    w['diplstates']    = {};
if (w['selected_player'] === undefined) w['selected_player'] = -1;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const MAX_AI_LOVE = 1000;

// ---------------------------------------------------------------------------
// Pure data functions
// ---------------------------------------------------------------------------

/**
 * Return a text describing an AI's love for you.
 * These words are adjectives which can fit in the sentence
 * "The x are y towards us"
 */
function loveText(love: number): string {
  if (love <= -MAX_AI_LOVE * 90 / 100) {
    return 'Genocidal';
  } else if (love <= -MAX_AI_LOVE * 70 / 100) {
    return 'Belligerent';
  } else if (love <= -MAX_AI_LOVE * 50 / 100) {
    return 'Hostile';
  } else if (love <= -MAX_AI_LOVE * 25 / 100) {
    return 'Uncooperative';
  } else if (love <= -MAX_AI_LOVE * 10 / 100) {
    return 'Uneasy';
  } else if (love <= MAX_AI_LOVE * 10 / 100) {
    return 'Neutral';
  } else if (love <= MAX_AI_LOVE * 25 / 100) {
    return 'Respectful';
  } else if (love <= MAX_AI_LOVE * 50 / 100) {
    return 'Helpful';
  } else if (love <= MAX_AI_LOVE * 70 / 100) {
    return 'Enthusiastic';
  } else if (love <= MAX_AI_LOVE * 90 / 100) {
    return 'Admiring';
  } else {
    return 'Worshipful';
  }
}

/** Returns score text for a player. */
function getScoreText(player: any): string | number {
  if (player['score'] >= 0) {
    return player['score'];
  } else {
    return '?';
  }
}

/**
 * Returns the attitude text for a player towards the current player.
 * Used in the nation table's "Attitude" column.
 */
function colLove(pplayer: any): string {
  if (
    w.client_is_observer() ||
    w.client?.conn?.playing == null ||
    pplayer['playerno'] === w.client.conn.playing['playerno'] ||
    pplayer['flags'].isSet(w.PLRF_AI) === false
  ) {
    return '-';
  } else {
    return loveText(pplayer['love'][w.client.conn.playing['playerno']]);
  }
}

// ---------------------------------------------------------------------------
// UI / DOM functions (migrated from nation.js)
// ---------------------------------------------------------------------------

/**
 * Rebuilds and displays the Nations of the World table.
 * Replaces update_nation_screen() in nation.js.
 */
function updateNationScreen(): void {
  let total_players = 0;
  let no_humans = 0;
  let no_ais = 0;
  let nation_list_html =
    "<table class='tablesorter' id='nation_table' width='95%' border=0 cellspacing=0 >" +
    '<thead><tr><th>Flag</th><th>Color</th><th>Player Name:</th>' +
    "<th>Nation:</th><th class='nation_attitude'>Attitude</th><th>Score</th><th>AI/Human</th><th>Alive?</th>" +
    '<th>Diplomatic state</th><th>Embassy</th><th>Shared vision</th>' +
    "<th class='nation_team'>Team</th><th>State</th></tr></thead><tbody class='nation_table_body'>";

  for (const player_id in w.players) {
    const pplayer = w.players[player_id];
    if (pplayer['nation'] === -1) continue;
    if (w.is_longturn() && pplayer['name'].indexOf('New Available Player') !== -1) continue;
    total_players++;

    const flag_html =
      "<canvas id='nation_dlg_flags_" + player_id +
      "' width='29' height='20' class='nation_flags'></canvas>";

    let plr_class = '';
    if (
      !w.client_is_observer() &&
      w.client.conn.playing != null &&
      Number(player_id) === w.client.conn.playing['playerno']
    ) {
      plr_class = 'nation_row_self';
    }
    if (!pplayer['is_alive']) plr_class = 'nation_row_dead';
    if (
      !w.client_is_observer() &&
      w.diplstates[player_id] != null &&
      w.diplstates[player_id] === w.DS_WAR
    ) {
      plr_class = 'nation_row_war';
    }

    nation_list_html +=
      "<tr data-plrid='" + player_id + "' class='" + plr_class + "'><td>" + flag_html + '</td>';
    nation_list_html +=
      "<td><div style='background-color: " +
      w.nations[pplayer['nation']]['color'] +
      "; margin: 5px; width: 25px; height: 25px;'></div></td>";
    nation_list_html +=
      '<td>' +
      pplayer['name'] +
      '</td><td title="' +
      w.nations[pplayer['nation']]['legend'] +
      '">' +
      w.nations[pplayer['nation']]['adjective'] +
      '</td>' +
      "<td class='nation_attitude'>" +
      colLove(pplayer) +
      '</td>' +
      '<td>' +
      getScoreText(pplayer) +
      '</td>' +
      '<td>' +
      (pplayer['flags'].isSet(w.PLRF_AI)
        ? w.get_ai_level_text(pplayer) + ' AI'
        : 'Human') +
      '</td><td>' +
      (pplayer['is_alive'] ? 'Alive' : 'Dead') +
      '</td>';

    if (
      !w.client_is_observer() &&
      w.client.conn.playing != null &&
      w.diplstates[player_id] != null &&
      Number(player_id) !== w.client.conn.playing['playerno']
    ) {
      nation_list_html += '<td>' + w.get_diplstate_text(w.diplstates[player_id]) + '</td>';
    } else {
      nation_list_html += '<td>-</td>';
    }

    nation_list_html += '<td>' + w.get_embassy_text(player_id) + '</td>';
    nation_list_html += '<td>';
    if (!w.client_is_observer() && w.client.conn.playing != null) {
      if (
        pplayer['gives_shared_vision'].isSet(w.client.conn.playing['playerno']) &&
        w.client.conn.playing['gives_shared_vision'].isSet(Number(player_id))
      ) {
        nation_list_html += 'Both ways';
      } else if (pplayer['gives_shared_vision'].isSet(w.client.conn.playing['playerno'])) {
        nation_list_html += 'To you';
      } else if (w.client.conn.playing['gives_shared_vision'].isSet(Number(player_id))) {
        nation_list_html += 'To them';
      } else {
        nation_list_html += 'None';
      }
    }
    nation_list_html += '</td>';
    nation_list_html += "<td class='nation_team'>" + (pplayer['team'] + 1) + '</td>';

    let pstate = ' ';
    if (pplayer['phase_done'] && !pplayer['flags'].isSet(w.PLRF_AI)) {
      pstate = 'Done';
    } else if (!pplayer['flags'].isSet(w.PLRF_AI) && pplayer['nturns_idle'] > 1) {
      pstate += 'Idle for ' + pplayer['nturns_idle'] + ' turns';
    } else if (!pplayer['phase_done'] && !pplayer['flags'].isSet(w.PLRF_AI)) {
      pstate = 'Moving';
    }
    nation_list_html += "<td id='player_state_" + player_id + "'>" + pstate + '</td>';
    nation_list_html += '</tr>';

    if (!pplayer['flags'].isSet(w.PLRF_AI) && pplayer['is_alive'] && pplayer['nturns_idle'] <= 4) {
      no_humans++;
    }
    if (pplayer['flags'].isSet(w.PLRF_AI) && pplayer['is_alive']) no_ais++;
  }

  nation_list_html += '</tbody></table>';
  w.$('#nations_list').html(nation_list_html);
  w.$('#nations_title').html('Nations of the World');
  w.$('#nations_label').html(
    'Human players: ' +
      no_humans +
      '. AIs: ' +
      no_ais +
      '. Inactive/dead: ' +
      (total_players - no_humans - no_ais) +
      '.'
  );

  selectNoNation();

  if (w.is_pbem()) {
    /* TODO: PBEM games do not support diplomacy. */
    w.$('#meet_player_button').hide();
    w.$('#cancel_treaty_button').hide();
    w.$('#take_player_button').hide();
    w.$('#toggle_ai_button').hide();
    w.$('#game_scores_button').hide();
  } else if (w.is_longturn()) {
    w.$('#take_player_button').hide();
    w.$('#toggle_ai_button').hide();
    w.$('#game_scores_button').hide();
  }

  // NOTE: upstream has `if (is_small_screen)` without `()` — a bug that
  // always evaluates to truthy (the function reference itself).  We preserve
  // the original behaviour by calling the function correctly.
  if (w.is_small_screen()) {
    w.$('#take_player_button').hide();
  }

  // Draw nation flags onto their canvas elements.
  for (const player_id in w.players) {
    const pplayer = w.players[player_id];
    const flag_canvas = w.$('#nation_dlg_flags_' + player_id);
    if (flag_canvas.length > 0) {
      const flag_canvas_ctx = flag_canvas[0].getContext('2d');
      const tag = 'f.' + w.nations[pplayer['nation']]['graphic_str'];
      if (flag_canvas_ctx != null && w.sprites[tag] != null) {
        flag_canvas_ctx.drawImage(w.sprites[tag], 0, 0);
      }
    }
  }

  w.$('#nation_table').tablesorter({ theme: 'dark', sortList: [[2, 0]] });

  if (w.is_small_screen()) {
    w.$('#nations').height(w.mapview['height'] - 150);
    w.$('#nations').width(w.mapview['width']);
  }

  /* Fetch online (connected) players on this game from Freeciv-proxy. */
  w.$.ajax({
    url: '/civsocket/' + (parseInt(w.civserverport) + 1000) + '/status',
    dataType: 'html',
    cache: false,
    async: true,
  }).done(function (data: string) {
    const online_players: Record<string, boolean> = {};
    const players_re = /username: <b>([^<]*)/g;
    let found: RegExpExecArray | null;
    while ((found = players_re.exec(data)) !== null) {
      if (found[1].length > 0) {
        online_players[found[1].toLowerCase()] = true;
      }
    }
    for (const player_id in w.players) {
      const pplayer = w.players[player_id];
      if (online_players[pplayer['username'].toLowerCase()]) {
        w.$('#player_state_' + player_id).html(
          "<span style='color: #00EE00;'><b>Online</b></span>"
        );
      }
    }
    w.$('#nation_table').trigger('update');
  });

  if (w.is_longturn()) w.$('.nation_attitude').hide();
  if (w.is_longturn()) w.$('.nation_team').hide();
  w.$('#nation_table').tooltip();
}

/**
 * Handles a click on a row in the nation table.
 * Replaces handle_nation_table_select() in nation.js.
 */
function handleNationTableSelect(this: any, ev: Event): void {
  ev.stopPropagation();
  const new_element = w.$(this);
  const new_player = parseFloat(new_element.data('plrid'));
  if (new_player === w.selected_player) {
    new_element.removeClass('ui-selected');
    selectNoNation();
  } else {
    new_element.siblings().removeClass('ui-selected');
    new_element.addClass('ui-selected');
    w.selected_player = new_player;
    selectANation();
  }
}

/**
 * Enables the appropriate action buttons for the selected nation.
 * Replaces select_a_nation() in nation.js.
 */
function selectANation(): void {
  const player_id = w.selected_player;
  const pplayer = w.players[w.selected_player];
  if (pplayer == null) return;

  const selected_myself =
    w.client.conn.playing != null && player_id === w.client.conn.playing['playerno'];
  const both_alive_and_different =
    w.client.conn.playing != null &&
    player_id !== w.client.conn.playing['playerno'] &&
    pplayer['is_alive'] &&
    w.client.conn.playing['is_alive'];

  if (
    pplayer['is_alive'] &&
    (w.client_is_observer() ||
      selected_myself ||
      (w.diplstates[player_id] != null && w.diplstates[player_id] !== w.DS_NO_CONTACT) ||
      w.client_state() === w.C_S_OVER)
  ) {
    w.$('#view_player_button').button('enable');
  } else {
    w.$('#view_player_button').button('disable');
  }

  if (
    !w.client_is_observer() &&
    both_alive_and_different &&
    w.diplstates[player_id] != null &&
    w.diplstates[player_id] !== w.DS_NO_CONTACT
  ) {
    w.$('#meet_player_button').button('enable');
  } else {
    w.$('#meet_player_button').button('disable');
  }

  if (
    !w.is_hotseat() &&
    !pplayer['flags'].isSet(w.PLRF_AI) &&
    w.diplstates[player_id] != null &&
    w.diplstates[player_id] === w.DS_NO_CONTACT
  ) {
    w.$('#meet_player_button').button('disable');
  }

  if (pplayer['flags'].isSet(w.PLRF_AI) || selected_myself) {
    w.$('#send_message_button').button('disable');
  } else {
    w.$('#send_message_button').button('enable');
  }

  if (
    !w.client_is_observer() &&
    both_alive_and_different &&
    pplayer['team'] !== w.client.conn.playing['team'] &&
    w.diplstates[player_id] != null &&
    w.diplstates[player_id] !== w.DS_WAR &&
    w.diplstates[player_id] !== w.DS_NO_CONTACT
  ) {
    w.$('#cancel_treaty_button').button('enable');
  } else {
    w.$('#cancel_treaty_button').button('disable');
  }

  if (w.can_client_control() && !selected_myself) {
    if (
      w.diplstates[player_id] === w.DS_CEASEFIRE ||
      w.diplstates[player_id] === w.DS_ARMISTICE ||
      w.diplstates[player_id] === w.DS_PEACE
    ) {
      w.$('#cancel_treaty_button').button('option', 'label', 'Declare war');
    } else {
      w.$('#cancel_treaty_button').button('option', 'label', 'Cancel treaty');
    }
  }

  if (
    w.can_client_control() &&
    both_alive_and_different &&
    pplayer['team'] !== w.client.conn.playing['team'] &&
    w.client.conn.playing['gives_shared_vision'].isSet(player_id)
  ) {
    w.$('#withdraw_vision_button').button('enable');
  } else {
    w.$('#withdraw_vision_button').button('disable');
  }

  if (
    w.client_is_observer() ||
    (both_alive_and_different && w.diplstates[player_id] !== w.DS_NO_CONTACT)
  ) {
    w.$('#intelligence_report_button').button('enable');
  } else {
    w.$('#intelligence_report_button').button('disable');
  }

  if (
    !w.is_hotseat() &&
    w.client_is_observer() &&
    pplayer['flags'].isSet(w.PLRF_AI) &&
    w.nations[pplayer['nation']]['is_playable'] &&
    w.$.getUrlVar('multi') === 'true'
  ) {
    w.$('#take_player_button').button('enable');
  } else {
    w.$('#take_player_button').button('disable');
  }

  w.$('#toggle_ai_button').button('enable');
}

/**
 * Marks the selected player as none and disables all action buttons
 * except the scores one.
 * Replaces select_no_nation() in nation.js.
 */
function selectNoNation(): void {
  w.selected_player = -1;
  w.$('#nations_button_div button').not('#game_scores_button').button('disable');
}

/**
 * Changes to the nations tab, selects a player and scrolls the table
 * so that it is on view.
 * Replaces nation_table_select_player() in nation.js.
 */
function nationTableSelectPlayer(player_no: number): void {
  w.$('#players_tab a').click();
  const row = w.$('#nation_table tr[data-plrid=' + player_no + ']');
  if (row.length === 1) {
    row.click();
    row[0].scrollIntoView();
  }
}

/** Handles the "Cancel Treaty" button click. */
function cancelTreatyClicked(): void {
  if (w.selected_player === -1) return;
  w.diplomacy_cancel_treaty(w.selected_player);
  w.set_default_mapview_active();
}

/** Handles the "Withdraw Vision" button click. */
function withdrawVisionClicked(): void {
  if (w.selected_player === -1) return;
  const packet = {
    pid: w.packet_diplomacy_cancel_pact,
    other_player_id: w.selected_player,
    clause: w.CLAUSE_VISION,
  };
  w.send_request(JSON.stringify(packet));
  w.set_default_mapview_active();
}

/** Handles the "Meet" button click in the nation dialog. */
function nationMeetClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  if (pplayer == null) return;
  const packet = {
    pid: w.packet_diplomacy_init_meeting_req,
    counterpart: pplayer['playerno'],
  };
  w.send_request(JSON.stringify(packet));
  w.set_default_mapview_active();
}

/** Handles the "Take Player" button click. */
function takePlayerClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  w.take_player(pplayer['name']);
  w.set_default_mapview_active();
}

/** Handles the "Toggle AI" button click. */
function toggleAiClicked(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  w.aitoggle_player(pplayer['name']);
  w.set_default_mapview_active();
}

/**
 * Issues a /take command for the given player name.
 * Replaces take_player() in nation.js.
 */
function takePlayer(player_name: string): void {
  w.send_message('/take ' + player_name);
  w.observing = false;
}

/**
 * Issues an /aitoggle command for the given player name.
 * Replaces aitoggle_player() in nation.js.
 */
function aitogglePlayer(player_name: string): void {
  w.send_message('/aitoggle ' + player_name);
  w.observing = false;
}

/**
 * Centers the map on the selected player's first city.
 * Replaces center_on_player() in nation.js.
 */
function centerOnPlayer(): void {
  if (w.selected_player === -1) return;
  for (const city_id in w.cities) {
    const pcity = w.cities[city_id];
    if (w.city_owner_player_id(pcity) === w.selected_player) {
      w.center_tile_mapcanvas(w.city_tile(pcity));
      w.set_default_mapview_active();
      return;
    }
  }
}

/**
 * Sends a private chat message to another player.
 * Only called from within the private-message dialog.
 * Replaces send_private_message() in nation.js.
 */
function sendPrivateMessage(other_player_name: string): void {
  const message =
    other_player_name + ': ' + w.encode_message_text(w.$('#private_message_text').val());
  const packet = { pid: w.packet_chat_msg_req, message };
  w.send_request(JSON.stringify(packet));
  w.keyboard_input = true;
  w.$('#dialog').dialog('close');
}

/**
 * Shows the dialog for sending a private message to another human player.
 * Replaces show_send_private_message_dialog() in nation.js.
 */
function showSendPrivateMessageDialog(): void {
  if (w.selected_player === -1) return;
  const pplayer = w.players[w.selected_player];
  if (pplayer == null) {
    w.swal('Please select a player to send a private message to first.');
    return;
  }
  const name: string = pplayer['name'];
  w.keyboard_input = false;
  w.$('#dialog').remove();
  w.$("<div id='dialog'></div>").appendTo('div#game_page');
  const intro_html =
    "Message: <input id='private_message_text' type='text' size='50' maxlength='80'>";
  w.$('#dialog').html(intro_html);
  w.$('#dialog').attr('title', 'Send private message to ' + name);
  w.$('#dialog').dialog({
    bgiframe: true,
    modal: true,
    width: w.is_small_screen() ? '80%' : '40%',
    buttons: {
      Send: function () {
        sendPrivateMessage(name);
      },
    },
  });
  w.$('#dialog').dialog('open');
  w.$('#dialog').keyup(function (e: KeyboardEvent) {
    if (e.keyCode === 13) {
      sendPrivateMessage(name);
    }
  });
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------

// Constants
exposeToLegacy('MAX_AI_LOVE', MAX_AI_LOVE);

// Data functions
exposeToLegacy('love_text', loveText);
exposeToLegacy('get_score_text', getScoreText);
exposeToLegacy('col_love', colLove);

// UI functions — all previously in nation.js
exposeToLegacy('update_nation_screen', updateNationScreen);
exposeToLegacy('handle_nation_table_select', handleNationTableSelect);
exposeToLegacy('select_a_nation', selectANation);
exposeToLegacy('select_no_nation', selectNoNation);
exposeToLegacy('nation_table_select_player', nationTableSelectPlayer);
exposeToLegacy('cancel_treaty_clicked', cancelTreatyClicked);
exposeToLegacy('withdraw_vision_clicked', withdrawVisionClicked);
exposeToLegacy('nation_meet_clicked', nationMeetClicked);
exposeToLegacy('take_player_clicked', takePlayerClicked);
exposeToLegacy('toggle_ai_clicked', toggleAiClicked);
exposeToLegacy('take_player', takePlayer);
exposeToLegacy('aitoggle_player', aitogglePlayer);
exposeToLegacy('center_on_player', centerOnPlayer);
exposeToLegacy('send_private_message', sendPrivateMessage);
exposeToLegacy('show_send_private_message_dialog', showSendPrivateMessageDialog);
