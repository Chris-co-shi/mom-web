import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(packageRoot, 'tokens/mom.tokens.json');
const generatedRoot = resolve(packageRoot, 'src/generated');
const outputPaths = {
  antd: resolve(generatedRoot, 'antd-theme.ts'),
  css: resolve(generatedRoot, 'tokens.css'),
  tailwind: resolve(generatedRoot, 'tailwind.css'),
  typescript: resolve(generatedRoot, 'tokens.ts'),
};

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
validateSource(source);
const resolved = resolveTree(source);
validateContrast(resolved);

const outputs = {
  antd: renderAntd(resolved),
  css: renderCss(resolved),
  tailwind: renderTailwind(resolved),
  typescript: renderTypescript(resolved),
};

if (process.argv.includes('--check')) {
  const drift = [];
  for (const [name, path] of Object.entries(outputPaths)) {
    let current = '';
    try {
      current = await readFile(path, 'utf8');
    }
    catch {
      // 文件缺失与手工漂移采用同一个 fail-closed 结果。
    }
    if (current !== outputs[name]) drift.push(path.replace(`${packageRoot}/`, ''));
  }
  if (drift.length > 0) {
    console.error('Token generated output drift detected:');
    for (const path of drift) console.error(`- packages/design-tokens/${path}`);
    process.exitCode = 1;
  }
  else {
    console.info(`Token generation check passed (${Object.keys(outputs).length} outputs).`);
  }
}
else {
  await mkdir(generatedRoot, { recursive: true });
  for (const [name, path] of Object.entries(outputPaths)) {
    await writeFile(path, outputs[name], 'utf8');
  }
  console.info(`Generated ${Object.keys(outputs).length} token outputs.`);
}

function validateSource(value) {
  if (value.schemaVersion !== 1) throw new Error('Unsupported token schemaVersion');
  for (const key of ['primitive', 'semantic', 'component', 'channel']) {
    if (!value[key] || typeof value[key] !== 'object') throw new Error(`Missing token layer: ${key}`);
  }
  for (const mode of ['LIGHT', 'DARK']) {
    if (!value.semantic[mode]?.color) throw new Error(`Missing semantic theme: ${mode}`);
    for (const [key, token] of Object.entries(value.semantic[mode].color)) {
      if (typeof token !== 'string' || !/^\{primitive\.color\.[^}]+\}$/u.test(token)) {
        throw new Error(`Semantic color must reference a primitive: ${mode}.${key}`);
      }
    }
  }
  for (const channel of ['ADMIN', 'PORTAL']) {
    if (!value.channel[channel]?.COMFORTABLE) throw new Error(`Missing channel density: ${channel}.COMFORTABLE`);
  }
  if (value.channel.PORTAL.COMPACT) throw new Error('Portal must not expose COMPACT density');
}

function resolveTree(root) {
  const resolving = new Set();
  const cache = new Map();

  function resolvePath(path) {
    if (cache.has(path)) return cache.get(path);
    if (resolving.has(path)) throw new Error(`Circular token reference: ${path}`);
    resolving.add(path);
    const raw = path.split('.').reduce((value, segment) => value?.[segment], root);
    if (raw === undefined) throw new Error(`Unknown token reference: ${path}`);
    const value = resolveValue(raw, path);
    resolving.delete(path);
    cache.set(path, value);
    return value;
  }

  function resolveValue(value, path) {
    if (typeof value === 'string') {
      const match = /^\{([^}]+)\}$/u.exec(value);
      return match ? resolvePath(match[1]) : value;
    }
    if (Array.isArray(value)) return value.map((item, index) => resolveValue(item, `${path}.${index}`));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, resolveValue(nested, `${path}.${key}`)]),
      );
    }
    if (typeof value === 'number') return value;
    throw new Error(`Unsupported token value at ${path}`);
  }

  return resolveValue(root, 'root');
}

