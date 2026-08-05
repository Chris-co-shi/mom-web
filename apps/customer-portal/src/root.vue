<script setup lang="ts">
import { App, ConfigProvider } from 'ant-design-vue';

import AuthGate from './AuthGate.vue';
import { momAntdTheme } from './app/theme';
</script>

<template>
  <ConfigProvider :theme="momAntdTheme">
    <App>
      <AuthGate />
    </App>
  </ConfigProvider>
</template>
