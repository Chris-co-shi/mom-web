<script setup lang="ts">
import { RouterView } from 'vue-router';
import LocaleSwitcher from '../shared/i18n/LocaleSwitcher.vue';
import { useLocale } from '../shared/i18n/locale';
import ThemeSwitcher from '../shared/theme/ThemeSwitcher.vue';
import MomBrand from '../shared/components/MomBrand.vue';
import { useWindowSize } from '@vueuse/core';
import './layouts.css';

const { t } = useLocale();
const { width } = useWindowSize();
</script>

<template>
  <main class="auth-layout">
    <div class="auth-layout__theme">
      <LocaleSwitcher :compact="width < 640" />
      <ThemeSwitcher :compact="width < 640" />
    </div>
    <section class="auth-layout__context" aria-labelledby="auth-product-title">
      <div class="auth-layout__orbit" aria-hidden="true">
        <span class="auth-layout__orbit-ring auth-layout__orbit-ring--outer"></span>
        <span class="auth-layout__orbit-ring auth-layout__orbit-ring--inner"></span>
        <span class="auth-layout__orbit-core"></span>
      </div>
      <div class="app-brand app-brand--auth" aria-label="MOM">
        <MomBrand />
      </div>

      <div class="auth-layout__message">
        <span class="auth-layout__eyebrow">{{ t('auth.layout.eyebrow') }}</span>
        <h1 id="auth-product-title">{{ t('auth.layout.heroTitle') }}</h1>
        <p>{{ t('auth.layout.heroDescription') }}</p>
      </div>

    </section>

    <section class="auth-layout__content">
      <RouterView />
    </section>
  </main>
</template>
