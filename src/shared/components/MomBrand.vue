<script setup lang="ts">
defineProps<{ iconOnly?: boolean }>();
</script>

<template>
  <span class="mom-brand" aria-label="MOM">
    <svg viewBox="0 0 48 48" width="36" height="36" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="14" fill="currentColor" opacity=".1" />
      <path d="M12 34V16a2 2 0 0 1 3.5-1.3L24 25l8.5-10.3A2 2 0 0 1 36 16v18" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <strong v-if="!iconOnly">MOM</strong>
  </span>
</template>

<style scoped>
.mom-brand { display: inline-flex; flex: none; align-items: center; gap: 12px; color: var(--mom-color-brand); }
.mom-brand strong { color: var(--mom-color-text-primary); font-size: 20px; letter-spacing: .06em; }
</style>
