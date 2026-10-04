<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { MessageKey } from '../locales/zh-CN';
import { ROUTE_NAMES } from '../router/route-names';
import { useLocale } from '../shared/i18n/locale';
import './route-state.css';

defineProps<{
  code: string;
  eyebrowKey: MessageKey;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
}>();

const { t } = useLocale();
</script>

<template>
  <main class="route-state">
    <div class="route-state__grid" aria-hidden="true"></div>
    <section class="route-state__content" :aria-labelledby="`route-state-${code}`">
      <span class="route-state__eyebrow">{{ t(eyebrowKey) }}</span>
      <strong class="route-state__code">{{ code }}</strong>
      <h1 :id="`route-state-${code}`">{{ t(titleKey) }}</h1>
      <p>{{ t(descriptionKey) }}</p>
      <RouterLink class="route-state__link" :to="{ name: ROUTE_NAMES.foundationOverview }">
        {{ t('common.returnFoundation') }} <span aria-hidden="true">→</span>
      </RouterLink>
    </section>
  </main>
</template>
