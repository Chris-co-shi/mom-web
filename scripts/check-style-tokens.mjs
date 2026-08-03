import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ledger = JSON.parse(
  await readFile(resolve(root, 'quality/s01-style-exceptions.json'), 'utf8'),
);
const roots = ['apps', 'packages/common-ui'];
const allowedExtensions = new Set(['.css', '.ts', '.vue']);
const rules = {
  'color-literal': /#[0-9a-f]{3,8}\b|\b(?:hsl|hsla|rgb|rgba)\(/giu,
  'important': /!important\b/gu,
  'inline-style': /\sstyle\s*=\s*["']/gu,
};
const expected = new Map(
  ledger.exceptions.map((item) => [`${item.file}:${item.rule}`, item.count]),
);
const actual = new Map();

for (const directory of roots) {
  for (const file of await filesUnder(resolve(root, directory))) {
    if (!allowedExtensions.has(extname(file))) continue;
    const relative = file.replace(`${root}/`, '');
    const content = await readFile(file, 'utf8');
    for (const [rule, pattern] of Object.entries(rules)) {
      const count = [...content.matchAll(pattern)].length;
      if (count > 0) actual.set(`${relative}:${rule}`, count);
    }
  }
}

const failures = [];
for (const [key, count] of actual) {
  if (!expected.has(key)) failures.push(`${key}: ${count} occurrence(s), no approved exception`);
  else if (expected.get(key) !== count) failures.push(`${key}: expected ${expected.get(key)}, found ${count}`);
}
for (const [key, count] of expected) {
  if (!actual.has(key)) failures.push(`${key}: approved ${count}, but no occurrence remains; remove the stale exception`);
}

if (failures.length > 0) {
  console.error('Style token governance failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
else {
  console.info(`Style token governance passed (${expected.size} precise exception).`);
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ['dist', 'node_modules'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(path));
    else result.push(path);
  }
  return result;
}
