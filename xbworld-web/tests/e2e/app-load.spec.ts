import { test, expect } from '@playwright/test';

test.describe('Application Loading', () => {
  test('should load the index page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toHaveLength(0);
  });

  test('should display the pregame page', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForLoadState('domcontentloaded');

    const pregame = page.locator('#pregame_page');
    await expect(pregame).toBeVisible();
  });

  test('should show the XBWorld logo', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    const logo = page.locator('#pregame_buttons #xbworld_logo');
    await expect(logo).toBeVisible();
  });

  test('should display all pregame buttons', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');

    await expect(page.locator('#start_game_button')).toBeVisible();
    await expect(page.locator('#load_game_button')).toBeVisible();
    await expect(page.locator('#pick_nation_button')).toBeVisible();
    await expect(page.locator('#pregame_settings_button')).toBeVisible();
  });

  test('should have the game page hidden initially', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    const gamePage = page.locator('#game_page');
    await expect(gamePage).toBeHidden();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await expect(page).toHaveTitle('XBWorld');
  });

  test('should load CSS without errors', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    const styles = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.map((s) => ({
        href: s.href,
        rules: s.cssRules?.length ?? 0,
      }));
    });
    expect(styles.length).toBeGreaterThan(0);
  });
});
