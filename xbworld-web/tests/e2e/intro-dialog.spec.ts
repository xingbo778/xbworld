import { test, expect } from '@playwright/test';

test.describe('Intro Dialog', () => {
  test('should show intro dialog on load', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('.xb-dialog', { timeout: 5000 });

    const dialog = page.locator('.xb-dialog');
    await expect(dialog).toBeVisible();
  });

  test('should have a username input field', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('#username_req', { timeout: 5000 });

    const input = page.locator('#username_req');
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
  });

  test('should validate empty username', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('.xb-dialog', { timeout: 5000 });

    const startBtn = page.locator('.xb-dialog-footer .xb-btn');
    await startBtn.click();

    const validation = page.locator('#username_validation_result');
    await expect(validation).toBeVisible();
  });

  test('should validate short username', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('#username_req', { timeout: 5000 });

    await page.fill('#username_req', 'ab');
    const startBtn = page.locator('.xb-dialog-footer .xb-btn');
    await startBtn.click();

    const validation = page.locator('#username_validation_result');
    await expect(validation).toBeVisible();
  });

  test('should accept valid username and close dialog', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('#username_req', { timeout: 5000 });

    await page.fill('#username_req', 'TestPlayer');
    const startBtn = page.locator('.xb-dialog-footer .xb-btn');
    await startBtn.click();

    // Dialog should close (network will fail but dialog should dismiss)
    await page.waitForTimeout(500);
    const dialog = page.locator('#intro_dialog');
    await expect(dialog).toHaveCount(0);
  });

  test('should remember username from localStorage', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.evaluate(() => localStorage.setItem('username', 'SavedUser'));
    await page.reload();
    await page.waitForSelector('#username_req', { timeout: 5000 });

    const value = await page.inputValue('#username_req');
    expect(value).toBe('SavedUser');
  });

  test('should close dialog via X button', async ({ page }) => {
    await page.goto('/src/main/webapp/webclient/index.html');
    await page.waitForSelector('.xb-dialog', { timeout: 5000 });

    const closeBtn = page.locator('.xb-dialog-close');
    await closeBtn.click();

    await page.waitForTimeout(300);
    const dialog = page.locator('.xb-dialog');
    await expect(dialog).toHaveCount(0);
  });
});
