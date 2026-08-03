<script setup lang="ts">
import { computed } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App as AntApp, ConfigProvider, theme } from 'ant-design-vue';

import { antdLocale } from './locales';
import { momAntdTheme } from './app/theme';

const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();

const legacyTokenTheme = computed(() => ({
  algorithm: [
    isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
    ...(preferences.app.compact ? [theme.compactAlgorithm] : []),
  ],
  token: tokens,
}));

const tokenTheme = computed(() =>
  import.meta.env.VITE_MOM_THEME_PROVIDER === 'legacy'
    ? legacyTokenTheme.value
    : momAntdTheme.value,
);
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="tokenTheme">
    <AntApp>
      <RouterView />
    </AntApp>
  </ConfigProvider>
</template>
