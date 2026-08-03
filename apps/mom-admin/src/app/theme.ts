import type { MomDensity, MomThemeMode, MomThemeSnapshot } from '@mom/design-tokens';
import { createMomThemeRuntime, getMomAntdThemeTokens } from '@mom/design-tokens';
import { preferences } from '@vben/preferences';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';
import { computed, readonly, shallowRef, watch } from 'vue';
import { theme } from 'ant-design-vue';

const snapshot = shallowRef<Readonly<MomThemeSnapshot>>();

export const momThemeRuntime = createMomThemeRuntime({
  channel: 'ADMIN',
  density: mapDensity(preferences.app.compact),
  mode: mapThemeMode(preferences.theme.mode),
});

snapshot.value = momThemeRuntime.snapshot();
momThemeRuntime.subscribe((next) => {
  snapshot.value = next;
});

export const momThemeSnapshot = readonly(snapshot);

export const momAntdTheme = computed<ThemeConfig>(() => {
  const current = snapshot.value ?? momThemeRuntime.snapshot();
  const generated = getMomAntdThemeTokens(
    current.resolvedTheme,
    current.channel,
    current.density,
  );
  return {
    algorithm: [
      current.resolvedTheme === 'DARK' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      ...(current.density === 'COMPACT' ? [theme.compactAlgorithm] : []),
    ],
    components: { ...generated.components },
    token: { ...generated.token },
  };
});

let bridgeStarted = false;

/**
 * 启动 Vben 到 MOM Theme Runtime 的迁移桥。
 *
 * S01～S03 期间旧 Shell 仍拥有 Theme Toggle 和 Compact Toggle，因此只监听旧状态并映射到
 * MOM 根属性与 Antdv Adapter；S04 替换 Preferences/Shell 后删除本桥。
 */
export function startAdminThemeBridge(): void {
  if (bridgeStarted) return;
  bridgeStarted = true;
  watch(
    () => preferences.theme.mode,
    (mode) => momThemeRuntime.setMode(mapThemeMode(mode)),
  );
  watch(
    () => preferences.app.compact,
    (compact) => momThemeRuntime.setDensity(mapDensity(compact)),
  );
}

function mapThemeMode(mode: string): MomThemeMode {
  if (mode === 'dark') return 'DARK';
  if (mode === 'auto') return 'SYSTEM';
  return 'LIGHT';
}

function mapDensity(compact: boolean): MomDensity {
  return compact ? 'COMPACT' : 'COMFORTABLE';
}
