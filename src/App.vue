<script setup lang="ts">
import ConfigProvider from 'tdesign-vue-next/es/config-provider';
import { RouterView } from 'vue-router';
import { useLocale } from './shared/i18n/locale';

const { componentLocale } = useLocale();
</script>

<template>
  <ConfigProvider :global-config="componentLocale">
    <RouterView />
  </ConfigProvider>
</template>
