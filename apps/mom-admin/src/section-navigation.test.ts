import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SECTION_DEFINITIONS,
  sectionFromRoute,
} from './section-navigation.js';

test('preserves every registered IAM section from route metadata', () => {
  for (const definition of SECTION_DEFINITIONS) {
    assert.equal(sectionFromRoute(definition.key), definition.key);
  }
});

test('falls back to users for missing or unknown route metadata', () => {
  for (const value of [undefined, null, '', 'unknown', 1, {}]) {
    assert.equal(sectionFromRoute(value), 'users');
  }
});
