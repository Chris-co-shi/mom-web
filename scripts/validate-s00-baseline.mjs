import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readText = (file) => readFile(resolve(root, file), 'utf8');
const baseline = JSON.parse(await readText('quality/s00-contract-baseline.json'));
const failures = [];

function requireLiteral(content, literal, context) {
  if (!content.includes(literal)) failures.push(`${context}: missing ${JSON.stringify(literal)}`);
}

const menuSource = await readText('apps/mom-admin/src/router/menu-source.ts');
for (const route of baseline.iamNavigation) {
  const pathLiteral = `path: '${route.path}'`;
  const pathIndex = menuSource.indexOf(pathLiteral);
  const definitionStart = menuSource.lastIndexOf('{', pathIndex);
  const definitionEnd = menuSource.indexOf('},', pathIndex);
  if (pathIndex < 0 || definitionStart < 0 || definitionEnd < 0) {
    failures.push(`IAM navigation: missing ${JSON.stringify(pathLiteral)}`);
    continue;
  }
  const definition = menuSource.slice(definitionStart, definitionEnd);
  requireLiteral(definition, `permission: '${route.permission}'`, `${route.path} permission`);
}

for (const application of baseline.applications) {
  const runtime = await readText(`apps/${application.app}/src/runtime.ts`);
  const vite = await readText(`apps/${application.app}/vite.config.ts`);
  const packageJson = JSON.parse(await readText(`apps/${application.app}/package.json`));
  requireLiteral(runtime, `'${application.clientId}'`, `${application.app} clientId`);
  requireLiteral(runtime, `'${application.userType}'`, `${application.app} userType`);
  requireLiteral(vite, `port: ${application.port}`, `${application.app} Vite port`);
  requireLiteral(packageJson.scripts.dev, `--port ${application.port}`, `${application.app} dev port`);
  requireLiteral(vite, 'manifest: true', `${application.app} build manifest`);
  requireLiteral(vite, 'sourcemap: false', `${application.app} public source maps`);
}

const apiClient = await readText('packages/api-client/src/index.ts');
for (const contract of [
  'globalThis.fetch.bind(globalThis)',
  'authorizationFlight',
  "normalized === 'GET' || normalized === 'HEAD'",
  'authorization_changed_retry_required',
  'ApiClient only accepts Gateway-relative paths',
]) {
  requireLiteral(apiClient, contract, 'API security contract');
}

const authRuntime = await readText('packages/first-party-auth/src/index.ts');
for (const endpoint of baseline.authentication.endpoints) {
  requireLiteral(authRuntime, endpoint, 'first-party auth endpoint');
}
requireLiteral(authRuntime, baseline.authentication.storage, 'first-party auth storage');
requireLiteral(authRuntime, baseline.authentication.storageKeyPrefix, 'first-party auth storage key');

for (const application of baseline.applications) {
  const runtime = await readText(`apps/${application.app}/src/runtime.ts`);
  requireLiteral(runtime, baseline.authentication.accessContextEndpoint, `${application.app} access context`);
}

const workflow = await readText('.github/workflows/ci.yml');
requireLiteral(workflow, `node-version: ${baseline.build.ciNode}`, 'CI Node version');
requireLiteral(workflow, `version: ${baseline.build.pnpm}`, 'CI pnpm version');

if (failures.length > 0) {
  console.error('S00 contract baseline failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.info(
    `S00 contract baseline passed (${baseline.iamNavigation.length} IAM URLs, ${baseline.applications.length} applications).`,
  );
}