function renderCss(tokens) {
  const globalEntries = [
    ...flatten(tokens.primitive.font, 'font'),
    ...flatten(tokens.primitive.space, 'space'),
    ...flatten(tokens.primitive.size, 'size'),
    ...flatten(tokens.primitive.radius, 'radius'),
    ...flatten(tokens.primitive.shadow, 'shadow'),
    ...flatten(tokens.primitive.border, 'border'),
    ...flatten(tokens.primitive['z-index'], 'z-index'),
    ...flatten(tokens.primitive.motion, 'motion'),
    ...flatten(tokens.primitive.breakpoint, 'breakpoint'),
    ...flatten(tokens.component, ''),
  ];
  const light = flatten(tokens.semantic.LIGHT, '');
  const dark = flatten(tokens.semantic.DARK, '');
  const adminComfortable = flatten(tokens.channel.ADMIN.COMFORTABLE, 'channel');
  const adminCompact = flatten(tokens.channel.ADMIN.COMPACT, 'channel');
  const portalComfortable = flatten(tokens.channel.PORTAL.COMFORTABLE, 'channel');

  return `${header('CSS Variables')}\n${cssBlock(':root', globalEntries)}\n\n${cssBlock(':root,\n[data-mom-theme="LIGHT"]', light)}\n\n${cssBlock('[data-mom-theme="DARK"]', dark)}\n\n${cssBlock('[data-mom-channel="ADMIN"][data-mom-density="COMFORTABLE"]', adminComfortable)}\n\n${cssBlock('[data-mom-channel="ADMIN"][data-mom-density="COMPACT"]', adminCompact)}\n\n${cssBlock('[data-mom-channel="PORTAL"]', portalComfortable)}\n\n${legacyAliases()}\n\n@media (prefers-reduced-motion: reduce) {\n  :root {\n    --mom-motion-fast: 0ms;\n    --mom-motion-standard: 0ms;\n    --mom-motion-slow: 0ms;\n  }\n}\n`;
}

function renderTailwind(tokens) {
  const semanticKeys = Object.keys(tokens.semantic.LIGHT.color).sort();
  const lines = [
    ...semanticKeys.map((key) => `  --color-mom-${key}: var(--mom-color-${key});`),
    `  --font-mom-sans: var(--mom-font-family-sans);`,
    ...Object.keys(tokens.primitive.font).filter((key) => key.startsWith('size-')).sort()
      .map((key) => `  --text-mom-${key.slice(5)}: var(--mom-font-${key});`),
    ...Object.keys(tokens.primitive.space).sort()
      .map((key) => `  --spacing-mom-${key}: var(--mom-space-${key});`),
    ...Object.keys(tokens.primitive.size).sort()
      .map((key) => `  --width-mom-${key}: var(--mom-size-${key});`),
    `  --height-mom-control: var(--mom-channel-control-height);`,
    ...Object.keys(tokens.primitive.radius).sort().map((key) => `  --radius-mom-${key}: var(--mom-radius-${key});`),
    ...Object.keys(tokens.primitive.shadow).sort().map((key) => `  --shadow-mom-${key}: var(--mom-shadow-${key});`),
    ...Object.keys(tokens.primitive['z-index']).sort().map((key) => `  --z-index-mom-${key}: var(--mom-z-index-${key});`),
    ...Object.keys(tokens.primitive.motion).filter((key) => key !== 'easing-standard').sort()
      .map((key) => `  --duration-mom-${key}: var(--mom-motion-${key});`),
    `  --ease-mom-standard: var(--mom-motion-easing-standard);`,
    ...Object.keys(tokens.primitive.breakpoint).sort().map((key) => `  --breakpoint-mom-${key}: ${tokens.primitive.breakpoint[key]};`),
  ];
  return `${header('Tailwind 4 semantic mapping')}\n@theme inline {\n${lines.join('\n')}\n}\n`;
}

function renderTypescript(tokens) {
  return `${header('TypeScript token contract', '//')}\nexport const momDesignTokens = ${JSON.stringify({
    component: tokens.component,
    primitive: tokens.primitive,
    semantic: tokens.semantic,
    channel: tokens.channel,
  }, null, 2)} as const;\n\nexport type MomDesignTokens = typeof momDesignTokens;\nexport type MomThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';\nexport type MomResolvedTheme = 'LIGHT' | 'DARK';\nexport type MomDensity = 'COMFORTABLE' | 'COMPACT';\nexport type MomChannel = 'ADMIN' | 'PORTAL';\n`;
}

