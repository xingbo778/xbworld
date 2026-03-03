import { test, expect } from '@playwright/test';

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    // Wait for the modal intro dialog to appear, then dismiss it
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      document.querySelectorAll('dialog').forEach((d) => {
        d.close();
        d.remove();
      });
      const pregame = document.getElementById('pregame_page');
      const gamePage = document.getElementById('game_page');
      if (pregame) pregame.style.display = 'none';
      if (gamePage) gamePage.style.display = '';
    });
  });

  test('should display tab menu', async ({ page }) => {
    const tabMenu = page.locator('#tabs_menu');
    await expect(tabMenu).toBeVisible();
  });

  test('should show map tab by default', async ({ page }) => {
    const mapTab = page.locator('#tabs-map');
    await expect(mapTab).toBeVisible();
  });

  test('should switch to government tab', async ({ page }) => {
    await page.click('#civ_tab a');
    const civTab = page.locator('#tabs-civ');
    await expect(civTab).toBeVisible();
    const mapTab = page.locator('#tabs-map');
    await expect(mapTab).toBeHidden();
  });

  test('should switch to research tab', async ({ page }) => {
    await page.click('#tech_tab a');
    const techTab = page.locator('#tabs-tec');
    await expect(techTab).toBeVisible();
  });

  test('should switch to nations tab', async ({ page }) => {
    await page.click('#players_tab a');
    const natTab = page.locator('#tabs-nat');
    await expect(natTab).toBeVisible();
  });

  test('should switch to cities tab', async ({ page }) => {
    await page.click('#cities_tab a');
    const citiesTab = page.locator('#tabs-cities');
    await expect(citiesTab).toBeVisible();
  });

  test('should switch to options tab', async ({ page }) => {
    await page.click('#opt_tab a');
    const optTab = page.locator('#tabs-opt');
    await expect(optTab).toBeVisible();
  });

  test('should switch back to map tab', async ({ page }) => {
    await page.click('#opt_tab a');
    await page.click('#map_tab a');
    const mapTab = page.locator('#tabs-map');
    await expect(mapTab).toBeVisible();
  });

  test('should highlight active tab', async ({ page }) => {
    await page.click('#civ_tab a');
    const civLi = page.locator('#civ_tab');
    await expect(civLi).toHaveClass(/ui-state-active/);
  });
});
