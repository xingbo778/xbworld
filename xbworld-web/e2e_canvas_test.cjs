const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://xbworld-production.up.railway.app/webclient/index.html?action=observe&civserverport=6001';
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('1. Navigating to observer page...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait for sprites to load (init_sprites blocks UI)
  console.log('   Waiting for sprites to load (15s)...');
  await page.waitForTimeout(15000);
  await page.screenshot({ path: '/tmp/canvas_test_1_after_sprites.png', fullPage: true });
  console.log('   Screenshot 1 saved');

  // Check state
  const state1 = await page.evaluate(() => {
    return {
      jqueryLoaded: typeof $ !== 'undefined',
      spritesInit: typeof sprites_init !== 'undefined' ? sprites_init : 'undefined',
      tilesetImagesLoaded: typeof loaded_images !== 'undefined' ? loaded_images : 'undefined',
      tilesetImageCount: typeof tileset_image_count !== 'undefined' ? tileset_image_count : 'undefined',
      blockUIVisible: !!document.querySelector('.blockUI'),
      dialogVisible: !!document.querySelector('.ui-dialog:not([style*="display: none"])'),
      usernameInput: !!document.getElementById('username_req'),
      observing: typeof observing !== 'undefined' ? observing : 'undefined',
      civclientState: typeof civclient_state !== 'undefined' ? civclient_state : 'undefined',
    };
  });
  console.log('   State:', JSON.stringify(state1, null, 2));

  // Try to find and fill username
  const usernameInput = await page.$('#username_req');
  if (usernameInput) {
    console.log('\n2. Found username input, entering name...');
    await page.fill('#username_req', 'observer1');
    await page.waitForTimeout(500);
    
    // Click Observe Game button
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('.ui-dialog-buttonset button, .ui-button');
      for (const b of btns) {
        const text = (b.textContent || '').trim();
        if (text.includes('Observe') || text.includes('Start') || text === 'Ok' || text === 'OK') {
          b.click();
          return text;
        }
      }
      return null;
    });
    console.log('   Clicked:', clicked);
    
    // Wait for connection and game load
    console.log('   Waiting for game to load (25s)...');
    await page.waitForTimeout(25000);
    await page.screenshot({ path: '/tmp/canvas_test_2_game.png', fullPage: true });
    console.log('   Screenshot 2 saved');

    const state2 = await page.evaluate(() => {
      return {
        gamePageVisible: document.getElementById('game_page')?.style.display !== 'none',
        canvasExists: !!document.getElementById('canvas'),
        canvasSize: document.getElementById('canvas') ? {
          w: document.getElementById('canvas').width,
          h: document.getElementById('canvas').height
        } : null,
        tilesLoaded: typeof tiles !== 'undefined' && tiles !== null,
        tileCount: typeof tiles !== 'undefined' && tiles !== null ? Object.keys(tiles).length : 0,
        mapExists: typeof map !== 'undefined' && map !== null,
        mapSize: typeof map !== 'undefined' && map !== null ? { x: map.xsize, y: map.ysize } : null,
        spritesInit: typeof sprites_init !== 'undefined' ? sprites_init : 'undefined',
        renderer: typeof renderer !== 'undefined' ? renderer : 'undefined',
        civclientState: typeof civclient_state !== 'undefined' ? civclient_state : 'undefined',
        wsState: typeof ws !== 'undefined' && ws !== null ? ws.readyState : 'no ws',
        gameInfoTurn: typeof game_info !== 'undefined' && game_info !== null ? game_info.turn : 'no game_info',
      };
    });
    console.log('\n3. Game state:', JSON.stringify(state2, null, 2));
  } else {
    console.log('\n   No username input found.');
    // Maybe blockUI is still showing. Try to unblock and check.
    await page.evaluate(() => { try { $.unblockUI(); } catch(e) {} });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/canvas_test_1b_unblocked.png', fullPage: true });
    
    const usernameInput2 = await page.$('#username_req');
    console.log('   After unblock, username input found:', !!usernameInput2);
    
    if (usernameInput2) {
      console.log('   Entering username...');
      await page.fill('#username_req', 'observer1');
      const clicked = await page.evaluate(() => {
        const btns = document.querySelectorAll('.ui-dialog-buttonset button, .ui-button');
        for (const b of btns) {
          const text = (b.textContent || '').trim();
          if (text.includes('Observe') || text.includes('Start') || text === 'Ok' || text === 'OK') {
            b.click();
            return text;
          }
        }
        return null;
      });
      console.log('   Clicked:', clicked);
      
      console.log('   Waiting for game (25s)...');
      await page.waitForTimeout(25000);
      await page.screenshot({ path: '/tmp/canvas_test_2_game.png', fullPage: true });
      
      const state2 = await page.evaluate(() => {
        return {
          gamePageVisible: document.getElementById('game_page')?.style.display !== 'none',
          canvasExists: !!document.getElementById('canvas'),
          tileCount: typeof tiles !== 'undefined' && tiles !== null ? Object.keys(tiles).length : 0,
          mapSize: typeof map !== 'undefined' && map !== null ? { x: map.xsize, y: map.ysize } : null,
          spritesInit: typeof sprites_init !== 'undefined' ? sprites_init : 'undefined',
          civclientState: typeof civclient_state !== 'undefined' ? civclient_state : 'undefined',
          wsState: typeof ws !== 'undefined' && ws !== null ? ws.readyState : 'no ws',
          gameInfoTurn: typeof game_info !== 'undefined' && game_info !== null ? game_info.turn : 'no game_info',
        };
      });
      console.log('\n   Game state:', JSON.stringify(state2, null, 2));
    }
  }

  if (errors.length > 0) {
    console.log('\nErrors:', errors.slice(0, 10).join('\n'));
  }

  await page.screenshot({ path: '/tmp/canvas_test_final.png', fullPage: true });
  console.log('\nDone. Final screenshot: /tmp/canvas_test_final.png');
  await browser.close();
})();
