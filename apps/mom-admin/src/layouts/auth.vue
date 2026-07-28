<script setup lang="ts">
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';

import authArtwork from '../assets/mom-auth-background.svg';
import { $t } from '../locales';

const appName = computed(() => preferences.app.name);
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :copyright="true"
    :page-description="$t('mom.auth.pageDescription')"
    :page-title="$t('mom.auth.pageTitle')"
    :slogan-image="authArtwork"
    :toolbar-list="['color', 'language', 'layout', 'theme']"
  />
</template>
