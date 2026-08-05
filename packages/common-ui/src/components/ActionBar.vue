<script setup lang="ts">
import type { ActionBarProps } from '../types';

defineOptions({
  name: 'MomActionBar',
});

withDefaults(defineProps<ActionBarProps>(), {
  label: '页面操作',
});
</script>

<template>
  <div class="mom-action-bar" :aria-label="label" role="toolbar">
    <div v-if="$slots.context" class="mom-action-bar__context">
      <slot name="context" />
    </div>
    <div
      v-if="$slots.secondary || $slots.primary || $slots.overflow"
      class="mom-action-bar__actions"
    >
      <div v-if="$slots.secondary" class="mom-action-bar__secondary">
        <slot name="secondary" />
      </div>
      <div v-if="$slots.primary" class="mom-action-bar__primary">
        <slot name="primary" />
      </div>
      <div v-if="$slots.overflow" class="mom-action-bar__overflow">
        <slot name="overflow" />
      </div>
    </div>
  </div>
</template>
