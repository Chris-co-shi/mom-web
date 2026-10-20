import { expect, test } from '@playwright/test';

test('Chrome 可打开 MOM 登录页并登录进入 MDM 与 WMS', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('#auth-entry-title')).toBeVisible();
  await expect(page.locator('#login-username')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  console.log('PASS 登录页已正常显示。请在打开的 Chrome 中手动登录。');

  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 5 * 60 * 1000 });

  await page.locator('[data-navigation-group="mdm"]').click();
  await page.locator('[data-navigation-section="organization-resources"]').click();
  await page.locator('a[href="/master-data/plants"]').click();
  await expect(page).toHaveURL(/\/master-data\/plants$/);
  await expect(page.locator('#main-content')).toBeVisible();
  console.log('PASS 已通过 MDM 导航进入工厂管理页。');

  await page.locator('[data-navigation-group="wms"]').click();
  await page.locator('a[href="/wms/inventory"]').click();
  await expect(page).toHaveURL(/\/wms\/inventory$/);
  await expect(page.locator('#main-content')).toBeVisible();
  console.log('PASS 已通过 WMS 导航进入实时库存总览页。');
});
