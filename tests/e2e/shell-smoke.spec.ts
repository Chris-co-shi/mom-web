import { expect, test, type Page } from '@playwright/test';

async function installAdminAuthenticatedFixture(
  page: Page,
  permissions: string[] = [
    'iam:user:read',
    'iam:role:read',
    'iam:permission:read',
    'iam:session:read',
    'iam:audit:read',
    'iam:client:read',
  ],
): Promise<string[]> {
  const requestedFactories: string[] = [];

  await page.addInitScript(() => {
    const now = Date.now();
    sessionStorage.setItem('mom.auth.session.mom-admin-web', JSON.stringify({
      accessExpiresAt: now + 30 * 60 * 1000,
      accessToken: 'e2e-access-token',
      refreshToken: 'e2e-refresh-token',
      sessionExpiresAt: now + 60 * 60 * 1000,
      sessionId: 'e2e-session',
      tokenType: 'Bearer',
    }));
  });

  await page.route('**/api/iam/me', async (route) => {
    const requestedFactory = route.request().headers()['x-factory-id'];
    if (requestedFactory) requestedFactories.push(requestedFactory);
    await route.fulfill({
      json: {
        clientId: 'mom-admin-web',
        currentFactoryId: requestedFactory || 'F01',
        displayName: 'E2E Administrator',
        factoryIds: ['F01', 'F02'],
        partyId: null,
        partyType: null,
        permissions,
        roles: ['PLATFORM_ADMIN'],
        userId: '1001',
        username: 'e2e-admin',
        userType: 'INTERNAL',
      },
    });
  });
  await page.route('**/api/system/preferences/me', async (route) => {
    await route.fulfill({
      json: {
        density: 'COMFORTABLE',
        displayTimezone: 'Asia/Shanghai',
        locale: 'zh-CN',
        pageSize: 20,
        persisted: true,
        sources: {
          density: 'USER',
          displayTimezone: 'USER',
          locale: 'USER',
          pageSize: 'USER',
          themeMode: 'USER',
        },
        themeMode: 'LIGHT',
        updatedAt: '2026-08-04T00:00:00Z',
        version: 1,
      },
    });
  });
  await page.route('**/api/system/i18n/**', async (route) => {
    await route.fulfill({ json: { code: 'NOT_FOUND' }, status: 404 });
  });
  await page.route('**/api/iam/admin/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  return requestedFactories;
}

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

test('匿名入口不激活或请求用户 System Runtime', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-mom-system-runtime', 'idle');
  await expect(root).toHaveAttribute('data-mom-system-preference-source', 'static');
  await expect(root).toHaveAttribute('data-mom-system-i18n-source', 'static');
  const requestedSystem = await page.evaluate(() =>
    performance.getEntriesByType('resource').some(
      (entry) => entry.name.includes('/api/system/'),
    ),
  );
  expect(requestedSystem).toBe(false);
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

test('AuthShell 在渠道目标视口保持可操作且无横向溢出', async ({ page }, testInfo) => {
  const portal = testInfo.project.name.includes('portal');
  const widths = portal ? [360, 768, 1280] : [1024, 1280, 1600];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/auth/login');
    const shell = page.locator('.mom-auth-shell');
    await expect(shell).toBeVisible();
    await expect(shell).toHaveAttribute('data-channel', portal ? 'PORTAL' : 'ADMIN');

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
  }
});

test('认证任务拥有唯一主标题、具名字段和具名工具按钮', async ({ page }, testInfo) => {
  const supplier = testInfo.project.name.includes('supplier');
  const customer = testInfo.project.name.includes('customer');
  const taskTitle = supplier ? '供应商登录' : customer ? '客户登录' : /登录/;
  const usernameLabel = supplier || customer ? '用户名' : '账号';

  await page.goto('/auth/login');

  await expect(page.getByRole('heading', { level: 1, name: taskTitle })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: usernameLabel })).toBeVisible();
  await expect(page.getByLabel('密码', { exact: true })).toBeVisible();

  const unnamedButtons = await page.getByRole('button').evaluateAll((buttons) =>
    buttons.filter((button) => {
      const label = button.getAttribute('aria-label')?.trim();
      const text = button.textContent?.trim();
      const title = button.getAttribute('title')?.trim();
      return !label && !text && !title;
    }).length,
  );
  expect(unnamedButtons).toBe(0);
});

test('Portal 认证入口不暴露内部授权实现术语', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('portal'), '仅验证 Portal 渠道');
  await page.goto('/');

  await expect(page.locator('body')).not.toContainText(/IAM|Factory Scope|Portal Session/);
  await expect(page.locator('body')).toContainText('授权工厂');
});

test('认证入口在 200% 文本缩放下保留表单与提交按钮', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/auth/login');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  await expect(page.locator('.mom-auth-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('Portal 匿名入口不提前加载认证后应用模块', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('portal'), '仅验证 Portal 渠道');
  await page.goto('/');
  await expect(page.locator('.mom-auth-shell')).toBeVisible();

  const authenticatedModuleLoaded = await page.evaluate(() =>
    performance.getEntriesByType('resource').some(
      (entry) => entry.name.includes('/src/App.vue'),
    ),
  );
  expect(authenticatedModuleLoaded).toBe(false);
});

