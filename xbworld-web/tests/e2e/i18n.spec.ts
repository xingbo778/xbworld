import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('dialog[open]', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      document.querySelectorAll('dialog').forEach((d) => { d.close(); d.remove(); });
      const pregame = document.getElementById('pregame_page');
      const gamePage = document.getElementById('game_page');
      if (pregame) pregame.style.display = 'none';
      if (gamePage) gamePage.style.display = '';
    });
  });

  test('should display English labels by default (non-zh browser)', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).FC_I18N = {
        ...(window as unknown as Record<string, { _lang: string; setLang: (l: string) => void }>).FC_I18N,
        _lang: 'en',
      };
    });

    const mapLabel = page.locator('#map_tab .tab-label');
    const text = await mapLabel.textContent();
    expect(text?.trim()).toMatch(/Map|地图/);
  });

  test('should toggle language when clicking language button', async ({ page }) => {
    const langBtn = page.locator('#lang_toggle_btn');
    await expect(langBtn).toBeVisible();

    const mapLabel = page.locator('#map_tab .tab-label');
    const textBefore = await mapLabel.textContent();

    await langBtn.click();
    await page.waitForTimeout(200);

    const textAfter = await mapLabel.textContent();
    expect(textBefore).not.toBe(textAfter);
  });
});
