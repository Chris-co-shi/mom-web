<script setup lang="ts">
import type { MomThemeMode } from '@mom/design-tokens';
import type { SystemLocale } from '@mom/system-client';
import { Button as AButton } from 'ant-design-vue';
import { computed } from 'vue';
import { RouterView } from 'vue-router';

import { AuthShell } from '@mom/common-ui';

import { appConfig } from '../app/config';
import {
  momThemeSnapshot,
  setAnonymousThemeMode,
} from '../app/theme';
import authArtwork from '../assets/mom-auth-background.svg';
import {
  $t,
  currentLocale,
  setLocale,
} from '../locales';

const copyrightLabel = computed(() =>
  `© ${appConfig.copyright.date} ${appConfig.copyright.companyName}`,
);
const themeMode = computed(() => momThemeSnapshot.value?.mode ?? 'LIGHT');

const themeModes: readonly MomThemeMode[] = ['LIGHT', 'DARK', 'SYSTEM'];

function toggleLocale(): void {
  const next: SystemLocale = currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  void setLocale(next);
}

function cycleTheme(): void {
  const index = themeModes.indexOf(themeMode.value);
  setAnonymousThemeMode(themeModes[(index + 1) % themeModes.length] ?? 'LIGHT');
}
</script>

<template>
  <AuthShell
    channel="ADMIN"
    :description="$t('mom.auth.pageDescription')"
    :title="$t('mom.auth.pageTitle')"
  >
    <template #brand>
      <span class="mom-auth-product">{{ appConfig.name }}</span>
      <div class="mom-auth-shell__brand-title">
        {{ $t('mom.auth.pageTitle') }}
      </div>
      <p>{{ $t('mom.auth.pageDescription') }}</p>
    </template>
    <template #artwork>
      <img :alt="appConfig.name" :src="authArtwork">
    </template>
    <template #toolbar>
      <a-button
        class="mom-auth-toolbar__control"
        type="text"
        :aria-label="$t('mom.appearance.language')"
        :title="$t('mom.appearance.language')"
        @click="toggleLocale"
      >
        {{ currentLocale === 'zh-CN' ? '中' : 'EN' }}
      </a-button>
      <a-button
        class="mom-auth-toolbar__control"
        type="text"
        :aria-label="$t('mom.appearance.theme')"
        :title="$t('mom.appearance.theme')"
        @click="cycleTheme"
      >
        {{ $t(`mom.appearance.${themeMode.toLowerCase()}`) }}
      </a-button>
    </template>
    <template #form>
      <RouterView />
    </template>
    <template #footer>
      <span>{{ copyrightLabel }}</span>
    </template>
  </AuthShell>
</template>
