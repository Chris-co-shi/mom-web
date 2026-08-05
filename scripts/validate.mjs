import { access, readFile, readdir } from 'node:fs/promises';

const requiredPaths = [
  'apps/mom-admin/package.json',
  'apps/mom-admin/src/app/config.ts',
  'apps/mom-admin/src/app/theme.ts',
  'apps/mom-admin/src/bootstrap.ts',
  'apps/mom-admin/src/section-navigation.ts',
  'apps/mom-admin/src/section-navigation.test.ts',
  'apps/mom-admin/src/router/access.ts',
  'apps/mom-admin/src/router/catalog.ts',
  'apps/mom-admin/src/router/catalog-contract.ts',
  'apps/mom-admin/src/router/dynamic-task-routes.ts',
  'apps/mom-admin/src/router/routes.ts',
  'apps/mom-admin/src/locales/langs/zh-CN/mom.json',
  'apps/mom-admin/src/locales/langs/en-US/mom.json',
  'apps/mom-admin/src/layouts/page/AdminContentSection.vue',
  'apps/mom-admin/src/layouts/page/AdminFilterBar.vue',
  'apps/mom-admin/src/layouts/page/AdminMasterDetail.vue',
  'apps/mom-admin/src/layouts/admin-shell.vue',
  'apps/mom-admin/src/layouts/admin-shell/AdminHeader.vue',
  'apps/mom-admin/src/layouts/admin-shell/AdminSidebar.vue',
  'apps/mom-admin/src/router/registry.ts',
  'apps/mom-admin/src/router/task-contract.ts',
  'apps/mom-admin/src/views/settings/personal-settings.vue',
  'apps/mom-admin/src/views/fallback/catalog-error.vue',
  'apps/mom-admin/src/views/fallback/runtime-error.vue',
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
  'packages/api-client/src/index.ts',
  'packages/api-client/src/index.test.ts',
  'packages/system-client/package.json',
  'packages/system-client/src/cache.ts',
  'packages/system-client/src/catalog-contracts.ts',
  'packages/system-client/src/catalog-runtime.ts',
  'packages/system-client/src/catalog-validation.ts',
  'packages/system-client/src/contracts.ts',
  'packages/system-client/src/index.ts',
  'packages/system-client/src/runtime.ts',
  'packages/system-client/src/validation.ts',
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
  'packages/common-ui/src/components/Page.vue',
  'packages/common-ui/src/components/DataState.vue',
  'packages/common-ui/src/components/ActionBar.vue',
  'packages/common-ui/src/components/ConfirmAction.vue',
  'packages/common-ui/src/icons/MomIcon.vue',
  'packages/common-ui/src/icons/registry.ts',
  'packages/common-ui/src/layouts/AuthShell.vue',
  'packages/common-ui/src/layouts/PortalShell.vue',
  'packages/design-tokens/package.json',
  'packages/domain-components/package.json',
  'packages/shared/package.json',
  'packages/traceability-graph/package.json',
  'scripts/s05c-live-integration.mjs',
  'tsconfig.admin-runtime-test.json',
  'tsconfig.test.json',
  'docs/prototypes/README.md',
  'docs/page-state-matrix/README.md',
  'docs/api-mapping/README.md',
  'docs/adr/ADR-009-P1.5-Web第一方认证运行时.md',
  'docs/adr/ADR-010-MOM-Admin-Vben5.7源码快照.md',
  'docs/backlog/iam-user-preferences-backend.md',
  'docs/backlog/iam-menu-internationalization.md',
  'docs/open-source/vben-5.7.0-snapshot.md',
  'tests/unit/s05c-live-integration.test.ts',
  'packages/stores/src/modules/access.ts',
];

for (const path of requiredPaths) await access(path);

const s05cLiveSource = await readFile('scripts/s05c-live-integration.mjs', 'utf8');
for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'MOM_S05C_PASSWORD']) {
  if (s05cLiveSource.includes(forbidden)) {
    throw new Error(`S05C live integration must not persist credentials through ${forbidden}`);
  }
}
for (const required of [
  "'/api/iam/auth/login'",
  "'/api/iam/me'",
  'promptHidden',
  'system:i18n:publish',
  'system:catalog:publish',
  "'If-None-Match'",
]) {
  if (!s05cLiveSource.includes(required)) {
    throw new Error(`S05C live integration contract is missing: ${required}`);
  }
}

const rootPackage = JSON.parse(await readFile('package.json', 'utf8'));
if (rootPackage.packageManager !== 'pnpm@11.7.0') {
  throw new Error('packageManager must remain pinned to pnpm@11.7.0');
}
if (!rootPackage.engines?.node?.includes('22.18.0')) {
  throw new Error('Node engine must preserve the MOM CI baseline');
}

async function collectFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else files.push(child);
  }
  return files;
}

