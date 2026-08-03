import { expect, test } from '@playwright/test';

test('匿名入口可以渲染对应应用 Shell', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/MOM/);
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('body')).not.toContainText('Internal Server Error');

  testInfo.annotations.push({ type: 'application', description: testInfo.project.name });
});

test('三应用遵守主题和渠道根契约', async ({ page }, testInfo) => {
  const portal = testInfo.project.name.includes('portal');
  await page.goto('/');
  await expect(page.locator('#app')).not.toBeEmpty();

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-mom-channel', portal ? 'PORTAL' : 'ADMIN');
  await expect(root).toHaveAttribute('data-mom-density', 'COMFORTABLE');
  await expect(root).toHaveAttribute('data-mom-theme', 'LIGHT');

  const cssContract = await root.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      canvas: style.getPropertyValue('--mom-color-surface-canvas').trim(),
      controlHeight: style.getPropertyValue('--mom-channel-control-height').trim(),
    };
  });
  expect(cssContract.canvas).not.toBe('');
  expect(cssContract.controlHeight).toBe(portal ? '44px' : '36px');

  await page.evaluate(async ({ portal }) => {
    const modulePath = '/src/app/theme.ts';
    const current = await import(/* @vite-ignore */ modulePath) as {
      momThemeRuntime: {
        setDensity(value: 'COMFORTABLE' | 'COMPACT'): void;
        setMode(value: 'LIGHT' | 'DARK' | 'SYSTEM'): void;
      };
    };
    current.momThemeRuntime.setMode('DARK');
    current.momThemeRuntime.setDensity('COMPACT');
    if (portal) current.momThemeRuntime.setDensity('COMFORTABLE');
  }, { portal });

  await expect(root).toHaveAttribute('data-mom-theme', 'DARK');
  await expect(root).toHaveAttribute('data-mom-density', portal ? 'COMFORTABLE' : 'COMPACT');
  await expect.poll(() => page.locator('input').first().evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )).toBe('rgb(28, 28, 30)');
});

test('Portal 360px 认证入口不强制桌面宽度', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('portal'), '仅验证 Portal 渠道');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
