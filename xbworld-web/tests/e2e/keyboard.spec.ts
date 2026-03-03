import { test, expect } from '@playwright/test';

test.describe('Keyboard Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
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

  test('should not trigger hotkeys when typing in chat', async ({ page }) => {
    const chatInput = page.locator('#game_text_input');
    await chatInput.focus();
    await chatInput.type('g');

    const value = await chatInput.inputValue();
    expect(value).toBe('g');
  });

  test('should handle Shift+Enter for turn done', async ({ page }) => {
    // Just verify no crash on keypress
    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
    // No error expected
  });

  test('should handle hotkey G for goto', async ({ page }) => {
    // Click on map area first to ensure focus is not on input
    const canvasDiv = page.locator('#canvas_div');
    await canvasDiv.click();
    await page.keyboard.press('g');
    // No error expected — goto mode should activate
  });
});
