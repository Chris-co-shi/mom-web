import { access, readFile } from 'node:fs/promises';

const requiredPaths = [
  'apps/mom-admin/package.json',
  'apps/mom-admin/src/AuthGate.vue',
  'apps/supplier-portal/package.json',
  'apps/supplier-portal/src/AuthGate.vue',
  'apps/customer-portal/package.json',
  'apps/customer-portal/src/AuthGate.vue',
  'packages/auth/src/index.ts',
  'packages/auth/src/index.test.ts',
  'packages/auth/tsconfig.json',
  'packages/first-party-auth/src/index.ts',
  'packages/first-party-auth/src/index.test.ts',
  'packages/api-client/package.json',
  'packages/api-client/src/index.test.ts',
  'packages/iam-admin/package.json',
  'packages/iam-admin/src/index.ts',
  'packages/iam-admin/src/index.test.ts',
  'packages/portal-access/package.json',
  'packages/portal-access/src/index.ts',
  'packages/portal-access/src/index.test.ts',
  'packages/security-e2e/package.json',
  'packages/security-e2e/src/index.test.ts',
  'packages/access/package.json',
  'packages/common-ui/package.json',
  'packages/common-ui/src/Page.vue',
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

const forbiddenBrowserStorageApis = [
  ['localStorage', /\b(?:(?:globalThis|window)\.)?localStorage\s*\.(?:getItem|setItem|removeItem)\s*\(/u],
  ['indexedDB', /\b(?:(?:globalThis|window)\.)?indexedDB\s*\./u],
  ['document.cookie', /\bdocument\s*\.\s*cookie\b/u],
];

function assertForbiddenStorageApisAbsent(source, moduleName) {
  for (const [name, pattern] of forbiddenBrowserStorageApis) {
    if (pattern.test(source)) {
      throw new Error(`${moduleName} must not use ${name}`);
    }
  }
}

// 标准 OAuth/OIDC 运行时保留为兼容能力，仍只能持久化一次性 PKCE 事务。
const authSource = await readFile('packages/auth/src/index.ts', 'utf8');
assertForbiddenStorageApisAbsent(authSource, '@mom/auth');
if (!authSource.includes('sessionStorage') || !authSource.includes('codeVerifier')) {
  throw new Error('@mom/auth must preserve only the one-time PKCE transaction in sessionStorage');
}

// 当前无 BFF 的第一方 MOM Web 登录明确使用当前标签页 sessionStorage；禁止扩大到跨标签或 Cookie。
const firstPartyAuthSource = await readFile('packages/first-party-auth/src/index.ts', 'utf8');
assertForbiddenStorageApisAbsent(firstPartyAuthSource, '@mom/first-party-auth');
for (const contract of [
  'globalThis.sessionStorage',
  'mom.auth.session.${config.clientId}',
  '/api/iam/auth/login',
  '/api/iam/auth/password/change-required',
  '/api/iam/auth/refresh',
  '/api/iam/auth/logout',
  'refreshFlight',
]) {
  if (!firstPartyAuthSource.includes(contract)) {
    throw new Error(`@mom/first-party-auth must preserve the first-party contract: ${contract}`);
  }
}

const persistedTokenPattern = /(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:access|refresh|id)[_-]?token/iu;
for (const path of [
  'apps/mom-admin/src/runtime.ts',
  'apps/supplier-portal/src/runtime.ts',
  'apps/customer-portal/src/runtime.ts',
  'packages/access/src/index.ts',
  'packages/api-client/src/index.ts',
]) {
  const source = await readFile(path, 'utf8');
  if (persistedTokenPattern.test(source)) {
    throw new Error(`${path} must delegate token storage to the audited auth runtime`);
  }
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
  if (!source.includes('createFirstPartyAuthRuntime')) {
    throw new Error(`${path} must use the MOM first-party authentication runtime`);
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
if (!adminView.includes("import { Page } from '@mom/common-ui'")) {
  throw new Error('MOM Admin pages must use @mom/common-ui Page instead of private page heading markup');
}
if (adminView.includes('class="page-heading"') || adminView.includes('class="management-page"')) {
  throw new Error('MOM Admin must not reintroduce private page heading/container components');
}
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

const portalAccessSource = await readFile('packages/portal-access/src/index.ts', 'utf8');
for (const boundary of [
  "clientId: 'mom-supplier-web'",
  "clientId: 'mom-customer-web'",
  "partyType: 'SUPPLIER'",
  "partyType: 'CUSTOMER'",
  "availability: 'planned'",
  'requiredPermission:',
  'allowedClientId:',
  'allowedUserType:',
  'allowedPartyType:',
  'route:',
]) {
  if (!portalAccessSource.includes(boundary)) {
    throw new Error(`@mom/portal-access must preserve the S10 boundary: ${boundary}`);
  }
}
for (const path of ['apps/supplier-portal/src/App.vue', 'apps/customer-portal/src/App.vue']) {
  const source = await readFile(path, 'utf8');
  if (source.includes('partyId" placeholder') || source.includes('<a-button disabled block>')) {
    throw new Error(`${path} must keep Party fixed and must not expose placeholder operations`);
  }
}

const apiClientSource = await readFile('packages/api-client/src/index.ts', 'utf8');
if (!apiClientSource.includes("headers.set('Idempotency-Key'")
  || apiClientSource.includes("headers.set('X-Idempotency-Key'")) {
  throw new Error('@mom/api-client must use only the Idempotency-Key contract');
}
if (!apiClientSource.includes('ApiClient only accepts Gateway-relative paths')) {
  throw new Error('@mom/api-client must reject direct business-service URLs');
}

console.log(`Validated ${requiredPaths.length} required project boundaries and P1.5 security invariants.`);
