import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const APPLICATION_CODE = 'mom-admin';
const RESOURCE_CODE = 'runtime';
const REQUIRED_GOVERNANCE_PERMISSIONS = Object.freeze([
  'system:catalog:publish',
  'system:catalog:read',
  'system:catalog:write',
  'system:i18n:publish',
  'system:i18n:read',
  'system:i18n:write',
]);

export const S05C_MESSAGES = Object.freeze([
  ['mom.runtime.application.admin', 'MOM 制造运营管理平台', 'MOM Manufacturing Operations'],
  ['mom.runtime.navigation.peopleAccess', '人员与访问', 'People & Access'],
  ['mom.runtime.navigation.securityOperations', '安全运营', 'Security Operations'],
  ['mom.runtime.navigation.users', '用户与授权', 'Users & Access'],
  ['mom.runtime.navigation.roles', '角色配置', 'Role Configuration'],
  ['mom.runtime.navigation.permissions', '权限目录', 'Permission Catalog'],
  ['mom.runtime.navigation.clients', '登录客户端', 'Login Clients'],
  ['mom.runtime.navigation.sessions', '会话处置', 'Session Response'],
  ['mom.runtime.navigation.audit', '安全审计', 'Security Audit'],
]);

export const S05C_CATALOG_NODES = Object.freeze([
  Object.freeze({
    iconKey: 'users',
    messageKey: 'mom.runtime.navigation.peopleAccess',
    parentRouteKey: null,
    permissionCode: null,
    routeKey: 'mom-admin.people-access',
    sortOrder: 10,
    type: 'GROUP',
  }),
  Object.freeze({
    iconKey: 'users',
    messageKey: 'mom.runtime.navigation.users',
    parentRouteKey: 'mom-admin.people-access',
    permissionCode: 'iam:user:read',
    routeKey: 'mom-admin.people-access.users',
    sortOrder: 10,
    type: 'ROUTE',
  }),
  Object.freeze({
    iconKey: 'shield-check',
    messageKey: 'mom.runtime.navigation.roles',
    parentRouteKey: 'mom-admin.people-access',
    permissionCode: 'iam:role:read',
    routeKey: 'mom-admin.people-access.roles',
    sortOrder: 20,
    type: 'ROUTE',
  }),
  Object.freeze({
    iconKey: 'key-round',
    messageKey: 'mom.runtime.navigation.permissions',
    parentRouteKey: 'mom-admin.people-access',
    permissionCode: 'iam:permission:read',
    routeKey: 'mom-admin.people-access.permissions',
    sortOrder: 30,
    type: 'ROUTE',
  }),
  Object.freeze({
    iconKey: 'app-window',
    messageKey: 'mom.runtime.navigation.clients',
    parentRouteKey: 'mom-admin.people-access',
    permissionCode: 'iam:client:read',
    routeKey: 'mom-admin.people-access.clients',
    sortOrder: 40,
    type: 'ROUTE',
  }),
  Object.freeze({
    iconKey: 'shield-check',
    messageKey: 'mom.runtime.navigation.securityOperations',
    parentRouteKey: null,
    permissionCode: null,
    routeKey: 'mom-admin.security-operations',
    sortOrder: 20,
    type: 'GROUP',
  }),
  Object.freeze({
    iconKey: 'monitor-smartphone',
    messageKey: 'mom.runtime.navigation.sessions',
    parentRouteKey: 'mom-admin.security-operations',
    permissionCode: 'iam:session:read',
    routeKey: 'mom-admin.security-operations.sessions',
    sortOrder: 10,
    type: 'ROUTE',
  }),
  Object.freeze({
    iconKey: 'scroll-text',
    messageKey: 'mom.runtime.navigation.audit',
    parentRouteKey: 'mom-admin.security-operations',
    permissionCode: 'iam:audit:read',
    routeKey: 'mom-admin.security-operations.audit',
    sortOrder: 20,
    type: 'ROUTE',
  }),
]);

