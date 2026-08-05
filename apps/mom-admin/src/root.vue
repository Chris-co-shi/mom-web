<script setup lang="ts">
import { App as AntApp, ConfigProvider } from 'ant-design-vue';

import { momAntdTheme } from './app/theme';
import { antdLocale } from './locales';
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="momAntdTheme">
    <AntApp>
      <RouterView />
    </AntApp>
  </ConfigProvider>
</template>
