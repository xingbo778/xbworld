/**********************************************************************
    Copyright (C) 2017  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

declare const $: any;

import { E_CHAT_MSG, E_CHAT_PRIVATE, E_CHAT_ALLIES, E_CHAT_OBSERVER } from './eventConstants'; // TODO: verify correct path and exports
import { civclient_state, C_S_PREPARING } from '../client/clientState'; // TODO: verify correct path and exports
import { check_text_with_banlist } from './someBanlistModule'; // TODO: import actual function or replace with any
import { is_longturn, is_small_screen } from './someUtilsModule'; // TODO: import actual functions or replace with any
import { fc_e_events, E_I_NAME } from './someEventConstantsModule'; // TODO: import actual constants or replace with any
import { EventAggregator } from './EventAggregator'; // TODO: import actual EventAggregator class or replace with any

export let chatbox_active: boolean = true;
export const message_log: any = new EventAggregator(update_chatbox, 125,
                                      EventAggregator.DP_ALL, 1000, 0);
export let previous_scroll: number = 0;
export let current_message_dialog_state: any = null;
export const max_chat_message_length: number = 350;

/**************************************************************************
 ...
**************************************************************************/
export function init_chatbox(): void
{

  chatbox_active = true;

  $("#game_chatbox_panel").attr("title", "Messages");
  $("#game_chatbox_panel").dialog({
			bgiframe: true,
			modal: false,
			width: "27%",
			height: (is_small_screen() ? 100 : 200),
			resizable: true,
			dialogClass: 'chatbox_dialog no-close',
			closeOnEscape: false,
			position: {my: 'left bottom', at: 'left bottom', of: window, within: $("#game_page")},
			close: function(event: any, ui: any) { chatbox_active = false;}
		}).dialogExtend({
                     "minimizable" : true,
                     "maximizable" : true,
                     "closable" : false,
                     "minimize" : function(evt: any, dlg: any){ current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state") },
                     "restore" : function(evt: any, dlg: any){ current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state") },
                     "maximize" : function(evt: any, dlg: any){ current_message_dialog_state = $("#game_chatbox_panel").dialogExtend("state") },
                     "icons" : {
                       "minimize" : "ui-icon-circle-minus",
                       "maximize" : "ui-icon-circle-plus",
                       "restore" : "ui-icon-bullet"
                     }});
  $("#game_chatbox_panel").dialog('open');
  $(".chatbox_dialog").css("top", "52px");


  if (is_small_screen()) {
    $(".chatbox_dialog").css("left", "2px");
    $(".chatbox_dialog").css("top", "40px");
    $("#game_chatbox_panel").parent().css("max-height", "15%");
    $("#game_chatbox_panel").parent().css("width", "95%");

  }

  $("#freeciv_custom_scrollbar_div").mCustomScrollbar({theme:"3d"});
  if (current_message_dialog_state == "minimized") $("#game_chatbox_panel").dialogExtend("minimize");

}

/**************************************************************************
 Returns the kind of message (normal, private, ally).
 If an observer sends a private message, it will be treated as private.
 Same for a message to allies sent by an observer. That is, only public
 messages from observers will have the E_CHAT_OBSERVER type.
 There are quite a few message formats, selection is made depending on font
 color, that comes after the player in normal games or the timestamp or
 nothing in longturn games.

 Current examples:
 <b>player:</b><font color="#FFFFFF"><player> Normal message</font>
 <b>player:</b><font color="#A020F0">->{other} Private sent</font>
 <b>player:</b><font color="#A020F0">{player -> other} Private recv</font>
 <b>player:</b><font color="#551166">player to allies: allies msg</font>
 <b>observer:</b><font color="#FFFFFF"><(observer)> mesage</font>
 <b>observer:</b><font color="#A020F0">{(observer)} private from observer</font>
 <b>observer:</b><font color="#A020F0">*(observer)* private from observer</font>
 (T24 - 19:14:47) <font color="#FFFFFF"><player> player : lt msg with ts</player></font>
 <font color="#FFFFFF"><player> player : lt msg without ts</player></font>
 <font color="#A020F0">->{other} lt private sent msg</font>
 ...
**************************************************************************/
export function reclassify_chat_message(text: string | null): number
{
  // 29 characters just for the font tags
  if (text == null || text.length < 29) {
    return E_CHAT_MSG;
  }

  // Remove the player
  text = text.replace(/^<b>[^<]*:<\/b>/, "");

  // Remove the timestamp
  text = text.replace(/^\([^)]*\) /, "");

  // We should have the font tag now
  const color: string = text.substring(14, 20);
  if (color == "A020F0") {
    return E_CHAT_PRIVATE;
  } else if (color == "551166") {
    return E_CHAT_ALLIES;
  } else if (text.charAt(23) == '(') {
    return E_CHAT_OBSERVER;
  }
  return E_CHAT_MSG;
}

/**************************************************************************
 This adds new text to the main message chatbox. See update_chatbox() which
 does the actual update to the screen.
**************************************************************************/
export function add_chatbox_text(packet: any): void
{
    let text: string | null = packet['message'];

    if (text == null) return;
    if (!check_text_with_banlist(text)) return;
    if (is_longturn()) {
      if (text.indexOf("waiting on") != -1 || text.indexOf("Lost connection") != -1 || text.indexOf("Not enough") != -1 || text.indexOf("has been removed") != -1 || text.indexOf("has connected") != -1) return;
    }
    if (text.length >= max_chat_message_length) return;

    if (packet['event'] === E_CHAT_MSG) {
      packet['event'] = reclassify_chat_message(text);
    }

    if (civclient_state <= C_S_PREPARING) {
      text = text.replace(/#FFFFFF/g, '#000000');
    } else {
      text = text.replace(/#0000FF/g, '#5555FF')
                 .replace(/#006400/g, '#00AA00')
                 .replace(/#551166/g, '#AA88FF')
                 .replace(/#A020F0/g, '#F020FF');
    }

    packet['message'] = text;
    message_log.update(packet);
}

/**************************************************************************
 Returns the chatbox messages.
**************************************************************************/
export function get_chatbox_text(): string | null
{
  const chatbox_msg_list: HTMLElement | null = get_chatbox_msg_list();
  if (chatbox_msg_list != null) {
    return chatbox_msg_list.textContent;
  } else {
    return null;
  }

}

/**************************************************************************
 Returns the chatbox message list element.
**************************************************************************/
export function get_chatbox_msg_list(): HTMLElement | null
{
  return document.getElementById(civclient_state <= C_S_PREPARING ?
    'pregame_message_area' : 'game_message_area');
}

/**************************************************************************
 Clears the chatbox.
**************************************************************************/
export function clear_chatbox(): void
{
  message_log.clear();
  chatbox_clip_messages(0);
}

/**************************************************************************
 Updates the chatbox text window.
**************************************************************************/
export function update_chatbox(messages: any[]): void
{
  const scrollDiv: HTMLElement | null = get_chatbox_msg_list();

  if (scrollDiv != null) {
    for (let i = 0; i < messages.length; i++) {
        const item: HTMLLIElement = document.createElement('li');
        item.className = fc_e_events[messages[i].event][E_I_NAME];
        item.innerHTML = messages[i].message;
        scrollDiv.appendChild(item);
    }

  } else {
      // It seems this might happen in pregame while handling a join request.
      // If so, enqueue the messages again, but we'll be emptying-requeueing
      // every second until the state changes.
      for (let i = 0; i < messages.length; i++) {
        message_log.update(messages[i]);
      }
  }
  setTimeout(() => $('#freeciv_custom_scrollbar_div').mCustomScrollbar('scrollTo', 'bottom'), 100);
}

/**************************************************************************
 Clips the chatbox text to a maximum number of lines.
**************************************************************************/
export function chatbox_clip_messages(lines?: number): void
{
  if (lines === undefined || lines < 0) {
    lines = 24;
  }

  // Flush the buffered messages
  message_log.fireNow();

  const msglist: HTMLElement | null = get_chatbox_msg_list();
  if (!msglist) return;
  let remove: number = msglist.children.length - lines;
  while (remove-- > 0) {
    if (msglist.firstChild) {
      msglist.removeChild(msglist.firstChild);
    }
  }

  // To update scroll size
  update_chatbox([]);
}

/**************************************************************************
  Waits for the specified text to appear in the chat log, then
  executes the given JavaScript code.
**************************************************************************/
export function wait_for_text(text: string, runnable: () => void): void
{
  const chatbox_text: string | null = get_chatbox_text();
  if (chatbox_text != null && chatbox_text.indexOf(text) != -1) {
    runnable();
  } else {
    setTimeout(function () {
      wait_for_text(text, runnable);
    }, 100);
  }

}