export function validateS05cSpecification() {
  const messageKeys = new Set(S05C_MESSAGES.map(([key]) => key));
  if (messageKeys.size !== 9) throw new Error('S05C 必须冻结 9 个唯一 Dynamic I18n Key');
  if (S05C_CATALOG_NODES.length !== 8) throw new Error('S05C 必须冻结 2 Group + 6 Route');
  const routeKeys = new Set();
  for (const node of S05C_CATALOG_NODES) {
    if (routeKeys.has(node.routeKey)) throw new Error(`重复 routeKey: ${node.routeKey}`);
    if (!messageKeys.has(node.messageKey)) throw new Error(`缺少 I18n Key: ${node.messageKey}`);
    routeKeys.add(node.routeKey);
  }
  for (const node of S05C_CATALOG_NODES) {
    if (node.parentRouteKey && !routeKeys.has(node.parentRouteKey)) {
      throw new Error(`未知 parentRouteKey: ${node.parentRouteKey}`);
    }
  }
  return Object.freeze({ messageCount: messageKeys.size, nodeCount: routeKeys.size });
}

export function createS05cLivePublisher({ baseUrl, fetcher = fetch, logger = console.info }) {
  const gateway = baseUrl.replace(/\/$/u, '');
  let accessToken;

  async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetcher(`${gateway}${path}`, { ...options, headers });
    return response;
  }

  async function json(path, options = {}, expected = [200]) {
    const response = await request(path, options);
    if (!expected.includes(response.status)) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`${options.method ?? 'GET'} ${path} -> ${response.status}: ${detail}`);
    }
    return response.json();
  }

  async function authenticate(username, password) {
    const response = await json('/api/iam/auth/login', {
      body: JSON.stringify({
        clientId: 'mom-admin-web',
        deviceName: 'MOM S05C Live Integration',
        password,
        username,
      }),
      method: 'POST',
    });
    if (typeof response.accessToken !== 'string' || !response.accessToken) {
      throw new Error('IAM 登录响应缺少 accessToken');
    }
    accessToken = response.accessToken;
    const me = await json('/api/iam/me');
    const permissions = new Set(Array.isArray(me.permissions) ? me.permissions : []);
    const missing = REQUIRED_GOVERNANCE_PERMISSIONS.filter((code) => !permissions.has(code));
    if (missing.length > 0) throw new Error(`当前 Token 缺少治理权限: ${missing.join(', ')}`);
    logger(`认证与治理权限验证通过：${me.username ?? 'unknown'}`);
    return me;
  }

  async function ensureI18n() {
    const page = await json(`/api/system/admin/i18n/resources?applicationCode=${APPLICATION_CODE}&page=0&size=20`);
    const matches = page.items.filter((item) => item.applicationCode === APPLICATION_CODE
      && item.resourceCode === RESOURCE_CODE);
    if (matches.length > 1) throw new Error('检测到重复 mom-admin/runtime Resource');
    let resource = matches[0];
    let changed = false;
    if (!resource) {
      resource = await json('/api/system/admin/i18n/resources', {
        body: JSON.stringify({
          applicationCode: APPLICATION_CODE,
          defaultLocale: 'zh-CN',
          description: 'MOM Admin 运行时导航文本；S05C 受控发布',
          enabled: true,
          resourceCode: RESOURCE_CODE,
          resourceName: 'MOM Admin Runtime',
        }),
        method: 'POST',
      }, [201]);
      changed = true;
      logger('已创建 Dynamic I18n Resource: mom-admin/runtime');
    }
    if (!resource.enabled) throw new Error('mom-admin/runtime 已存在但处于禁用状态');

    const messagePage = await json(`/api/system/admin/i18n/resources/${resource.id}/messages?page=0&size=100`);
    const byKeyLocale = new Map(messagePage.items.map((item) => [`${item.messageKey}\u0000${item.locale}`, item]));
    for (const [messageKey, zhValue, enValue] of S05C_MESSAGES) {
      for (const [locale, messageValue] of [['zh-CN', zhValue], ['en-US', enValue]]) {
        const mapKey = `${messageKey}\u0000${locale}`;
        const current = byKeyLocale.get(mapKey);
        if (!current) {
          await json(`/api/system/admin/i18n/resources/${resource.id}/messages`, {
            body: JSON.stringify({
              description: 'S05C Catalog Runtime 导航文案',
              enabled: true,
              locale,
              messageKey,
              messageValue,
            }),
            method: 'POST',
          }, [201]);
          changed = true;
          continue;
        }
        if (!current.enabled) throw new Error(`Dynamic I18n Draft 已禁用: ${messageKey}/${locale}`);
        if (current.messageValue !== messageValue) {
          await json(`/api/system/admin/i18n/resources/${resource.id}/messages/${current.id}`, {
            body: JSON.stringify({
              description: 'S05C Catalog Runtime 导航文案',
              messageValue,
              version: current.version,
            }),
            method: 'PUT',
          });
          changed = true;
        }
      }
    }

    resource = await json(`/api/system/admin/i18n/resources/${resource.id}`);
    if (changed || resource.publishedVersion == null) {
      const published = await json(`/api/system/admin/i18n/resources/${resource.id}/publish`, {
        body: JSON.stringify({
          changeNote: 'MOM-Web P1.6 S05C initial runtime publication',
          version: resource.version,
        }),
        method: 'POST',
      });
      logger(`Dynamic I18n 已发布：release ${published.releaseVersion}`);
    }
    else {
      logger(`Dynamic I18n 已存在且无需变更：release ${resource.publishedVersion}`);
    }
  }

  async function ensureCatalog() {
    const page = await json(`/api/system/admin/applications?applicationCode=${APPLICATION_CODE}&page=0&size=20`);
    const matches = page.items.filter((item) => item.applicationCode === APPLICATION_CODE);
    if (matches.length > 1) throw new Error('检测到重复 mom-admin Application');
    let application = matches[0];
    let changed = false;
    if (!application) {
      application = await json('/api/system/admin/applications', {
        body: JSON.stringify({
          applicationCode: APPLICATION_CODE,
          applicationType: 'PLATFORM',
          description: '面向制造协同任务的内部管理工作空间',
          enabled: true,
          i18nMessageKey: 'mom.runtime.application.admin',
          i18nResourceCode: RESOURCE_CODE,
          iconKey: 'app-window',
          routeContractVersion: 1,
          sortOrder: 10,
        }),
        method: 'POST',
      }, [201]);
      changed = true;
      logger('已创建 Catalog Application: mom-admin');
    }
    if (!application.enabled) throw new Error('mom-admin Application 已存在但处于禁用状态');

    let tree = await json(`/api/system/admin/applications/${application.id}/navigation/tree?clientChannel=WEB`);
    const flattened = flattenNavigation(tree.navigation);
    const existingKeys = new Set(flattened.map(({ item }) => item.routeKey));
    const unknown = flattened.filter(({ item }) => !S05C_CATALOG_NODES.some((node) => node.routeKey === item.routeKey));
    if (unknown.length > 0) throw new Error(`Catalog 存在未冻结节点: ${unknown.map(({ item }) => item.routeKey).join(', ')}`);

    for (const spec of S05C_CATALOG_NODES) {
      if (existingKeys.has(spec.routeKey)) continue;
      const parent = spec.parentRouteKey
        ? flattenNavigation(tree.navigation).find(({ item }) => item.routeKey === spec.parentRouteKey)?.item
        : undefined;
      if (spec.parentRouteKey && !parent) throw new Error(`Catalog 父节点尚未创建: ${spec.parentRouteKey}`);
      await json(`/api/system/admin/applications/${application.id}/navigation`, {
        body: JSON.stringify({
          applicationVersion: tree.applicationVersion,
          clientChannel: 'WEB',
          enabled: true,
          iconKey: spec.iconKey,
          i18nMessageKey: spec.messageKey,
          i18nResourceCode: RESOURCE_CODE,
          keepAlive: false,
          navigationType: spec.type,
          parentId: parent?.id ?? null,
          permissionCode: spec.permissionCode,
          routeKey: spec.routeKey,
          sortOrder: spec.sortOrder,
          visibleInBreadcrumb: true,
          visibleInMenu: true,
          visibleInTab: spec.type === 'ROUTE',
        }),
        method: 'POST',
      }, [201]);
      changed = true;
      tree = await json(`/api/system/admin/applications/${application.id}/navigation/tree?clientChannel=WEB`);
      existingKeys.add(spec.routeKey);
    }

    application = await json(`/api/system/admin/applications/${application.id}`);
    if (changed || application.publishedVersion === 0) {
      const published = await json(`/api/system/admin/applications/${application.id}/catalog/publish`, {
        body: JSON.stringify({
          applicationVersion: application.version,
          changeNote: 'MOM-Web P1.6 S05C initial catalog publication',
        }),
        method: 'POST',
      }, [201]);
      logger(`Catalog 已发布：release ${published.releaseVersion}`);
    }
    else {
      logger(`Catalog 已存在且无需变更：release ${application.publishedVersion}`);
    }
  }

  async function verifyRuntime() {
    const i18nPath = `/api/system/i18n/applications/${APPLICATION_CODE}/resources/${RESOURCE_CODE}?locale=zh-CN`;
    const i18n = await request(i18nPath);
    assertRuntime200(i18n, 'Dynamic I18n');
    const i18nEtag = i18n.headers.get('etag');
    const i18nBody = await i18n.json();
    if (Object.keys(i18nBody.messages ?? {}).length !== S05C_MESSAGES.length) {
      throw new Error('Dynamic I18n Runtime 消息数量不符合冻结契约');
    }
    const i18n304 = await request(i18nPath, { headers: { 'If-None-Match': i18nEtag } });
    if (i18n304.status !== 304) throw new Error(`Dynamic I18n 条件请求应为 304，实际 ${i18n304.status}`);

    const catalogPath = `/api/system/catalog/applications/${APPLICATION_CODE}`;
    const catalog = await request(catalogPath);
    assertRuntime200(catalog, 'Catalog');
    const catalogEtag = catalog.headers.get('etag');
    const catalogBody = await catalog.json();
    const applications = Array.isArray(catalogBody.applications) ? catalogBody.applications : [];
    if (applications.length !== 1 || applications[0].applicationCode !== APPLICATION_CODE) {
      throw new Error('Catalog Runtime Application 不符合冻结契约');
    }
    const catalog304 = await request(catalogPath, { headers: { 'If-None-Match': catalogEtag } });
    if (catalog304.status !== 304) throw new Error(`Catalog 条件请求应为 304，实际 ${catalog304.status}`);
    logger('真实 Gateway Runtime 验证通过：I18n 200/304，Catalog 200/304');
    return Object.freeze({ catalogEtag, i18nEtag });
  }

  return Object.freeze({ authenticate, ensureCatalog, ensureI18n, verifyRuntime });
}

