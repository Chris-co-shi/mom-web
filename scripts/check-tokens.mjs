import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const result = spawnSync(
  process.execPath,
  ['packages/design-tokens/scripts/generate-tokens.mjs', '--check'],
  { cwd: root, stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
