/**
 * WebSocket connection manager — COMPLETE replacement for clinet.js.
 *
 * Phase 5: This module replaces clinet.js AND the inline patch script
 * in index.html. It exposes all functions via exposeToLegacy using the
 * exact same names as the Legacy code.
 *
 * Includes patches from the inline script:
 *   - Read port from JSON response body (Railway CDN strips custom headers)
 *   - Handle array-wrapped packets from the WebSocket proxy
 */

const w = window as any;

// Module-local state (was var in clinet.js)
let error_shown = false;
let syncTimerId = -1;
let clinet_last_send = 0;
export let debug_client_speed_list: number[] = [];
const freeciv_version = '+Freeciv.Web.Devel-3.3';
let ws: WebSocket | null = null;
let civserverport: string | null = null;
let ping_last = new Date().getTime();
const pingtime_check = 240000;
let ping_timer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize the network communication with the server manually.
 */
export function network_init_manual_hack(
  civserverport_manual: string,
  username_manual: string,
  savegame?: string
): void {
  civserverport = civserverport_manual;
  w.username = username_manual;
  websocket_init();

  if (savegame != null) {
    w.wait_for_text('You are logged in as', function () {
      w.load_game_real(savegame);
    });
  }
}

/**
 * Initialize the Network communication, by requesting a valid server port.
 * Includes the Railway CDN patch: reads port from JSON body first,
 * falls back to response headers.
 */
export function network_init(): void {
  if (!('WebSocket' in window)) {
    w.swal('WebSockets not supported', '', 'error');
    return;
  }

  let url = '/civclientlauncher';
  if (w.$.getUrlVar('action') != null) {
    url += '?action=' + w.$.getUrlVar('action');
  }
  if (w.$.getUrlVar('action') == null && w.$.getUrlVar('civserverport') != null) {
    url += '?';
  }
  if (w.$.getUrlVar('civserverport') != null) {
    url += '&civserverport=' + w.$.getUrlVar('civserverport');
  }

  w.$.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    success: function (data: any, _textStatus: string, request: any) {
      let port: string | null = null;
      let result: string | null = null;

      // Try JSON body first (works with Railway CDN which strips custom headers)
      if (data && data.port != null) {
        port = String(data.port);
        result = data.result || 'success';
      }

      // Fallback to response headers
      if (!port) {
        port = request.getResponseHeader('port');
        result = request.getResponseHeader('result');
      }

      if (port != null && result === 'success') {
        civserverport = port;
        websocket_init();
        if (typeof w.load_game_check === 'function') w.load_game_check();
      } else {
        w.show_dialog_message('Network error', 'Invalid server port. Error: ' + result);
      }
    },
    error: function (request: any, textStatus: string, errorThrown: string) {
      w.show_dialog_message(
        'Network error',
        'Unable to communicate with game launcher. Error: '
          + textStatus + ' ' + errorThrown + ' '
          + (request.getResponseHeader ? request.getResponseHeader('result') : '')
      );
    },
  });
}

/**
 * Initialize the WebSocket connection.
 * Includes the proxy patch: handles both single-packet and array-wrapped packets.
 */
export function websocket_init(): void {
  w.$.blockUI({ message: '<h2>Please wait while connecting to the server.</h2>' });
  const proxyport = 1000 + parseFloat(civserverport!);
  const ws_protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const port = window.location.port ? ':' + window.location.port : '';
  ws = new WebSocket(ws_protocol + window.location.hostname + port + '/civsocket/' + proxyport);

  ws.onopen = check_websocket_ready;

  ws.onmessage = function (event: MessageEvent) {
    if (typeof w.client_handle_packet !== 'undefined') {
      try {
        let parsed = JSON.parse(event.data);
        // The proxy may send a single packet object or an array of packets.
        // client_handle_packet expects an array.
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }
        w.client_handle_packet(parsed);
      } catch (e) {
        console.error('Failed to parse packet:', e);
      }
    }
  };

  ws.onclose = function (event: CloseEvent) {
    w.swal(
      'Network Error',
      'Connection to server is closed. Please reload the page to restart. Sorry!',
      'error'
    );
    if (typeof w.message_log !== 'undefined') {
      w.message_log.update({
        event: w.E_LOG_ERROR,
        message: 'Error: connection to server is closed. Please reload the page to restart. Sorry!',
      });
    }
    console.info('WebSocket connection closed, code+reason: ' + event.code + ', ' + event.reason);

    try { w.$('#turn_done_button').button('option', 'disabled', true); } catch (_e) { /* ok */ }
    try { w.$('#save_button').button('option', 'disabled', true); } catch (_e) { /* ok */ }

    w.$(window).unbind('beforeunload');

    if (ping_timer) clearInterval(ping_timer);
  };

  ws.onerror = function (evt: Event) {
    w.show_dialog_message(
      'Network error',
      'A problem occured with the ' + document.location.protocol
        + ' WebSocket connection to the server: ' + (ws ? ws.url : '')
    );
    console.error('WebSocket error:', evt);
  };
}

