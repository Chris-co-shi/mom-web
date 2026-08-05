import type { MomThemeSnapshot } from '@mom/design-tokens';
import { createMomThemeRuntime, getMomAntdThemeTokens } from '@mom/design-tokens';
import type { ResolvedUserPreference } from '@mom/system-client';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';
import { computed, readonly, shallowRef } from 'vue';
import { theme } from 'ant-design-vue';

const snapshot = shallowRef<Readonly<MomThemeSnapshot>>();

export const momThemeRuntime = createMomThemeRuntime({
  channel: 'PORTAL',
  density: 'COMFORTABLE',
  mode: 'LIGHT',
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
    algorithm: current.resolvedTheme === 'DARK'
      ? theme.darkAlgorithm
      : theme.defaultAlgorithm,
    components: { ...generated.components },
    token: { ...generated.token },
  };
});

/** 将 System 偏好映射到 Customer Portal 独立主题实例。 */
export function applySystemPreference(preference: ResolvedUserPreference): void {
  momThemeRuntime.setMode(preference.themeMode);
  momThemeRuntime.setDensity(preference.density);
  document.documentElement.lang = preference.locale;
}
