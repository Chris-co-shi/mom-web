<script setup lang="ts">
defineProps<{ modelValue: boolean; text?: string }>();
</script>

<template>
  <div v-if="modelValue" class="mom-ui-loading" role="status" aria-live="polite">
    <span class="mom-ui-spinner" aria-hidden="true"></span><span>{{ text }}</span>
  </div>
</template>
