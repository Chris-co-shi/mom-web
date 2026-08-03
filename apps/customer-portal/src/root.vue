<script setup lang="ts">
import { App as AntApp, ConfigProvider } from 'ant-design-vue';

import AuthGate from './AuthGate.vue';
import { momAntdTheme } from './app/theme';
</script>

<template>
  <ConfigProvider :theme="momAntdTheme">
    <AntApp>
      <AuthGate />
    </AntApp>
  </ConfigProvider>
</template>
