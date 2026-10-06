<script setup lang="ts">
import { RouterView } from 'vue-router';
import LocaleSwitcher from '../shared/i18n/LocaleSwitcher.vue';
import { useLocale } from '../shared/i18n/locale';
import ThemeSwitcher from '../shared/theme/ThemeSwitcher.vue';
import './layouts.css';

const { t } = useLocale();
</script>

<template>
  <main class="auth-layout">
    <div class="auth-layout__theme">
      <LocaleSwitcher />
      <ThemeSwitcher />
    </div>
    <section class="auth-layout__context" aria-labelledby="auth-product-title">
      <div class="auth-layout__orbit" aria-hidden="true">
        <span class="auth-layout__orbit-ring auth-layout__orbit-ring--outer"></span>
        <span class="auth-layout__orbit-ring auth-layout__orbit-ring--inner"></span>
        <span class="auth-layout__orbit-core"></span>
      </div>
      <div class="app-brand app-brand--auth" aria-label="MOM">
        <span class="app-brand__mark" aria-hidden="true"><span></span></span>
        <span class="app-brand__copy">
          <strong>MOM</strong>
          <small>MANUFACTURING OS</small>
        </span>
      </div>

      <div class="auth-layout__message">
        <span class="auth-layout__eyebrow">{{ t('auth.layout.eyebrow') }}</span>
        <h1 id="auth-product-title">{{ t('auth.layout.heroTitle') }}</h1>
        <p>{{ t('auth.layout.heroDescription') }}</p>
        <dl class="auth-layout__capabilities">
          <div>
            <dt>01</dt>
            <dd>{{ t('auth.layout.gateway') }}</dd>
          </div>
          <div>
            <dt>02</dt>
            <dd>{{ t('auth.layout.opaqueToken') }}</dd>
          </div>
          <div>
            <dt>03</dt>
            <dd>{{ t('auth.layout.permissionBoundary') }}</dd>
          </div>
        </dl>
      </div>

      <div class="auth-layout__signal" :aria-label="t('auth.layout.boundaryAria')">
        <span class="app-status-dot" aria-hidden="true"></span>
        <span>{{ t('auth.layout.boundaryStatus') }}</span>
      </div>
    </section>

    <section class="auth-layout__content">
      <RouterView />
    </section>
  </main>
</template>
