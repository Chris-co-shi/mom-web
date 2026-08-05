<script setup lang="ts">
import { computed } from 'vue';

import { resolveMomIcon } from './registry';

defineOptions({
  name: 'MomIcon',
});

const props = withDefaults(defineProps<{
  iconKey: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}>(), {
  label: undefined,
  size: 'md',
});

const resolved = computed(() => resolveMomIcon(props.iconKey));
</script>

<template>
  <component
    :is="resolved.component"
    class="mom-icon"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :data-known="resolved.known"
    :data-size="size"
    :role="label ? 'img' : undefined"
  />
</template>
