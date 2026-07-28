import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('MOM Page owns its fixed-tab safety spacing', async () => {
  const pageStyles = await read('../../../packages/common-ui/src/styles.css');

  assert.match(
    pageStyles,
    /\.mom-page\s*\{[^}]*padding-top:\s*12px;/s,
  );
});

test('IAM pages use breadcrumbs as the only page heading', async () => {
  const adminView = await read('./App.vue');
  const pageTags = [...adminView.matchAll(/<Page\b[^>]*>/gs)].map(
    ([tag]) => tag,
  );

  assert.equal(pageTags.length, 6);
  for (const tag of pageTags) {
    assert.doesNotMatch(tag, /:title=/);
    assert.doesNotMatch(tag, /:description=/);
  }
  assert.doesNotMatch(adminView, /<template #extra>\s*<a-button[^>]*createUserOpen/);
});

test('IAM actions stay with their list or filter containers', async () => {
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

  assert.match(userSection, /class="user-command-bar"/);
  assert.match(userSection, /createUserOpen = true/);
  assert.match(roleSection, /mom\.titles\.roleDirectory/);
  assert.match(roleSection, /<template #extra>.*createRoleOpen = true/s);
  assert.match(permissionSection, /<template #extra>.*loadPermissions/s);
});

test('MOM Admin uses a local logo that remains visible when collapsed', async () => {
  const preferences = await read('./preferences.ts');
  const logo = await read('./assets/mom-logo.svg');

  assert.match(preferences, /import momLogo from '\.\/assets\/mom-logo\.svg';/);
  assert.match(preferences, /logo:\s*\{[^}]*source:\s*momLogo,/s);
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
  assert.match(clientSection, /class="client-command-bar"/);
  assert.match(clientSection, /id="client-status-reason"/);
  assert.doesNotMatch(
    clientSection,
    /<a-card size="small" class="filter-card">/,
  );
});

test('Preferences header button calls the Drawer open slot action', async () => {
  const preferences = await read(
    '../../../packages/effects/layouts/src/widgets/preferences/preferences.vue',
  );
  const button = await read(
    '../../../packages/effects/layouts/src/widgets/preferences/preferences-button.vue',
  );

  assert.match(preferences, /<slot :open="openPreferences">/);
  assert.match(preferences, /@click="openPreferences"/);
  assert.match(button, /v-slot="\{ open \}"/);
  assert.match(button, /@click="open"/);
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
