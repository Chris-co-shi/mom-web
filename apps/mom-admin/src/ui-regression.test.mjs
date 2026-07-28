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
