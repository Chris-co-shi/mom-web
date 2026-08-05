import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const profile = process.argv.find((argument) => argument.startsWith('--profile='))?.split('=')[1] ?? 'baseline';
if (!['baseline', 'target'].includes(profile)) {
  throw new Error(`Unsupported bundle profile: ${profile}`);
}

const budgetFile = profile === 'target'
  ? 'quality/bundle-targets.json'
  : 'quality/bundle-baseline.json';
const budgets = JSON.parse(await readFile(resolve(root, budgetFile), 'utf8'));
const applicationFilters = process.argv
  .filter((argument) => argument.startsWith('--application='))
  .map((argument) => argument.split('=')[1]);
const knownApplications = new Set(Object.keys(budgets.applications));
for (const application of applicationFilters) {
  if (!knownApplications.has(application)) {
    throw new Error(`Unknown bundle application: ${application}`);
  }
}
const failures = [];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }
  return files;
}

function collectStaticJavaScript(manifest, key, collected = new Set(), visited = new Set()) {
  if (visited.has(key)) return collected;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Manifest entry not found: ${key}`);
  if (entry.file?.endsWith('.js')) collected.add(entry.file);
  for (const dependency of entry.imports ?? []) {
    collectStaticJavaScript(manifest, dependency, collected, visited);
  }
  return collected;
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const selectedApplications = Object.entries(budgets.applications).filter(
  ([application]) => applicationFilters.length === 0 || applicationFilters.includes(application),
);

console.info(
  `Bundle profile: ${profile} (${budgets.measurement.gzip}); applications: ${selectedApplications.map(([application]) => application).join(', ')}`,
);
for (const [application, budget] of selectedApplications) {
  const dist = resolve(root, budget.dist);
  const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8'));
  const initialFiles = [...collectStaticJavaScript(manifest, 'index.html')].sort();
  const initialBuffers = await Promise.all(initialFiles.map((file) => readFile(join(dist, file))));
  const initialGzipBytes = initialBuffers.reduce(
    (sum, content) => sum + gzipSync(content, { level: 9 }).byteLength,
    0,
  );
  const files = await listFiles(dist);
  const javaScript = files.filter((file) => extname(file) === '.js');
  const chunkSizes = await Promise.all(javaScript.map(async (file) => ({
    file: file.slice(dist.length + 1),
    size: (await readFile(file)).byteLength,
  })));
  const largest = chunkSizes.sort((left, right) => right.size - left.size)[0] ?? { file: '-', size: 0 };
  const sourceMaps = files.filter((file) => file.endsWith('.map'));

  console.info(
    `${application}: initial ${formatKilobytes(initialGzipBytes)} / ${formatKilobytes(budget.initialGzipBytes)}, `
    + `largest ${formatKilobytes(largest.size)} / ${formatKilobytes(budget.maxChunkBytes)}, maps ${sourceMaps.length}`,
  );
  console.info(`  initial JS: ${initialFiles.join(', ')}`);

  if (initialGzipBytes > budget.initialGzipBytes) {
    failures.push(`${application} initial gzip ${initialGzipBytes} > ${budget.initialGzipBytes}`);
  }
  if (largest.size > budget.maxChunkBytes) {
    failures.push(`${application} chunk ${largest.file} ${largest.size} > ${budget.maxChunkBytes}`);
  }
  if (sourceMaps.length > 0) {
    failures.push(`${application} publishes ${sourceMaps.length} source map(s)`);
  }
}

if (failures.length > 0) {
  console.error(`Bundle ${profile} check failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(`Bundle ${profile} check passed.`);
}
