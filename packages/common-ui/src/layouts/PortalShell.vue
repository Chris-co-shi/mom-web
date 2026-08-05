<script setup lang="ts">
import MomIcon from '../icons/MomIcon.vue';
import type { PortalShellProps } from '../types';

defineOptions({
  name: 'MomPortalShell',
});

defineProps<PortalShellProps>();
</script>

<template>
  <div class="mom-portal-shell">
    <header class="mom-portal-shell__header">
      <div class="mom-portal-shell__brand">
        <MomIcon icon-key="app-window" />
        <div>
          <strong>{{ title }}</strong>
          <span v-if="subtitle">{{ subtitle }}</span>
        </div>
      </div>
      <div v-if="$slots.identity" class="mom-portal-shell__identity">
        <slot name="identity" />
      </div>
    </header>
    <main class="mom-portal-shell__content">
      <slot />
    </main>
  </div>
</template>
