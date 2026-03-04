/**
 * XBWorld Map Rendering Diagnostics
 *
 * Paste into browser console or save as a bookmarklet to diagnose
 * black map / rendering issues.
 *
 * Bookmarklet version (copy to bookmark URL):
 *   javascript:void(fetch('/javascript/ts-bundle/map-diagnostics.js').then(r=>r.text()).then(eval))
 *
 * Or paste directly in console:
 *   Copy everything below and paste into DevTools console.
 */
(function xbworldMapDiag() {
  'use strict';

  const w = window;
  const results = {};
  const issues = [];
  const fixes = [];

  // ─── 1. Core Data Structures ───────────────────────────────────────
  results['1_tileset_loaded'] = typeof w.tileset !== 'undefined' && w.tileset != null;
  results['1_sprites_count'] = typeof w.sprites !== 'undefined' ? Object.keys(w.sprites).length : 0;
  results['1_map_exists'] = typeof w.map !== 'undefined' && w.map != null && w.map.xsize > 0;
  results['1_map_size'] = w.map ? `${w.map.xsize}x${w.map.ysize}` : 'N/A';
  results['1_tiles_count'] = typeof w.tiles !== 'undefined' ? Object.keys(w.tiles).length : 0;

  if (!results['1_tileset_loaded']) issues.push('Tileset not loaded');
  if (results['1_sprites_count'] === 0) issues.push('No sprites loaded');
  if (!results['1_map_exists']) issues.push('Map not initialized');
  if (results['1_tiles_count'] === 0) issues.push('No tiles received from server');

  // ─── 2. Player Vision ─────────────────────────────────────────────
  let knownTiles = 0;
  let unknownTiles = 0;
  if (typeof w.tiles !== 'undefined') {
    for (const tid in w.tiles) {
      const t = w.tiles[tid];
      if (t && t.known !== undefined) {
        if (t.known >= 2) knownTiles++;
        else unknownTiles++;
      }
    }
  }
  results['2_known_tiles'] = knownTiles;
  results['2_unknown_tiles'] = unknownTiles;
  results['2_vision_pct'] = results['1_tiles_count'] > 0
    ? Math.round(100 * knownTiles / results['1_tiles_count']) + '%'
    : 'N/A';

  if (knownTiles === 0 && results['1_tiles_count'] > 0) {
    issues.push('Player has no vision (0 known tiles)');
  }

  // ─── 3. Canvas State ──────────────────────────────────────────────
  const mc = w.mapview_canvas;
  const bc = w.buffer_canvas;
  results['3_mapview_canvas'] = mc ? `${mc.width}x${mc.height}` : 'MISSING';
  results['3_buffer_canvas'] = bc ? `${bc.width}x${bc.height}` : 'MISSING';

  if (!mc) issues.push('mapview_canvas not found');
  if (!bc) issues.push('buffer_canvas not found');

  // Check if canvas is all black
  if (mc) {
    try {
      const ctx = mc.getContext('2d');
      const sample = ctx.getImageData(mc.width / 2, mc.height / 2, 1, 1).data;
      results['3_center_pixel'] = `rgba(${sample[0]},${sample[1]},${sample[2]},${sample[3]})`;
      if (sample[0] === 0 && sample[1] === 0 && sample[2] === 0) {
        issues.push('Canvas center pixel is black — map not rendering');
      }
    } catch (e) {
      results['3_center_pixel'] = 'ERROR: ' + e.message;
    }
  }

  // ─── 4. Rendering Pipeline ────────────────────────────────────────
  results['4_dirty_all'] = typeof w.dirty_all !== 'undefined' ? w.dirty_all : 'N/A';
  results['4_dirty_count'] = typeof w.dirty_count !== 'undefined' ? w.dirty_count : 'N/A';
  results['4_renderer'] = w.renderer === 1 ? '2D Canvas' : w.renderer === 2 ? 'WebGL' : w.renderer;
  results['4_mapview_origin'] = w.mapview
    ? `gui_x0=${w.mapview.gui_x0}, gui_y0=${w.mapview.gui_y0}`
    : 'N/A';

  if (w.dirty_all === false && (w.dirty_count === 0 || w.dirty_count === undefined)) {
    issues.push('No dirty tiles — rendering loop has nothing to draw');
    fixes.push('mark_all_dirty()');
  }

  // ─── 5. Client State ──────────────────────────────────────────────
  results['5_client_state'] = typeof w.client_state !== 'undefined' ? w.client_state() : 'N/A';
  results['5_turn'] = typeof w.game_info !== 'undefined' && w.game_info ? w.game_info.turn : 'N/A';
  results['5_phase'] = typeof w.game_info !== 'undefined' && w.game_info ? w.game_info.phase : 'N/A';

  const stateNames = { 0: 'C_S_INITIAL', 1: 'C_S_PREPARING', 4: 'C_S_RUNNING', 6: 'C_S_OVER' };
  const cs = results['5_client_state'];
  results['5_client_state_name'] = stateNames[cs] || 'UNKNOWN';

  if (cs !== 4) {
    issues.push(`Client not in RUNNING state (state=${cs} ${results['5_client_state_name']})`);
  }

  // ─── 6. Key Functions ─────────────────────────────────────────────
  const criticalFns = [
    'update_map_canvas_check', 'update_map_canvas_full', 'mark_all_dirty',
    'center_tile_mapcanvas', 'fill_sprite_array', 'mapview_put_tile',
    'tile_get_known', 'tile_terrain', 'get_tile_spec_sprites',
  ];
  const missingFns = criticalFns.filter(fn => typeof w[fn] !== 'function');
  results['6_missing_functions'] = missingFns.length > 0 ? missingFns.join(', ') : 'none';
  if (missingFns.length > 0) {
    issues.push('Missing rendering functions: ' + missingFns.join(', '));
  }

  // ─── 7. Sprite Sampling ───────────────────────────────────────────
  if (results['1_sprites_count'] > 0) {
    const spriteKeys = Object.keys(w.sprites);
    const sampleKey = spriteKeys.find(k => k.startsWith('t.l0.')) || spriteKeys[0];
    const sprite = w.sprites[sampleKey];
    if (sprite) {
      results['7_sample_sprite_key'] = sampleKey;
      results['7_sample_sprite_type'] = sprite.constructor ? sprite.constructor.name : typeof sprite;
      if (sprite instanceof HTMLCanvasElement || sprite instanceof HTMLImageElement) {
        results['7_sample_sprite_size'] = `${sprite.width}x${sprite.height}`;
        // Check if sprite has non-black pixels
        if (sprite instanceof HTMLCanvasElement) {
          try {
            const sctx = sprite.getContext('2d');
            const sdata = sctx.getImageData(0, 0, sprite.width, sprite.height).data;
            let nonBlack = 0;
            for (let i = 0; i < sdata.length; i += 4) {
              if (sdata[i] > 0 || sdata[i + 1] > 0 || sdata[i + 2] > 0) nonBlack++;
            }
            results['7_sample_sprite_nonblack_pct'] =
              Math.round(100 * nonBlack / (sprite.width * sprite.height)) + '%';
          } catch (e) {
            results['7_sample_sprite_nonblack_pct'] = 'ERROR';
          }
        }
      }
    }
  }

  // ─── 8. Unit Focus ────────────────────────────────────────────────
  if (typeof w.current_focus !== 'undefined') {
    const focus = w.current_focus;
    results['8_focus_unit'] = focus && focus.length > 0
      ? `unit_id=${focus[0].id}, tile=${focus[0].tile}`
      : 'none';
  } else {
    results['8_focus_unit'] = 'N/A';
  }

  // ─── Report ───────────────────────────────────────────────────────
  console.log('%c═══ XBWorld Map Diagnostics ═══', 'font-weight:bold;font-size:14px;color:#2196F3');
  console.table(results);

  if (issues.length > 0) {
    console.log('%c⚠ Issues Found:', 'font-weight:bold;color:#FF9800;font-size:12px');
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  } else {
    console.log('%c✓ No issues detected', 'font-weight:bold;color:#4CAF50;font-size:12px');
  }

  // ─── Auto-fix ─────────────────────────────────────────────────────
  if (issues.length > 0 && knownTiles > 0) {
    console.log('%c🔧 Attempting auto-fix...', 'font-weight:bold;color:#9C27B0;font-size:12px');

    // Fix 1: Center map on a known tile
    if (typeof w.center_tile_mapcanvas === 'function') {
      let centerTile = null;
      // Try to center on player's unit
      if (typeof w.current_focus !== 'undefined' && w.current_focus && w.current_focus.length > 0) {
        centerTile = w.tiles[w.current_focus[0].tile];
      }
      // Fallback: center on any known tile
      if (!centerTile) {
        for (const tid in w.tiles) {
          if (w.tiles[tid].known >= 2) {
            centerTile = w.tiles[tid];
            break;
          }
        }
      }
      if (centerTile) {
        w.center_tile_mapcanvas(centerTile);
        console.log('  ✓ Centered map on tile', centerTile.index);
      }
    }

    // Fix 2: Mark all dirty and force redraw
    if (typeof w.mark_all_dirty === 'function') {
      w.mark_all_dirty();
      console.log('  ✓ Called mark_all_dirty()');
    }
    if (typeof w.update_map_canvas_full === 'function') {
      w.update_map_canvas_full();
      console.log('  ✓ Called update_map_canvas_full()');
    }

    // Verify fix
    setTimeout(function () {
      if (mc) {
        const ctx = mc.getContext('2d');
        const sample = ctx.getImageData(mc.width / 2, mc.height / 2, 1, 1).data;
        if (sample[0] > 0 || sample[1] > 0 || sample[2] > 0) {
          console.log('%c✓ Map is now rendering!', 'font-weight:bold;color:#4CAF50;font-size:12px');
        } else {
          console.log('%c✗ Map still black after fix attempt', 'font-weight:bold;color:#F44336;font-size:12px');
          console.log('  Try: Check if tileset images loaded (Network tab)');
          console.log('  Try: Check if globalCompositeOperation is correct');
        }
      }
    }, 500);
  }

  return results;
})();