function flattenNavigation(nodes) {
  return (nodes ?? []).flatMap((node) => [node, ...flattenNavigation(node.children)]);
}

function assertRuntime200(response, label) {
  if (response.status !== 200) throw new Error(`${label} Runtime 应为 200，实际 ${response.status}`);
  const etag = response.headers.get('etag');
  if (!etag || !/^"[^"]+"$/u.test(etag)) throw new Error(`${label} Runtime 缺少强 ETag`);
}

async function promptVisible(label, defaultValue = '') {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    return (await input.question(`${label}${suffix}: `)).trim() || defaultValue;
  }
  finally {
    input.close();
  }
}

async function promptHidden(label) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error('密码必须在交互式 TTY 中输入');
  }
  process.stdout.write(`${label}: `);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onKeypress = (text, key) => {
      if (key?.ctrl && key.name === 'c') return finish(new Error('用户取消 S05C 发布'));
      if (key?.name === 'return' || key?.name === 'enter') return finish();
      if (key?.name === 'backspace') {
        value = value.slice(0, -1);
        return;
      }
      if (!key?.ctrl && !key?.meta && text) value += text;
    };
    process.stdin.on('keypress', onKeypress);
  });
}

async function promptMacText(message, { defaultValue = '', hidden = false } = {}) {
  const hiddenClause = hidden ? ' with hidden answer' : '';
  const script = `display dialog ${JSON.stringify(message)} default answer ${JSON.stringify(defaultValue)}${hiddenClause} buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel" with title "MOM S05C Live Integration"`;
  const { stdout } = await execFileAsync('/usr/bin/osascript', ['-e', script]);
  const marker = 'text returned:';
  const index = stdout.indexOf(marker);
  if (index < 0) throw new Error('macOS 对话框没有返回输入值');
  return stdout.slice(index + marker.length).trim();
}

