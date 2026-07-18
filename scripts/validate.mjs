import { access, readFile } from 'node:fs/promises';

const requiredPaths = [
  'apps/mom-admin/package.json',
  'apps/supplier-portal/package.json',
  'apps/customer-portal/package.json',
  'packages/api-client/package.json',
  'packages/access/package.json',
  'packages/design-tokens/package.json',
  'packages/domain-components/package.json',
  'packages/shared/package.json',
  'packages/traceability-graph/package.json',
  'docs/prototypes/README.md',
  'docs/page-state-matrix/README.md',
  'docs/api-mapping/README.md',
];

for (const path of requiredPaths) await access(path);

const rootPackage = JSON.parse(await readFile('package.json', 'utf8'));
if (rootPackage.packageManager !== 'pnpm@11.7.0') {
  throw new Error('packageManager must remain pinned to pnpm@11.7.0');
}
if (!rootPackage.engines?.node?.includes('22.18.0')) {
  throw new Error('Node engine must preserve the Vben 5.7 baseline');
}

console.log(`Validated ${requiredPaths.length} required project boundaries.`);