const adminPackage = JSON.parse(await readFile('apps/mom-admin/package.json', 'utf8'));
const legacyAdminDependencies = Object.keys(adminPackage.dependencies ?? {})
  .filter((name) => name.startsWith('@vben/'));
if (legacyAdminDependencies.length > 0) {
  throw new Error(`MOM Admin manifest must not depend on Vben: ${legacyAdminDependencies.join(', ')}`);
}
for (const legacyPath of [
  'apps/mom-admin/src/layouts/basic.vue',
  'apps/mom-admin/src/preferences.ts',
  'apps/mom-admin/src/router/menu-source.ts',
]) {
  try {
    await access(legacyPath);
    throw new Error(`MOM Admin legacy runtime file must stay deleted: ${legacyPath}`);
  }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
}
const adminRuntimeFiles = [
  ...await collectFiles('apps/mom-admin/src'),
  'apps/mom-admin/package.json',
  'apps/mom-admin/vite.config.ts',
];
for (const path of adminRuntimeFiles) {
  const source = await readFile(path, 'utf8');
  if (source.includes('@vben/')) {
    throw new Error(`MOM Admin direct Vben reference is forbidden after S04C: ${path}`);
  }
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
if (!/import\s*\{[\s\S]*?\bPage\b[\s\S]*?\}\s*from '@mom\/common-ui';/u.test(adminView)) {
  throw new Error('MOM Admin pages must use @mom/common-ui Page instead of private page heading markup');
}
if (!adminView.includes("from './section-navigation'")) {
  throw new Error('MOM Admin must use the tested Section navigation module');
}
if (adminView.includes('const sectionDefinitions')
  || adminView.includes('function sectionFromRoute')) {
  throw new Error('MOM Admin App setup must not depend on local Section declaration order');
}
if (adminView.includes('class="page-heading"') || adminView.includes('class="management-page"')) {
  throw new Error('MOM Admin must not reintroduce private page heading/container components');
}
for (const layout of [
  'AdminContentSection',
  'AdminFilterBar',
  'AdminMasterDetail',
]) {
  if (!adminView.includes(`<${layout}`)) {
    throw new Error(`MOM Admin task pages must retain the S04A layout contract: ${layout}`);
  }
}
for (const path of [
  'apps/mom-admin/src/layouts/page/AdminContentSection.vue',
  'apps/mom-admin/src/layouts/page/AdminFilterBar.vue',
  'apps/mom-admin/src/layouts/page/AdminMasterDetail.vue',
]) {
  const source = await readFile(path, 'utf8');
  if (/from ['"](?:@mom\/(?:access|api-client|iam-admin)|vue-router|\.\.\/\.\.\/runtime)/u.test(source)) {
    throw new Error(`${path} must remain independent from API, Router, Permission and IAM View Models`);
  }
}
const adminSectionNavigation = await readFile('apps/mom-admin/src/section-navigation.ts', 'utf8');
const adminRoutesSource = await readFile('apps/mom-admin/src/router/routes.ts', 'utf8');
const adminTaskContract = await readFile('apps/mom-admin/src/router/task-contract.ts', 'utf8');
for (const permission of [
  'iam:user:read',
  'iam:role:read',
  'iam:permission:read',
  'iam:session:read',
  'iam:audit:read',
  'iam:client:read',
]) {
  if (!adminTaskContract.includes(permission)) {
    throw new Error(`MOM Admin static task contract must preserve ${permission}`);
  }
}
if (!adminSectionNavigation.includes('ADMIN_TASK_CONTRACTS')) {
  throw new Error('MOM Admin Section navigation must derive from the static task contract');
}
const adminCatalogSource = await readFile('apps/mom-admin/src/router/catalog.ts', 'utf8');
const adminDynamicRoutesSource = await readFile('apps/mom-admin/src/router/dynamic-task-routes.ts', 'utf8');
if (adminRoutesSource.includes('ADMIN_TASKS.map')
  || adminRoutesSource.includes('mom.menu.system')
  || !adminDynamicRoutesSource.includes("router.addRoute('Root'")) {
  throw new Error('MOM Admin tasks must be activated dynamically from the static Registry without restoring System Management');
}
const adminShellSource = await readFile('apps/mom-admin/src/layouts/admin-shell.vue', 'utf8');
const adminAccessSource = await readFile('apps/mom-admin/src/router/access.ts', 'utf8');
if (/\b(?:BasicLayout|Tabbar|UserDropdown)\b/u.test(adminShellSource)) {
  throw new Error('MOM Admin Shell must own its visual layout without Vben visual components');
}
if (adminAccessSource.includes('generateAccessible')
  || adminAccessSource.includes('useAccessStore')
  || !adminAccessSource.includes('defaultCatalogTaskPath')
  || !adminCatalogSource.includes('routes.clear()')) {
  throw new Error('S05B Access must use the Catalog task intersection and preserve fail-closed route removal');
}
for (const contract of [
  'people-access',
  'security-operations',
  'mom-admin.people-access.users',
  'mom-admin.security-operations.audit',
]) {
  if (!adminTaskContract.includes(contract)) {
    throw new Error(`MOM Admin task registry must preserve ${contract}`);
  }
}

const vbenAccessStore = await readFile('packages/stores/src/modules/access.ts', 'utf8');
const persistedAccessFields = vbenAccessStore
  .slice(vbenAccessStore.indexOf('persist:'), vbenAccessStore.indexOf('state:'));
for (const sensitiveField of ['accessToken', 'refreshToken', 'accessCodes']) {
  if (persistedAccessFields.includes(`'${sensitiveField}'`)) {
    throw new Error(`Vben access store must not persist ${sensitiveField}`);
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
for (const contract of [
  'authorizationFlight',
  "normalized === 'GET' || normalized === 'HEAD'",
  'authorization_changed_retry_required',
  'retryAuthorization',
  'conditionalGet<T>',
  'acceptNotModified && response.status === 304',
  'notifyForbidden',
]) {
  if (!apiClientSource.includes(contract)) {
    throw new Error(`@mom/api-client must preserve the 403 synchronization contract: ${contract}`);
  }
}

const systemRuntimeSource = await readFile('packages/system-client/src/runtime.ts', 'utf8');
for (const contract of [
  '/api/system/preferences/me',
  '/api/system/i18n/applications/${options.applicationCode}/resources/${resourceCode}',
  "resourceCode = options.resourceCode ?? 'runtime'",
  "namespace = options.namespace ?? 'mom.runtime.'",
  'retryAuthorization: false',
  'cache.clearUser(currentUserId)',
]) {
  if (!systemRuntimeSource.includes(contract)) {
    throw new Error(`@mom/system-client must preserve the S03 runtime contract: ${contract}`);
  }
}
if (/\bfetch\s*\(/u.test(systemRuntimeSource)) {
  throw new Error('@mom/system-client must reuse @mom/api-client instead of creating a second Fetch layer');
}
if (systemRuntimeSource.includes('/api/system/catalog')) {
  throw new Error('@mom/system-client S03 must not pull Catalog into the Preference/I18n runtime');
}

const catalogRuntimeSource = await readFile('packages/system-client/src/catalog-runtime.ts', 'utf8');
for (const contract of [
  '/api/system/catalog/applications/${encodeURIComponent(options.contract.applicationCode)}',
  "phase: 'RESTRICTED'",
  "'If-None-Match': previous.etag",
  'retained = undefined',
]) {
  if (!catalogRuntimeSource.includes(contract)) {
    throw new Error(`@mom/system-client must preserve the S05A Catalog fail-closed contract: ${contract}`);
  }
}
if (/\b(?:localStorage|sessionStorage|indexedDB|createApiClient|fetch)\b/u.test(catalogRuntimeSource)) {
  throw new Error('@mom/system-client Catalog Runtime must remain in-memory and reuse the injected API client');
}

const systemCacheSource = await readFile('packages/system-client/src/cache.ts', 'utf8');
for (const isolationPart of ['clientId', 'applicationCode', 'userId', 'resourceCode', 'locale']) {
  if (!systemCacheSource.includes(isolationPart)) {
    throw new Error(`@mom/system-client cache key must preserve ${isolationPart} isolation`);
  }
}
if (!systemCacheSource.includes("CACHE_SCHEMA_VERSION = 'v1'")
  || !systemCacheSource.includes('mom.system.${CACHE_SCHEMA_VERSION}')) {
  throw new Error('@mom/system-client cache keys must retain an explicit schema version');
}

for (const [path, applicationCode] of [
  ['apps/mom-admin/src/runtime.ts', 'mom-admin'],
  ['apps/supplier-portal/src/runtime.ts', 'supplier-portal'],
  ['apps/customer-portal/src/runtime.ts', 'customer-portal'],
]) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('createSystemRuntime') || !source.includes(`applicationCode: '${applicationCode}'`)) {
    throw new Error(`${path} must own an independent System Runtime for ${applicationCode}`);
  }
}

for (const path of [
  'apps/mom-admin/src/locales/langs/zh-CN/mom.json',
  'apps/mom-admin/src/locales/langs/en-US/mom.json',
]) {
  const locale = JSON.parse(await readFile(path, 'utf8'));
  if (locale?.messages?.authorizationChanged === undefined
    || locale?.menu?.users === undefined
    || locale?.pages?.clients?.title === undefined) {
    throw new Error(`${path} must cover framework, menu, operation, and IAM page copy`);
  }
}

console.log(`Validated ${requiredPaths.length} required project boundaries and P1.5 security invariants.`);
