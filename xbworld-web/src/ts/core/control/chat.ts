/**
 * Chat context and message handling.
 *
 * Extracted from core/control.ts — chat_context_*, set_chat_direction,
 * encode_message_text, is_unprefixed_message, check_text_input.
 */

import { isLongturn as is_longturn } from '../../client/clientCore';
import { clientState as client_state, C_S_RUNNING } from '../../client/clientState';
import { DiplState, PlayerFlag } from '../../data/player';
import { send_message } from '../../net/connection';
import { isTouchDevice as is_touch_device } from '../../utils/helpers';
import { logNormal } from '../../core/log';
import { message_log, max_chat_message_length } from '../../core/messages';
import { E_LOG_ERROR } from '../../data/eventConstants';

const FC_DS_ALLIANCE = DiplState.DS_ALLIANCE;
const FC_PLRF_AI = PlayerFlag.PLRF_AI;

declare const $: any;
declare const client: any;
declare const players: any;
declare const nations: any;
declare const diplstates: any;
declare const sprites: any;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export let chat_send_to: number = -1;
export const CHAT_ICON_EVERYBODY: string = String.fromCharCode(62075);
export const CHAT_ICON_ALLIES: string = String.fromCharCode(61746);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set the chatbox messages context to the next item on the list if it is
 * small. Otherwise, show a dialog for the user to select one.
 */
export function chat_context_change(): void {
  const recipients = chat_context_get_recipients();
  if (recipients.length < 4) {
    chat_context_set_next(recipients);
  } else {
    chat_context_dialog_show(recipients);
  }
}

/**
 * Get ordered list of possible alive human chatbox messages recipients.
 */
export function chat_context_get_recipients(): any[] {
  let allies = false;
  const pm: any[] = [];

  pm.push({ id: null, flag: null, description: 'Everybody' });

  let self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  for (const player_id_str in players) {
    const player_id = parseInt(player_id_str);
    if (player_id == self) continue;

    const pplayer = players[player_id];
    if (pplayer['flags'].isSet(FC_PLRF_AI)) continue;
    if (!pplayer['is_alive']) continue;
    if (is_longturn() && pplayer['name'].indexOf("New Available Player") != -1) continue;

    const nation = nations[pplayer['nation']];
    if (nation == null) continue;

    // TODO: add connection state, to list connected players first
    pm.push({
      id: player_id,
      description: pplayer['name'] + " of the " + nation['adjective'],
      flag: sprites["f." + nation['graphic_str']]
    });

    if (diplstates[player_id] == FC_DS_ALLIANCE) {
      allies = true;
    }
  }

  if (allies && self >= 0) {
    pm.push({ id: self, flag: null, description: 'Allies' });
  }

  pm.sort(function(a: any, b: any) {
    if (a.id == null) return -1;
    if (b.id == null) return 1;
    if (a.id == self) return -1;
    if (b.id == self) return 1;
    if (a.description < b.description) return -1;
    if (a.description > b.description) return 1;
    return 0;
  });

  return pm;
}

/**
 * Switch chatbox messages recipients.
 */
export function chat_context_set_next(recipients: any[]): void {
  let next = 0;
  while (next < recipients.length && recipients[next].id != chat_send_to) {
    next++;
  }
  next++;
  if (next >= recipients.length) {
    next = 0;
  }

  set_chat_direction(recipients[next].id);
}

/**
 * Show a dialog for the user to select the default recipient of
 * chatbox messages.
 */
export function chat_context_dialog_show(recipients: any[]): void {
  const dlg = $("#chat_context_dialog");
  if (dlg.length > 0) {
    dlg.dialog('close');
    dlg.remove();
  }
  $("<div id='chat_context_dialog' title='Choose chat recipient'></div>")
    .appendTo("div#game_page");

  let self = -1;
  if (client.conn.playing != null) {
    self = client.conn.playing['playerno'];
  }

  const tbody_el = document.createElement('tbody');

  const add_row = function(id: number | null, flag: any, description: string): CanvasRenderingContext2D {
    let flag_canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, row: HTMLTableRowElement, cell: HTMLTableCellElement;
    row = document.createElement('tr');
    cell = document.createElement('td');
    flag_canvas = document.createElement('canvas');
    flag_canvas.width = 29;
    flag_canvas.height = 20;
    ctx = flag_canvas.getContext("2d")!;
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
    cell.appendChild(flag_canvas);
    row.appendChild(cell);
    cell = document.createElement('td');
    cell.appendChild(document.createTextNode(description));
    row.appendChild(cell);
    if (id != null) {
      $(row).data("chatSendTo", id);
    }
    tbody_el.appendChild(row);
    return ctx;
  };

  for (let i = 0; i < recipients.length; i++) {
    if (recipients[i].id != chat_send_to) {
      const ctx = add_row(recipients[i].id, recipients[i].flag,
        recipients[i].description);

      if (recipients[i].id == null || recipients[i].id == self) {
        ctx.font = "18px FontAwesome";
        ctx.fillStyle = "rgba(32, 32, 32, 1)";
        if (recipients[i].id == null) {
          ctx.fillText(CHAT_ICON_EVERYBODY, 5, 15);
        } else {
          ctx.fillText(CHAT_ICON_ALLIES, 8, 16);
        }
      }
    }
  }

  const table = document.createElement('table');
  table.appendChild(tbody_el);
  $(table).on('click', 'tbody tr', handle_chat_direction_chosen);
  $(table).appendTo("#chat_context_dialog");

  $("#chat_context_dialog").dialog({
    bgiframe: true,
    modal: false,
    maxHeight: 0.9 * $(window).height()
  }).dialogExtend({
    minimizable: true,
    closable: true,
    icons: {
      minimize: "ui-icon-circle-minus",
      restore: "ui-icon-bullet"
    }
  });

  $("#chat_context_dialog").dialog('open');
}

