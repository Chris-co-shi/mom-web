import type { MomThemeSnapshot } from '@mom/design-tokens';
import { createMomThemeRuntime, getMomAntdThemeTokens } from '@mom/design-tokens';
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
