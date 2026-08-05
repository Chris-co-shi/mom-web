<script setup lang="ts">
defineProps<{
  label: string;
}>();

defineEmits<{
  submit: [];
}>();
</script>

<template>
  <form
    class="mom-admin-filter-bar"
    role="search"
    :aria-label="label"
    @submit.prevent="$emit('submit')"
  >
    <div class="mom-admin-filter-bar__fields">
      <slot />
    </div>
    <div class="mom-admin-filter-bar__actions">
      <slot name="actions" />
    </div>
  </form>
</template>

<style scoped>
.mom-admin-filter-bar {
  display: grid;
  min-width: 0;
  padding: var(--mom-space-3) var(--mom-space-4);
  align-items: center;
  gap: var(--mom-space-3);
  background: var(--mom-color-surface-container);
  border: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
  border-radius: var(--mom-radius-control);
  grid-template-columns: minmax(0, 1fr) auto;
}

.mom-admin-filter-bar__fields,
.mom-admin-filter-bar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--mom-space-3);
}

.mom-admin-filter-bar__actions {
  justify-content: flex-end;
}

@media (width <= 768px) {
  .mom-admin-filter-bar {
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr);
  }

  .mom-admin-filter-bar__actions {
    justify-content: flex-start;
  }
}
</style>
