import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('MOM Page owns its fixed-tab safety spacing', async () => {
  const pageStyles = await read('../../../packages/common-ui/src/styles.css');
  const generatedTokens = await read('../../../packages/design-tokens/src/generated/tokens.css');

  assert.match(
    pageStyles,
    /\.mom-page\s*\{[^}]*padding-top:\s*var\(--mom-space-3\);/s,
  );
  assert.match(generatedTokens, /--mom-space-3:\s*12px;/);
});

test('IAM pages expose one semantic title and description through MOM Page', async () => {
  const adminView = await read('./App.vue');
  const pageTags = [...adminView.matchAll(/<Page\b[^>]*>/gs)].map(
    ([tag]) => tag,
  );

  assert.equal(pageTags.length, 6);
  for (const tag of pageTags) {
    assert.equal((tag.match(/:title=/g) ?? []).length, 1);
    assert.equal((tag.match(/:description=/g) ?? []).length, 1);
  }
  assert.doesNotMatch(adminView, /<template #extra>\s*<a-button[^>]*createUserOpen/);
});

test('IAM pages adopt the governed Admin page layout contracts', async () => {
  const adminView = await read('./App.vue');
  const userSection = adminView.slice(
    adminView.indexOf("section === 'users'"),
    adminView.indexOf("section === 'roles'"),
  );
  const roleSection = adminView.slice(
    adminView.indexOf("section === 'roles'"),
    adminView.indexOf("section === 'permissions'"),
  );
  const permissionSection = adminView.slice(
    adminView.indexOf("section === 'permissions'"),
    adminView.indexOf("section === 'sessions'"),
  );

  assert.match(userSection, /<AdminFilterBar\b[^>]*@submit="loadUsers"/);
  assert.match(userSection, /for="iam-user-type-filter">\{\{ \$t\('mom\.fields\.userType'\) \}\}<\/label>/);
  assert.match(userSection, /id="iam-user-type-filter"[^>]*iam-filter--user-type/);
  assert.match(userSection, /for="iam-user-status-filter">\{\{ \$t\('mom\.fields\.status'\) \}\}<\/label>/);
  assert.match(userSection, /id="iam-user-status-filter"[^>]*iam-filter--status/);
  assert.match(userSection, /<template #actions>/);
  assert.match(userSection, /createUserOpen = true/);
  assert.match(userSection, /<AdminMasterDetail :has-detail="Boolean\(selectedUser\)"/);
  assert.match(userSection, /<AdminContentSection :title="\$t\('mom\.titles\.userDirectory'\)"/);
  assert.match(roleSection, /mom\.titles\.roleDirectory/);
  assert.match(roleSection, /<AdminMasterDetail :has-detail="Boolean\(selectedRole\)"/);
  assert.match(roleSection, /<template #actions>.*createRoleOpen = true/s);
  assert.doesNotMatch(roleSection, /<a-empty\b/);
  assert.match(permissionSection, /<AdminContentSection.*<template #actions>.*loadPermissions/s);

  assert.doesNotMatch(adminView, /class="(?:filter-card|split-grid|directory-card)"/);
});

test('MOM Admin keeps a token-scale content safety gutter on every side', async () => {
  const shell = await read('./layouts/admin-shell.vue');
  const generatedTokens = await read('../../../packages/design-tokens/src/generated/tokens.css');

  assert.match(shell, /padding:\s*var\(--mom-channel-page-gutter\);/);
  assert.match(generatedTokens, /--mom-channel-page-gutter:\s*24px;/);
});

test('MOM Admin uses a local logo that remains visible when collapsed', async () => {
  const shell = await read('./layouts/admin-shell.vue');
  const sidebar = await read('./layouts/admin-shell/AdminSidebar.vue');
  const logo = await read('./assets/mom-logo.svg');

  assert.match(shell, /import momLogo from '\.\.\/assets\/mom-logo\.svg';/);
  assert.match(shell, /:logo-source="momLogo"/);
  assert.match(sidebar, /data-collapsed/);
  assert.match(logo, /<svg\b/);
  assert.match(logo, /<title[^>]*>MOM<\/title>/);
});

test('OAuth Client reason is part of the list command toolbar', async () => {
  const adminView = await read('./App.vue');
  const clientSection = adminView.slice(
    adminView.indexOf("section === 'clients'"),
    adminView.indexOf('<a-empty v-else-if='),
  );

  assert.match(clientSection, /mom\.titles\.clientDirectory/);
  assert.match(clientSection, /<AdminContentSection/);
  assert.match(clientSection, /class="client-command-bar"/);
  assert.match(clientSection, /id="client-status-reason"/);
  assert.doesNotMatch(
    clientSection,
    /<AdminFilterBar/,
  );
});

test('匿名外观控件只修改 MOM 当前运行实例', async () => {
  const auth = await read('./layouts/auth.vue');
  const theme = await read('./app/theme.ts');
  const locales = await read('./locales/index.ts');

  assert.match(auth, /setAnonymousThemeMode/);
  assert.match(auth, /setLocale/);
  assert.match(theme, /mode: 'LIGHT'/);
  assert.match(locales, /fallbackLocale: appConfig\.defaultLocale/);
  const legacyPackageScope = ['@', 'vben'].join('');
  assert.equal(`${auth}\n${theme}\n${locales}`.includes(legacyPackageScope), false);
});

test('MOM Admin Shell owns static task navigation without a Vben runtime closure', async () => {
  const shell = await read('./layouts/admin-shell.vue');
  const header = await read('./layouts/admin-shell/AdminHeader.vue');
  const sidebar = await read('./layouts/admin-shell/AdminSidebar.vue');
  const access = await read('./router/access.ts');
  const routes = await read('./router/routes.ts');

  assert.match(shell, /<AdminSidebar\b/);
  assert.match(shell, /<AdminHeader\b/);
  assert.match(shell, /<RouterView\s*\/>/);
  const legacyPackageScope = ['@', 'vben'].join('');
  assert.equal(shell.includes(legacyPackageScope), false);
  assert.doesNotMatch(shell, /BasicLayout|Tabbar|UserDropdown/);
  assert.match(header, /mom-admin-header__factory/);
  assert.match(header, /openPreferences/);
  assert.match(header, /logout/);
  assert.match(sidebar, /aria-current/);
  assert.match(access, /firstAccessibleTaskPath/);
  assert.doesNotMatch(access, /generateAccessible|useAccessStore|useTabbarStore|useUserStore/);
  assert.match(routes, /ADMIN_TASKS\.map/);
  assert.match(routes, /component:\s*\(\) => import\('\.\.\/layouts\/admin-shell\.vue'\)/);
});

test('MOM task navigation uses two product domains and never restores System Management', async () => {
  const contract = await read('./router/task-contract.ts');
  const routes = await read('./router/routes.ts');
  const zh = await read('./locales/langs/zh-CN/mom.json');

  assert.match(contract, /key: 'people-access'/);
  assert.match(contract, /key: 'security-operations'/);
  assert.equal((contract.match(/routeKey: 'mom-admin\./g) ?? []).length, 6);
  assert.equal((contract.match(/requiredPermission: 'iam:/g) ?? []).length, 6);
  assert.doesNotMatch(routes, /mom\.menu\.system/);
  assert.doesNotMatch(zh, /系统管理/);
  assert.match(zh, /人员与访问/);
  assert.match(zh, /安全运营/);
});

test('MOM Admin authentication finish handlers bind an Ant Form model', async () => {
  const authenticationViews = [
    './views/auth/login.vue',
    './views/auth/password-change.vue',
  ];

  for (const path of authenticationViews) {
    const source = await read(path);
    const formTags = [...source.matchAll(/<a-form\b[^>]*>/gs)]
      .map(([tag]) => tag)
      .filter((tag) => tag.includes('@finish'));

    assert.equal(
      formTags.length,
      1,
      `${path} must keep exactly one authentication finish form`,
    );
    assert.match(
      formTags[0],
      /:model="form"/,
      `${path} must bind its reactive model before using Ant Form finish`,
    );
    assert.match(
      formTags[0],
      /@finish="submit"/,
      `${path} must delegate successful form submission to submit()`,
    );
  }
});

test('MOM Admin authentication tasks own the only level-one heading and named fields', async () => {
  const login = await read('./views/auth/login.vue');
  const passwordChange = await read('./views/auth/password-change.vue');
  const authLayout = await read('./layouts/auth.vue');

  assert.equal((login.match(/<h1>/g) ?? []).length, 1);
  assert.equal((passwordChange.match(/<h1>/g) ?? []).length, 1);
  assert.doesNotMatch(authLayout, /<h1>/);
  assert.doesNotMatch(
    authLayout,
    /Authentication(?:Color|Layout)Toggle/,
  );

  for (const source of [login, passwordChange]) {
    const fieldIds = [...source.matchAll(/\bid="([^"]+)"/g)]
      .map(([, id]) => id)
      .filter((id) => id.startsWith('mom-admin-'));
    assert.ok(fieldIds.length >= 2);
    for (const id of fieldIds) {
      assert.match(source, new RegExp(`html-for="${id}"`));
    }
  }
});
