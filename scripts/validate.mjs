import { access, readFile } from 'node:fs/promises';

const requiredPaths = [
  'apps/mom-admin/package.json',
  'apps/supplier-portal/package.json',
  'apps/customer-portal/package.json',
  'packages/auth/src/index.ts',
  'packages/auth/src/index.test.ts',
  'packages/auth/tsconfig.json',
  'packages/api-client/package.json',
  'packages/api-client/src/index.test.ts',
  'packages/iam-admin/package.json',
  'packages/iam-admin/src/index.ts',
  'packages/iam-admin/src/index.test.ts',
  'packages/access/package.json',
  'packages/design-tokens/package.json',
  'packages/domain-components/package.json',
  'packages/shared/package.json',
  'packages/traceability-graph/package.json',
  'tsconfig.test.json',
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

const iamAdminSource = await readFile('packages/iam-admin/src/index.ts', 'utf8');
for (const contract of [
  '/users/${id(userId)}/authorizations',
  '/roles/${id(roleId)}/permissions',
  'userVersion',
  'roleVersion',
  "value.code === 'stale_version'",
]) {
  if (!iamAdminSource.includes(contract)) {
    throw new Error(`@mom/iam-admin must preserve the S07 hardened contract: ${contract}`);
  }
}

const adminView = await readFile('apps/mom-admin/src/App.vue', 'utf8');
for (const permission of [
  'iam:user:read',
  'iam:role:read',
  'iam:permission:read',
  'iam:session:read',
  'iam:audit:read',
  'iam:client:read',
]) {
  if (!adminView.includes(permission)) {
    throw new Error(`MOM Admin must gate the S09 section with ${permission}`);
  }
}

console.log(`Validated ${requiredPaths.length} required project boundaries and S08/S09 security invariants.`);
