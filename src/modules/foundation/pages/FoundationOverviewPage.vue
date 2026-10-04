<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { ROUTE_NAMES } from '../../../router/route-names';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { formatDecimalString, formatInstant, formatUnit } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import './foundation-overview.css';

const { locale, t } = useLocale();
const showComponentValidation = import.meta.env.DEV;

const foundationLayers = computed(() => [
  { index: '01', title: t('foundation.layer.tokens.title'), description: t('foundation.layer.tokens.description') },
  { index: '02', title: t('foundation.layer.theme.title'), description: t('foundation.layer.theme.description') },
  { index: '03', title: t('foundation.layer.layout.title'), description: t('foundation.layer.layout.description') },
  { index: '04', title: t('foundation.layer.http.title'), description: t('foundation.layer.http.description') },
  { index: '05', title: t('foundation.layer.locale.title'), description: t('foundation.layer.locale.description') },
]);

const formattingSamples = computed(() => [
  { label: t('foundation.format.locale'), value: locale.value },
  {
    label: t('foundation.format.instant'),
    value: formatInstant('2026-10-04T00:00:00Z', {
      locale: locale.value,
      timeZone: 'Asia/Shanghai',
    }),
  },
  {
    label: t('foundation.format.decimal'),
    value: formatDecimalString('12345678901234567890.1250', { locale: locale.value }),
  },
  {
    label: t('foundation.format.unit'),
    value: formatUnit('1250.500', 'kg', { locale: locale.value }),
  },
]);
</script>

<template>
  <PageContainer class="foundation-page">
    <section class="foundation-hero" aria-labelledby="foundation-title">
      <div>
        <div class="foundation-eyebrow">
          <span class="app-status-dot" aria-hidden="true"></span>
          {{ t('foundation.overview.eyebrow') }}
        </div>
        <h1 id="foundation-title">{{ t('foundation.overview.heroTitle') }}</h1>
        <p>{{ t('foundation.overview.heroDescription') }}</p>
      </div>

      <aside class="foundation-hero__status" :aria-label="t('foundation.overview.activeSlice')">
        <span>{{ t('foundation.overview.activeSlice') }}</span>
        <strong>{{ t('foundation.overview.activeCode') }}</strong>
        <small>{{ t('foundation.overview.activeCapabilities') }}</small>
      </aside>
    </section>

    <section class="foundation-section" aria-labelledby="foundation-layers-title">
      <div class="foundation-section__heading">
        <div>
          <span>{{ t('foundation.overview.mapLabel') }}</span>
          <h2 id="foundation-layers-title">{{ t('foundation.overview.mapTitle') }}</h2>
        </div>
        <RouterLink
          v-if="showComponentValidation"
          class="foundation-link"
          :to="{ name: ROUTE_NAMES.foundationComponents }"
        >
          {{ t('foundation.overview.viewComponents') }} <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <div class="foundation-layer-list">
        <article v-for="layer in foundationLayers" :key="layer.index" class="foundation-layer">
          <span class="foundation-layer__index">{{ layer.index }}</span>
          <div>
            <h3>{{ layer.title }}</h3>
            <p>{{ layer.description }}</p>
          </div>
          <span class="foundation-layer__status">
            <span class="app-status-dot" aria-hidden="true"></span>
            {{ t('foundation.layer.ready') }}
          </span>
        </article>
      </div>
    </section>

    <section class="foundation-format" aria-labelledby="format-title">
      <div>
        <span class="foundation-format__label">{{ t('foundation.format.label') }}</span>
        <h2 id="format-title">{{ t('foundation.format.title') }}</h2>
      </div>
      <dl>
        <div v-for="sample in formattingSamples" :key="sample.label">
          <dt>{{ sample.label }}</dt>
          <dd>{{ sample.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="foundation-sequence" aria-labelledby="sequence-title">
      <div>
        <span class="foundation-sequence__label">{{ t('foundation.sequence.label') }}</span>
        <h2 id="sequence-title">{{ t('foundation.sequence.title') }}</h2>
      </div>
      <ol>
        <li><strong>IAM</strong><span>{{ t('foundation.sequence.iam') }}</span></li>
        <li><strong>System</strong><span>{{ t('foundation.sequence.system') }}</span></li>
        <li><strong>MDM</strong><span>{{ t('foundation.sequence.mdm') }}</span></li>
      </ol>
    </section>
  </PageContainer>
</template>
