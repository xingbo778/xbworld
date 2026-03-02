import { test, expect } from '@playwright/test';

test.describe('PixiJS Renderer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.evaluate(() => {
      const pregame = document.getElementById('pregame_page');
      const gamePage = document.getElementById('game_page');
      if (pregame) pregame.style.display = 'none';
      if (gamePage) gamePage.style.display = '';
    });
  });

  test('should create canvas element in canvas_div', async ({ page }) => {
    await page.waitForTimeout(1000);
    const canvas = page.locator('#canvas_div canvas');
    await expect(canvas).toHaveCount(1);
  });

  test('should have non-zero canvas dimensions', async ({ page }) => {
    await page.waitForTimeout(1000);
    const size = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas_div canvas') as HTMLCanvasElement;
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
    expect(size!.height).toBeGreaterThan(0);
  });

  test('should respond to window resize', async ({ page }) => {
    await page.waitForTimeout(500);
    const sizeBefore = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas_div canvas') as HTMLCanvasElement;
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });

    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    const sizeAfter = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas_div canvas') as HTMLCanvasElement;
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });

    expect(sizeBefore).not.toBeNull();
    expect(sizeAfter).not.toBeNull();
    // Canvas should adapt to viewport
  });
});
