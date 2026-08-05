<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  title: string;
}>();

const titleId = useId();
</script>

<template>
  <section
    class="mom-admin-content-section"
    :aria-labelledby="titleId"
  >
    <header class="mom-admin-content-section__header">
      <h2 :id="titleId">
        {{ title }}
      </h2>
      <div v-if="$slots.actions" class="mom-admin-content-section__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="mom-admin-content-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.mom-admin-content-section {
  min-width: 0;
  overflow: hidden;
  background: var(--mom-color-surface-container);
  border: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
  border-radius: var(--mom-radius-card);
}

.mom-admin-content-section__header {
  display: flex;
  min-width: 0;
  min-height: var(--mom-channel-control-height);
  padding: var(--mom-space-3) var(--mom-space-4);
  align-items: center;
  justify-content: space-between;
  gap: var(--mom-space-3);
  border-bottom: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
}

.mom-admin-content-section__header h2 {
  min-width: 0;
  margin: 0;
  color: var(--mom-color-text-primary);
  font-size: var(--mom-font-size-18);
  font-weight: var(--mom-font-weight-semibold);
  letter-spacing: var(--mom-font-letter-spacing-heading);
}

.mom-admin-content-section__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: var(--mom-space-2);
}

.mom-admin-content-section__body {
  min-width: 0;
  padding: var(--mom-space-4);
  overflow-x: auto;
}
</style>
