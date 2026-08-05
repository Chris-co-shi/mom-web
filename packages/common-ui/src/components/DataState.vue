<script setup lang="ts">
import { computed } from 'vue';

import { Button, Spin } from 'ant-design-vue';

import MomIcon from '../icons/MomIcon.vue';
import type { DataStateProps } from '../types';

defineOptions({
  name: 'MomDataState',
});

const props = defineProps<DataStateProps>();
const emit = defineEmits<{
  action: [];
}>();

const iconKey = computed(() => {
  if (props.kind === 'ERROR' || props.kind === 'FORBIDDEN') return 'shield-check';
  if (props.kind === 'PARTIAL') return 'monitor-smartphone';
  if (props.kind === 'EMPTY' || props.kind === 'NO_RESULT') return 'scroll-text';
  return 'unknown-data-state';
});
</script>

<template>
  <section
    class="mom-data-state"
    :data-kind="kind"
    :aria-busy="kind === 'LOADING'"
    :aria-live="kind === 'LOADING' ? 'polite' : 'assertive'"
    role="status"
  >
    <Spin v-if="kind === 'LOADING'" size="large" />
    <MomIcon v-else :icon-key="iconKey" size="lg" />
    <div class="mom-data-state__copy">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
      <p v-if="correlationId" class="mom-data-state__correlation">
        Correlation ID: {{ correlationId }}
      </p>
    </div>
    <Button v-if="actionLabel" @click="emit('action')">
      {{ actionLabel }}
    </Button>
  </section>
</template>
