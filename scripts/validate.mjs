import { access, readFile } from 'node:fs/promises';

const requiredPaths = [
  'apps/mom-admin/package.json',
  'apps/supplier-portal/package.json',
  'apps/customer-portal/package.json',
  'packages/auth/src/index.ts',
  'packages/auth/tsconfig.json',
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

const authSource = await readFile('packages/auth/src/index.ts', 'utf8');
for (const forbidden of ['localStorage', 'indexedDB', 'document.cookie']) {
  if (authSource.includes(forbidden)) {
    throw new Error(`@mom/auth must not persist application tokens via ${forbidden}`);
  }
}
if (!authSource.includes('sessionStorage') || !authSource.includes('codeVerifier')) {
  throw new Error('@mom/auth must preserve only the one-time PKCE transaction in sessionStorage');
}

const appContracts = [
  ['apps/mom-admin/src/runtime.ts', 'mom-admin-web', 'INTERNAL'],
  ['apps/supplier-portal/src/runtime.ts', 'mom-supplier-web', 'SUPPLIER'],
  ['apps/customer-portal/src/runtime.ts', 'mom-customer-web', 'CUSTOMER'],
];
for (const [path, clientId, userType] of appContracts) {
  const source = await readFile(path, 'utf8');
  if (!source.includes(clientId) || !source.includes(userType)) {
    throw new Error(`${path} must preserve the frozen Client/user_type matrix`);
  }
}

console.log(`Validated ${requiredPaths.length} required project boundaries and S08 auth invariants.`);
