const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = 'https://xbworld-production.up.railway.app/webclient/index.html?action=observe&civserverport=6000';
  
  console.log('1. Navigating to observer page...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/canvas_test_1_loaded.png', fullPage: true });
  console.log('   Screenshot 1 saved');

  // Check for errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // Check if jQuery loaded
  const jqueryLoaded = await page.evaluate(() => typeof $ !== 'undefined' && typeof jQuery !== 'undefined');
  console.log('   jQuery loaded:', jqueryLoaded);

  // Check if dialog appeared
  const dialogVisible = await page.evaluate(() => {
    const dialog = document.querySelector('.ui-dialog, #dialog, .sweet-overlay');
    return dialog ? dialog.style.display !== 'none' : false;
  });
  console.log('   Dialog visible:', dialogVisible);

  // Check for username input
  const usernameInput = await page.$('#username_req');
  console.log('   Username input found:', !!usernameInput);

  if (usernameInput) {
    console.log('\n2. Entering username and clicking Start Game...');
    await page.fill('#username_req', 'observer1');
    await page.waitForTimeout(500);
    
    // Try clicking the Start Game button
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, .ui-button, .ui-dialog-buttonset button');
      for (const b of btns) {
        const text = b.textContent || b.innerText || '';
        if (text.includes('Start') || text.includes('Ok') || text.includes('OK')) {
          b.click();
          return text;
        }
      }
      return null;
    });
    console.log('   Clicked button:', clicked);
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/canvas_test_2_after_start.png', fullPage: true });
    console.log('   Screenshot 2 saved');

    // Wait for game to load
    console.log('\n3. Waiting for game to load (20s)...');
    await page.waitForTimeout(20000);
    await page.screenshot({ path: '/tmp/canvas_test_3_game.png', fullPage: true });
    console.log('   Screenshot 3 saved');

    // Check game state
    const gameState = await page.evaluate(() => {
      const result = {};
      result.gamePageVisible = document.getElementById('game_page')?.style.display !== 'none';
      result.canvasExists = !!document.getElementById('canvas');
      result.canvasSize = result.canvasExists ? {
        width: document.getElementById('canvas').width,
        height: document.getElementById('canvas').height
      } : null;
      result.tilesLoaded = typeof tiles !== 'undefined' && tiles !== null;
      result.tileCount = result.tilesLoaded ? Object.keys(tiles).length : 0;
      result.mapExists = typeof map !== 'undefined' && map !== null;
      result.mapSize = result.mapExists ? { x: map.xsize, y: map.ysize } : null;
      result.spritesInit = typeof sprites_init !== 'undefined' ? sprites_init : 'undefined';
      result.tilesetImagesLoaded = typeof tileset_images !== 'undefined' ? tileset_images.length : 0;
      result.renderer = typeof renderer !== 'undefined' ? renderer : 'undefined';
      result.civclientState = typeof civclient_state !== 'undefined' ? civclient_state : 'undefined';
      result.observing = typeof observing !== 'undefined' ? observing : 'undefined';
      result.wsState = typeof ws !== 'undefined' && ws !== null ? ws.readyState : 'no ws';
      return result;
    });
    console.log('\n4. Game state:', JSON.stringify(gameState, null, 2));
  } else {
    console.log('   No username input found - checking page content...');
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('   Page text:', bodyText);
  }

  // Check for console errors
  const pageErrors = await page.evaluate(() => {
    return window.__errors || [];
  });
  
  if (errors.length > 0) {
    console.log('\n5. Page errors:', errors.slice(0, 5));
  } else {
    console.log('\n5. No page errors detected');
  }

  // Final screenshot
  await page.screenshot({ path: '/tmp/canvas_test_final.png', fullPage: true });
  console.log('\nFinal screenshot saved to /tmp/canvas_test_final.png');

  await browser.close();
})();