/**
 * Handle a choice in the chat context dialog.
 */
export function handle_chat_direction_chosen(ev: JQuery.ClickEvent): void {
  const new_send_to = $(this).data("chatSendTo");
  $("#chat_context_dialog").dialog('close');
  if (new_send_to == null) {
    set_chat_direction(null);
  } else {
    set_chat_direction(parseFloat(new_send_to));
  }
}

/**
 * Set the context for the chatbox.
 */
export function set_chat_direction(player_id: number | null): void {

  if (player_id == chat_send_to) return;

  let player_name: string;
  const icon = $("#chat_direction");
  if (icon.length <= 0) return;
  const ctx = (icon[0] as HTMLCanvasElement).getContext("2d")!;

  if (player_id == null || player_id < 0) {
    player_id = null;
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_EVERYBODY, 7, 15);
    player_name = 'everybody';
  } else if (client.conn.playing != null
    && player_id == client.conn.playing['playerno']) {
    ctx.clearRect(0, 0, 29, 20);
    ctx.font = "18px FontAwesome";
    ctx.fillStyle = "rgba(192, 192, 192, 1)";
    ctx.fillText(CHAT_ICON_ALLIES, 10, 16);
    player_name = 'allies';
  } else {
    const pplayer = players[player_id];
    if (pplayer == null) return;
    player_name = pplayer['name']
      + " of the " + nations[pplayer['nation']]['adjective'];
    ctx.clearRect(0, 0, 29, 20);
    const flag = sprites["f." + nations[pplayer['nation']]['graphic_str']];
    if (flag != null) {
      ctx.drawImage(flag, 0, 0);
    }
  }

  icon.attr("title", "Sending messages to " + player_name);
  chat_send_to = player_id;
  $("#game_text_input").focus();
}

/**
 * Common replacements and encoding for messages.
 */
export function encode_message_text(message: string): string {
  message = message.replace(/^\s+|\s+$/g, "");
  message = message.replace(/&/g, "&amp;");
  message = message.replace(/'/g, "&apos;");
  message = message.replace(/"/g, "&quot;");
  message = message.replace(/</g, "&lt;");
  message = message.replace(/>/g, "&gt;");
  return encodeURIComponent(message);
}

/**
 * Tell whether this is a simple message to the choir.
 */
export function is_unprefixed_message(message: string | null): boolean {
  if (message === null) return false;
  if (message.length === 0) return true;

  /* Commands, messages to allies and explicit send to everybody */
  const first = message.charAt(0);
  if (first === '/' || first === '.' || first === ':') return false;

  /* Private messages */
  let quoted_pos = -1;
  if (first === '"' || first === "'") {
    quoted_pos = message.indexOf(first, 1);
  }
  const private_mark = message.indexOf(':', quoted_pos);
  if (private_mark < 0) return true;
  const space_pos = message.indexOf(' ', quoted_pos);
  return (space_pos !== -1 && (space_pos < private_mark));
}

/**
 * Handle text input from chat fields.
 */
export function check_text_input(event: JQuery.KeyDownEvent, chatboxtextarea: JQuery<HTMLElement>): boolean | undefined {

  if (event.keyCode == 13 && event.shiftKey == 0) {
    let message = chatboxtextarea.val() as string;

    if (chat_send_to != null && chat_send_to >= 0
      && is_unprefixed_message(message)) {
      if (client.conn.playing != null
        && chat_send_to == client.conn.playing['playerno']) {
        message = ". " + encode_message_text(message);
      } else {
        const pplayer = players[chat_send_to];
        if (pplayer == null) {
          // Change to public chat, don't send the message,
          // keep it in the chatline and hope the user notices
          set_chat_direction(null);
          return;
        }
        let player_name = pplayer['name'];
        const badchars = [' ', '"', "'"];
        for (const c of badchars) {
          const i = player_name.indexOf(c);
          if (i > 0) {
            player_name = player_name.substring(0, i);
          }
        }
        message = player_name + encode_message_text(": " + message);
      }
    } else {
      message = encode_message_text(message);
    }

    chatboxtextarea.val('');
    if (!is_touch_device()) chatboxtextarea.focus();
    // Note: keyboard_input is set externally via the parent module's reference

    if (message.length >= 4 && message === message.toUpperCase()) {
      return; //disallow all uppercase messages.
    }

    if (is_longturn() && C_S_RUNNING == client_state()
      && message != null && message.indexOf(encode_message_text("/set")) != -1) {
      return; // disallow changing settings in a running LongTurn game.
    }

    if (message.length >= max_chat_message_length) {
      message_log.update({
        event: E_LOG_ERROR,
        message: "Error! The message is too long. Limit: " + max_chat_message_length
      });
      return;
    }

    send_message(message);
    return false;
  }
}
