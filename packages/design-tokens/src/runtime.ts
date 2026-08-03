import type {
  MomChannel,
  MomDensity,
  MomResolvedTheme,
  MomThemeMode,
} from './generated/tokens';

export interface MomThemeSnapshot {
  channel: MomChannel;
  density: MomDensity;
  mode: MomThemeMode;
  resolvedTheme: MomResolvedTheme;
}

export interface MomThemeDocument {
  documentElement: {
    classList: { toggle(name: string, force?: boolean): boolean };
    dataset: Record<string, string | undefined>;
    style: { colorScheme: string };
  };
}

export interface MomThemeMediaQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}

export interface MomThemeRuntimeOptions {
  channel: MomChannel;
  density?: MomDensity;
  document?: MomThemeDocument;
  matchMedia?: (query: string) => MomThemeMediaQuery;
  mode?: MomThemeMode;
  onDiagnostic?: (message: string) => void;
}

export interface MomThemeRuntime {
  destroy(): void;
  setDensity(density: MomDensity): void;
  setMode(mode: MomThemeMode): void;
  snapshot(): Readonly<MomThemeSnapshot>;
  subscribe(listener: (snapshot: Readonly<MomThemeSnapshot>) => void): () => void;
}

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * 创建应用独立的主题运行时。
 *
 * 运行时只负责同步主题状态到根元素，不读取用户身份、浏览器持久化或后端偏好。
 * S03 会把经过用户隔离和版本校验的可信值作为启动输入注入。
 */
export function createMomThemeRuntime(options: MomThemeRuntimeOptions): MomThemeRuntime {
  const documentRef = options.document ?? globalThis.document;
  const media = (options.matchMedia ?? globalThis.matchMedia.bind(globalThis))(SYSTEM_DARK_QUERY);
  const listeners = new Set<(snapshot: Readonly<MomThemeSnapshot>) => void>();
  let mode = options.mode ?? 'LIGHT';
  let density = normalizeDensity(options.channel, options.density ?? 'COMFORTABLE', options.onDiagnostic);
  let state = resolveSnapshot(options.channel, mode, density, media.matches);

  const publish = (): void => {
    state = resolveSnapshot(options.channel, mode, density, media.matches);
    applySnapshot(documentRef, state);
    for (const listener of listeners) listener(state);
  };

  const handleSystemChange = (): void => {
    if (mode === 'SYSTEM') publish();
  };

  media.addEventListener('change', handleSystemChange);
  applySnapshot(documentRef, state);

  return {
    destroy() {
      media.removeEventListener('change', handleSystemChange);
      listeners.clear();
    },
    setDensity(nextDensity) {
      const normalized = normalizeDensity(options.channel, nextDensity, options.onDiagnostic);
      if (density === normalized) return;
      density = normalized;
      publish();
    },
    setMode(nextMode) {
      if (mode === nextMode) return;
      mode = nextMode;
      publish();
    },
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}

function normalizeDensity(
  channel: MomChannel,
  density: MomDensity,
  onDiagnostic?: (message: string) => void,
): MomDensity {
  if (channel === 'PORTAL' && density === 'COMPACT') {
    onDiagnostic?.('Portal 不支持 COMPACT，已回退到 COMFORTABLE。');
    return 'COMFORTABLE';
  }
  return density;
}

function resolveSnapshot(
  channel: MomChannel,
  mode: MomThemeMode,
  density: MomDensity,
  systemDark: boolean,
): Readonly<MomThemeSnapshot> {
  return Object.freeze({
    channel,
    density,
    mode,
    resolvedTheme: mode === 'SYSTEM' ? (systemDark ? 'DARK' : 'LIGHT') : mode,
  });
}

function applySnapshot(documentRef: MomThemeDocument, snapshot: Readonly<MomThemeSnapshot>): void {
  const root = documentRef.documentElement;
  root.dataset.momThemeMode = snapshot.mode;
  root.dataset.momTheme = snapshot.resolvedTheme;
  root.dataset.momDensity = snapshot.density;
  root.dataset.momChannel = snapshot.channel;
  root.style.colorScheme = snapshot.resolvedTheme === 'DARK' ? 'dark' : 'light';
  // Vben 仍依赖 .dark；S04 完成 MOM Shell 替换后删除此兼容输出。
  root.classList.toggle('dark', snapshot.resolvedTheme === 'DARK');
}
