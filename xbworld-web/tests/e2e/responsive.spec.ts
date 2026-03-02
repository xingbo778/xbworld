import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/src/main/webapp/webclient/index.html');

    const pregame = page.locator('#pregame_page');
    await expect(pregame).toBeVisible();
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/src/main/webapp/webclient/index.html');

    const pregame = page.locator('#pregame_page');
    await expect(pregame).toBeVisible();
  });

  test('should adapt to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/src/main/webapp/webclient/index.html');

    const pregame = page.locator('#pregame_page');
    await expect(pregame).toBeVisible();
  });

  test('should hide tab labels on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/src/main/webapp/webclient/index.html');

    await page.evaluate(() => {
      const pregame = document.getElementById('pregame_page');
      const gamePage = document.getElementById('game_page');
      if (pregame) pregame.style.display = 'none';
      if (gamePage) gamePage.style.display = '';
    });

    const tabLabel = page.locator('.tab-label').first();
    await expect(tabLabel).toBeHidden();
  });

  test('should show tab labels on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/src/main/webapp/webclient/index.html');

    await page.evaluate(() => {
      const pregame = document.getElementById('pregame_page');
      const gamePage = document.getElementById('game_page');
      if (pregame) pregame.style.display = 'none';
      if (gamePage) gamePage.style.display = '';
    });

    const tabLabel = page.locator('.tab-label').first();
    await expect(tabLabel).toBeVisible();
  });
});