/**
 * When the WebSocket connection is open and ready to communicate, then
 * send the first login message to the server.
 */
export function check_websocket_ready(): void {
  if (ws != null && ws.readyState === 1) {
    let sha_password: string | null = null;
    const stored_password = w.simpleStorage.get('password', '');
    if (stored_password != null && stored_password !== false) {
      const shaObj = new w.jsSHA('SHA-512', 'TEXT');
      shaObj.update(stored_password);
      sha_password = encodeURIComponent(shaObj.getHash('HEX'));
    }

    if (w.is_longturn() && w.google_user_token == null) {
      w.swal('Login failed.');
      return;
    }

    const login_message = {
      pid: 4,
      username: w.username,
      capability: freeciv_version,
      version_label: '-dev',
      major_version: 3,
      minor_version: 1,
      patch_version: 90,
      port: civserverport,
      password: w.google_user_token == null ? sha_password : w.google_user_token,
    };
    ws.send(JSON.stringify(login_message));

    // Leaving the page without saving can now be an issue.
    w.$(window).bind('beforeunload', function () {
      return 'Do you really want to leave your nation behind now?';
    });

    // The connection is now up. Verify that it remains alive.
    ping_timer = setInterval(ping_check, pingtime_check);

    w.$.unblockUI();
  } else {
    setTimeout(check_websocket_ready, 500);
  }
}

/**
 * Stops network sync.
 */
export function network_stop(): void {
  if (ws != null) ws.close();
  ws = null;
}

/**
 * Sends a request to the server, with a JSON packet.
 */
export function send_request(packet_payload: string): void {
  if (ws != null) {
    ws.send(packet_payload);
  }
  if (w.debug_active) {
    clinet_last_send = new Date().getTime();
  }
}

/**
 * Debug timing collection.
 */
export function clinet_debug_collect(): void {
  const time_elapsed = new Date().getTime() - clinet_last_send;
  debug_client_speed_list.push(time_elapsed);
  clinet_last_send = new Date().getTime();
}

/**
 * Detect server disconnections, by checking the time since the last
 * ping packet from the server.
 */
export function ping_check(): void {
  const time_since_last_ping = new Date().getTime() - ping_last;
  if (time_since_last_ping > pingtime_check) {
    console.log(
      'Error: Missing PING message from server, indicates server connection problem.'
    );
  }
}

/**
 * Send the chat message to the server after a delay.
 */
export function send_message_delayed(message: string, delay: number): void {
  setTimeout(function () { send_message(message); }, delay);
}

/**
 * Sends a chat message to the server.
 */
export function send_message(message: string): void {
  if (w.is_longturn() && message != null) {
    if (
      message.indexOf(encodeURIComponent('/')) !== 0
      && message.indexOf('/') !== 0
      && message.charAt(0) !== '.'
    ) {
      const private_mark_i = message.indexOf(encodeURIComponent(':'));
      if (private_mark_i <= 0) {
        message = w.username + ' : ' + message;
      } else {
        const first_space = message.indexOf(encodeURIComponent(' '));
        if (first_space >= 0 && first_space < private_mark_i) {
          message = w.username + ' : ' + message;
        }
      }
    }
  }

  const packet = { pid: w.packet_chat_msg_req, message: message };
  send_request(JSON.stringify(packet));
}

// ============================================================================
// Expose to Legacy — exact same names as clinet.js
// ============================================================================

// Expose module-local state that Legacy code reads
// Override ws/civserverport/ping_last with getters so legacy reads get current values
Object.defineProperty(w, 'ws', {
  get: () => ws,
  set: (v: WebSocket | null) => { ws = v; },
  configurable: true,
});

Object.defineProperty(w, 'civserverport', {
  get: () => civserverport,
  set: (v: string | null) => { civserverport = v; },
  configurable: true,
});

Object.defineProperty(w, 'ping_last', {
  get: () => ping_last,
  set: (v: number) => { ping_last = v; },
  configurable: true,
});