async function confirmMacPublication(baseUrl) {
  const script = `display dialog ${JSON.stringify(`确认通过 ${baseUrl} 发布 mom-admin/runtime 与 Catalog？`)} buttons {"Cancel", "PUBLISH"} default button "PUBLISH" cancel button "Cancel" with icon caution with title "MOM S05C Live Integration"`;
  await execFileAsync('/usr/bin/osascript', ['-e', script]);
}

async function runLocalWebForm() {
  const nonce = randomUUID();
  const baseUrl = 'http://127.0.0.1:20000';
  const server = createServer(async (request, response) => {
    const pagePath = `/${nonce}`;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method === 'GET' && request.url === pagePath) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(renderLocalForm(pagePath));
      return;
    }
    if (request.method !== 'POST' || request.url !== `${pagePath}/publish`) {
      response.statusCode = 404;
      response.end('Not Found');
      return;
    }
    try {
      const body = await readBoundedBody(request, 8 * 1024);
      const form = new URLSearchParams(body);
      if (form.get('confirmation') !== 'PUBLISH') throw new Error('确认词必须为 PUBLISH');
      const username = form.get('username')?.trim() || 'admin';
      const password = form.get('password') ?? '';
      if (!password) throw new Error('IAM password 不能为空');
      const progress = [];
      const publisher = createS05cLivePublisher({
        baseUrl,
        logger: (message) => progress.push(message),
      });
      await publisher.authenticate(username, password);
      await publisher.ensureI18n();
      await publisher.ensureCatalog();
      await publisher.verifyRuntime();
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(renderLocalResult('S05C 发布成功', progress));
    }
    catch (error) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(renderLocalResult('S05C 发布失败', [error instanceof Error ? error.message : String(error)]));
    }
    finally {
      server.close();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('无法取得本地 S05C 表单端口');
  console.info(`S05C_FORM_URL=http://127.0.0.1:${address.port}/${nonce}`);
}