test('Admin 匿名访问强制改密深链保持受保护并回到 AuthShell', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mom-admin'), '仅验证 Admin 渠道');
  await page.goto('/auth/change-password?username=admin');

  await expect(page).toHaveURL(/\/auth\/login\?redirect=/);
  await expect(page.locator('.mom-auth-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: /登\s*录/ })).toBeVisible();
});

test('Admin 匿名外观切换只作用于当前实例', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mom-admin'), '仅验证 Admin 渠道');
  await page.goto('/auth/login');

  await page.getByRole('button', { name: '切换语言' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to MOM Admin' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-mom-theme', 'DARK');
  expect(await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }))).toEqual({ local: 0, session: 0 });
});

test('Admin 静态深链按权限 fail closed 且 Core Error Route 可达', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mom-admin'), '仅验证 Admin 渠道');
  await installAdminAuthenticatedFixture(page, ['iam:user:read']);

  await page.goto('/iam/audit');
  await expect(page).toHaveURL(/\/403\?from=/);
  await expect(page.getByRole('link', { name: '安全审计' })).toHaveCount(0);
  await expect(page.getByText('无权访问', { exact: true })).toBeVisible();

  await page.goto('/catalog-error');
  await expect(page.getByText('应用目录暂不可用', { exact: true })).toBeVisible();

  await page.goto('/not-a-registered-task');
  await expect(page.getByText('页面不存在', { exact: true })).toBeVisible();
});

test('Admin 登录后使用 MOM 任务 Shell 并保持上下文与响应式契约', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mom-admin'), '仅验证 Admin 渠道');
  const requestedFactories = await installAdminAuthenticatedFixture(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/iam/users');

  const shell = page.locator('.mom-admin-shell');
  const sidebar = page.locator('.mom-admin-sidebar');
  await expect(shell).toBeVisible();
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  await expect(page.getByRole('heading', { level: 2, name: '人员与访问' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '安全运营' })).toBeVisible();
  await expect(page.getByRole('link', { name: '用户与授权' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: '当前位置' })).toContainText('平台治理');
  await expect(page.locator('[role="tablist"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('系统管理');

  await page.getByRole('link', { name: '角色配置' }).click();
  await expect(page).toHaveURL(/\/iam\/roles$/);
  await expect(page.getByRole('link', { name: '角色配置' })).toHaveAttribute('aria-current', 'page');

  const factorySelect = page.getByRole('combobox', { name: '当前工厂' });
  await factorySelect.focus();
  await factorySelect.press('Enter');
  await factorySelect.press('ArrowDown');
  await factorySelect.press('Enter');
  await expect.poll(() => requestedFactories.at(-1)).toBe('F02');
  await expect(page).toHaveURL(/\/iam\/roles$/);

  await page.getByRole('button', { name: '显示偏好' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { level: 1, name: '个人偏好' })).toBeVisible();
  await expect(page.locator('body')).toContainText('完整偏好设置将在后续阶段提供');

  await page.getByRole('button', { name: '收起侧边栏' }).click();
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(0);
});

test('Admin 已认证页面覆盖目标视口、主题、密度、文本缩放与减少动效', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mom-admin'), '仅验证 Admin 渠道');
  await installAdminAuthenticatedFixture(page);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/iam/users');
  await expect(page.locator('.mom-admin-sidebar')).toHaveAttribute('data-collapsed', 'true');
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(page.locator('.mom-admin-sidebar')).toHaveAttribute('data-collapsed', 'false');

  for (const width of [1024, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/iam/users');

    await expect(page.locator('.mom-admin-shell')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: '用户管理' })).toHaveCount(1);
    await expect(page.getByRole('search', { name: '用户管理' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '用户目录' })).toBeVisible();
    await expect(page.locator('.mom-admin-sidebar')).toHaveAttribute(
      'data-collapsed',
      width < 1280 ? 'true' : 'false',
    );

    for (const mode of ['LIGHT', 'DARK', 'SYSTEM'] as const) {
      for (const density of ['COMFORTABLE', 'COMPACT'] as const) {
        await page.evaluate(async ({ density, mode }) => {
          const current = await import('/src/app/theme.ts') as {
            momThemeRuntime: {
              setDensity(value: 'COMFORTABLE' | 'COMPACT'): void;
              setMode(value: 'LIGHT' | 'DARK' | 'SYSTEM'): void;
            };
          };
          current.momThemeRuntime.setMode(mode);
          current.momThemeRuntime.setDensity(density);
        }, { density, mode });

        const root = page.locator('html');
        await expect(root).toHaveAttribute('data-mom-theme-mode', mode);
        await expect(root).toHaveAttribute('data-mom-theme', mode === 'SYSTEM' ? 'DARK' : mode);
        await expect(root).toHaveAttribute('data-mom-density', density);
        await expect.poll(() => page.evaluate(() => (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        ))).toBeLessThanOrEqual(0);
      }
    }

    const reducedMotion = await page.locator('.mom-admin-sidebar').evaluate((element) => ({
      token: getComputedStyle(document.documentElement)
        .getPropertyValue('--mom-motion-standard')
        .trim(),
      transitionDuration: getComputedStyle(element).transitionDuration,
    }));
    expect(reducedMotion.token).toBe('0ms');
    expect(reducedMotion.transitionDuration.split(',').every(
      (duration) => duration.trim() === '0s',
    )).toBe(true);
  }

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/iam/users');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect(page.getByRole('heading', { level: 1, name: '用户管理' })).toBeVisible();
  await expect(page.getByRole('search', { name: '用户管理' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(0);
});
