/**
 * Client debug utilities — migrated from civclient.js.
 *
 * Provides:
 *   - show_debug_info() — logs version, browser, network stats to console
 */

import { exposeToLegacy } from '../bridge/legacy';
import { RENDERER_WEBGL } from '../core/constants';

const win = window as any;

// ---------------------------------------------------------------------------
// show_debug_info
// ---------------------------------------------------------------------------

/**
 * Logs diagnostic information to the browser console:
 *   - XBWorld version, browser user-agent, jQuery versions
 *   - Network ping averages (server and client)
 *   - WebGL renderer info (if using WebGL)
 *
 * Sets `debug_active = true` as a side effect.
 */
export function showDebugInfo(): void {
  console.log('XBWorld version: ' + (win.freeciv_version ?? 'unknown'));
  console.log('Browser useragent: ' + navigator.userAgent);
  console.log('jQuery version: ' + ($ as any)().jquery);
  console.log('jQuery UI version: ' + ($ as any).ui?.version);
  console.log(
    'simpleStorage version: ' + (win.simpleStorage?.version ?? 'N/A'),
  );
  console.log(
    'Touch device: ' +
      (typeof win.is_touch_device === 'function'
        ? win.is_touch_device()
        : 'unknown'),
  );
  console.log('HTTP protocol: ' + document.location.protocol);
  if (win.ws != null && win.ws.url != null) {
    console.log('WebSocket URL: ' + win.ws.url);
  }

  win.debug_active = true;

  // Server ping stats
  const pingList: number[] = win.debug_ping_list ?? [];
  if (pingList.length > 0) {
    let sum = 0;
    let max = 0;
    for (const v of pingList) {
      sum += v;
      if (v > max) max = v;
    }
    console.log(
      'Network PING average (server): ' +
        (sum / pingList.length) +
        ' ms. (Max: ' +
        max +
        'ms.)',
    );
  }

  // Client ping stats
  const clientSpeedList: number[] = win.debug_client_speed_list ?? [];
  if (clientSpeedList.length > 0) {
    let sum = 0;
    let max = 0;
    for (const v of clientSpeedList) {
      sum += v;
      if (v > max) max = v;
    }
    console.log(
      'Network PING average (client): ' +
        (sum / clientSpeedList.length) +
        ' ms.  (Max: ' +
        max +
        'ms.)',
    );
  }

  if (win.renderer === RENDERER_WEBGL && win.maprenderer != null) {
    console.log(win.maprenderer.info);
  }
}

// ---------------------------------------------------------------------------
// Expose to legacy JS
// ---------------------------------------------------------------------------
exposeToLegacy('show_debug_info', showDebugInfo);