function renderAntd(tokens) {
  const adapter = {};
  for (const mode of ['LIGHT', 'DARK']) {
    adapter[mode] = {};
    for (const [channel, densities] of Object.entries(tokens.channel)) {
      adapter[mode][channel] = {};
      for (const [density, channelTokens] of Object.entries(densities)) {
        const color = tokens.semantic[mode].color;
        adapter[mode][channel][density] = {
          components: {
            Card: { borderRadiusLG: px(tokens.primitive.radius.card) },
            Layout: {
              colorBgBody: color['surface-canvas'],
              colorBgHeader: color['surface-navigation'],
              colorBgTrigger: color['surface-elevated'],
            },
            Modal: { borderRadiusLG: px(tokens.primitive.radius.modal) },
            Table: {
              cellPaddingBlock: px(channelTokens['table-cell-block']),
              cellPaddingInline: px(channelTokens['table-cell-inline']),
              headerBg: color['surface-subtle'],
            },
          },
          token: {
            borderRadius: px(tokens.primitive.radius.control),
            borderRadiusLG: px(tokens.primitive.radius.card),
            colorBgBase: color['surface-canvas'],
            colorBgContainer: color['surface-container'],
            colorBgElevated: color['surface-elevated'],
            colorBgLayout: color['surface-canvas'],
            colorBorder: color['border-default'],
            colorBorderSecondary: color['border-default'],
            colorError: color['status-danger'],
            colorInfo: color['status-info'],
            colorPrimary: color['action-primary'],
            colorSuccess: color['status-success'],
            colorText: color['text-primary'],
            colorTextSecondary: color['text-secondary'],
            colorWarning: color['status-warning'],
            controlHeight: px(channelTokens['control-height']),
            fontFamily: tokens.primitive.font['family-sans'],
            fontSize: px(channelTokens['font-size-body']),
            motionDurationFast: tokens.primitive.motion.fast,
            motionDurationMid: tokens.primitive.motion.standard,
            motionDurationSlow: tokens.primitive.motion.slow,
            zIndexPopupBase: tokens.primitive['z-index'].popover,
          },
        };
      }
    }
  }
  return `${header('Ant Design Vue Theme Adapter', '//')}\nimport type { MomChannel, MomDensity, MomResolvedTheme } from './tokens';\n\nconst generatedAntdThemes = ${JSON.stringify(adapter, null, 2)} as const;\n\nexport function getMomAntdThemeTokens(\n  mode: MomResolvedTheme,\n  channel: MomChannel,\n  density: MomDensity,\n) {\n  if (channel === 'PORTAL') return generatedAntdThemes[mode].PORTAL.COMFORTABLE;\n  return generatedAntdThemes[mode].ADMIN[density];\n}\n`;
}

function flatten(value, prefix) {
  const entries = [];
  for (const key of Object.keys(value).sort()) {
    const next = prefix ? `${prefix}-${key}` : key;
    const nested = value[key];
    if (nested && typeof nested === 'object') entries.push(...flatten(nested, next));
    else entries.push([next, nested]);
  }
  return entries;
}

function cssBlock(selector, entries) {
  return `${selector} {\n${entries.map(([key, value]) => `  --mom-${key}: ${value};`).join('\n')}\n}`;
}

function legacyAliases() {
  return `/* S01～S04 兼容别名；消费者清零后删除。 */\n:root {\n  --mom-color-primary: var(--mom-color-action-primary);\n  --mom-color-primary-hover: var(--mom-color-action-primary-hover);\n  --mom-color-primary-active: var(--mom-color-action-primary-active);\n  --mom-color-primary-soft: var(--mom-color-action-primary-soft);\n  --mom-color-page: var(--mom-color-surface-canvas);\n  --mom-color-surface: var(--mom-color-surface-container);\n  --mom-color-navigation: var(--mom-color-surface-navigation);\n  --mom-color-text: var(--mom-color-text-primary);\n  --mom-color-border: var(--mom-color-border-default);\n  --mom-color-success: var(--mom-color-status-success);\n  --mom-color-warning: var(--mom-color-status-warning);\n  --mom-color-error: var(--mom-color-status-danger);\n  --mom-space-unit: var(--mom-space-1);\n}`;
}

function validateContrast(tokens) {
  for (const mode of ['LIGHT', 'DARK']) {
    const color = tokens.semantic[mode].color;
    const background = color['surface-container'];
    for (const key of ['text-primary', 'text-secondary', 'status-success', 'status-warning', 'status-danger']) {
      const ratio = contrast(color[key], background);
      if (ratio < 4.5) throw new Error(`${mode}.${key} contrast ${ratio.toFixed(2)} is below WCAG AA`);
    }
    for (const status of ['success', 'warning', 'danger', 'info']) {
      const ratio = contrast(color[`status-${status}`], color[`status-${status}-surface`]);
      if (ratio < 4.5) throw new Error(`${mode}.status-${status} surface contrast ${ratio.toFixed(2)} is below WCAG AA`);
    }
    const actionRatio = contrast(color['action-primary-foreground'], color['action-primary']);
    if (actionRatio < 4.5) throw new Error(`${mode}.action-primary contrast ${actionRatio.toFixed(2)} is below WCAG AA`);
    const focusRatio = contrast(color['focus-ring'], color['surface-canvas']);
    if (focusRatio < 3) throw new Error(`${mode}.focus-ring contrast ${focusRatio.toFixed(2)} is below 3:1`);
  }
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/gu).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function px(value) {
  if (typeof value === 'number') return value;
  const match = /^(\d+(?:\.\d+)?)px$/u.exec(value);
  if (!match) throw new Error(`Expected px value, received ${value}`);
  return Number(match[1]);
}

function header(label, prefix = '/*') {
  return prefix === '//'
    ? `// Generated from tokens/mom.tokens.json (${label}). Do not edit.`
    : `/* Generated from tokens/mom.tokens.json (${label}). Do not edit. */`;
}