function readBoundedBody(request, limit) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('本地表单请求超过大小上限'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function renderLocalForm(actionPath) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MOM S05C Live Integration</title><style>body{font:15px/1.5 system-ui;margin:0;background:#f4f5f7;color:#1f2329}main{max-width:520px;margin:8vh auto;padding:32px;background:#fff;border:1px solid #dfe1e5;border-radius:16px}label{display:block;margin:18px 0 6px;font-weight:600}input{box-sizing:border-box;width:100%;height:42px;padding:0 12px;border:1px solid #c7cbd1;border-radius:8px}button{width:100%;height:44px;margin-top:24px;border:0;border-radius:8px;background:#3157d5;color:#fff;font-weight:700}p{color:#5f6670}</style></head><body><main><h1>MOM S05C Live Integration</h1><p>仅连接本机 Gateway。密码不会写入 URL、日志或文件；提交后本地服务自动关闭。</p><form method="post" action="${actionPath}/publish" autocomplete="off"><label for="username">IAM username</label><input id="username" name="username" value="admin" required><label for="password">IAM password</label><input id="password" name="password" type="password" required><label for="confirmation">输入 PUBLISH 确认发布</label><input id="confirmation" name="confirmation" required><button type="submit">验证权限并发布</button></form></main></body></html>`;
}

function renderLocalResult(title, messages) {
  const items = messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><main><h1>${escapeHtml(title)}</h1><ul>${items}</ul><p>本地凭据接收服务已关闭。</p></main></body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => ({
    '"': '&quot;',
    '&': '&amp;',
    "'": '&#39;',
    '<': '&lt;',
    '>': '&gt;',
  })[character]);
}

async function main() {
  const specification = validateS05cSpecification();
  if (process.argv.includes('--check')) {
    console.info(`S05C specification: ${specification.messageCount} messages, ${specification.nodeCount} nodes`);
    return;
  }
  if (process.argv.includes('--web-form')) {
    await runLocalWebForm();
    return;
  }
  const useMacDialog = process.argv.includes('--mac-dialog');
  const baseUrl = 'http://127.0.0.1:20000';
  const username = useMacDialog
    ? await promptMacText('IAM username', { defaultValue: 'admin' })
    : await promptVisible('IAM username', 'admin');
  const password = useMacDialog
    ? await promptMacText('IAM password（不会显示或保存）', { hidden: true })
    : await promptHidden('IAM password（不会显示或保存）');
  if (useMacDialog) {
    await confirmMacPublication(baseUrl);
  }
  else {
    const confirmation = await promptVisible(`输入 PUBLISH 确认通过 ${baseUrl} 发布 mom-admin/runtime 与 Catalog`);
    if (confirmation !== 'PUBLISH') throw new Error('未确认发布，未执行任何治理写入');
  }
  const publisher = createS05cLivePublisher({ baseUrl });
  await publisher.authenticate(username, password);
  await publisher.ensureI18n();
  await publisher.ensureCatalog();
  await publisher.verifyRuntime();
  console.info('S05C Live 发布与 Runtime 契约验证完成。');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
