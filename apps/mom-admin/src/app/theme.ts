import type { MomThemeMode, MomThemeSnapshot } from '@mom/design-tokens';
import { createMomThemeRuntime, getMomAntdThemeTokens } from '@mom/design-tokens';
import type { ResolvedUserPreference } from '@mom/system-client';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';
import { computed, readonly, shallowRef } from 'vue';
import { theme } from 'ant-design-vue';

const snapshot = shallowRef<Readonly<MomThemeSnapshot>>();

export const momThemeRuntime = createMomThemeRuntime({
  channel: 'ADMIN',
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
    algorithm: [
      current.resolvedTheme === 'DARK' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      ...(current.density === 'COMPACT' ? [theme.compactAlgorithm] : []),
    ],
    components: { ...generated.components },
    token: { ...generated.token },
  };
});

/** 匿名阶段只切换当前运行实例，不写入或伪造 System Preference。 */
export function setAnonymousThemeMode(mode: MomThemeMode): void {
  momThemeRuntime.setMode(mode);
}

/** 将 System 返回的白名单显示偏好应用到 MOM 主题运行时。 */
export function applySystemPreference(preference: ResolvedUserPreference): void {
  momThemeRuntime.setMode(preference.themeMode);
  momThemeRuntime.setDensity(preference.density);
}
