<script setup lang="ts">
import type { AuthShellProps } from '../types';

defineOptions({
  name: 'MomAuthShell',
});

defineProps<AuthShellProps>();
</script>

<template>
  <main class="mom-auth-shell" :data-channel="channel">
    <section class="mom-auth-shell__brand" :aria-label="title">
      <div class="mom-auth-shell__brand-copy">
        <slot name="brand">
          <div class="mom-auth-shell__brand-title">{{ title }}</div>
          <p v-if="description">{{ description }}</p>
        </slot>
      </div>
      <div v-if="$slots.artwork" class="mom-auth-shell__artwork" aria-hidden="true">
        <slot name="artwork" />
      </div>
    </section>

    <section class="mom-auth-shell__panel">
      <div v-if="$slots.toolbar" class="mom-auth-shell__toolbar">
        <slot name="toolbar" />
      </div>
      <div class="mom-auth-shell__form">
        <slot name="form" />
      </div>
      <footer v-if="$slots.footer" class="mom-auth-shell__footer">
        <slot name="footer" />
      </footer>
    </section>
  </main>
</template>
