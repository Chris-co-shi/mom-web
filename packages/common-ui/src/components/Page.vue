<script setup lang="ts">
import { computed, useId } from 'vue';

import type { PageProps } from '../types';

defineOptions({
  name: 'MomPage',
});

const props = defineProps<PageProps>();
const generatedTitleId = useId();
const accessibleTitleId = computed(() => props.labelledBy ?? (
  props.title ? generatedTitleId : undefined
));
const hasHeader = computed(() => Boolean(
  props.title
  || props.description
));
</script>

<template>
  <section class="mom-page" :aria-labelledby="accessibleTitleId">
    <header
      v-if="hasHeader || $slots.title || $slots.description || $slots.context || $slots.actions"
      class="mom-page__header"
    >
      <div class="mom-page__heading">
        <slot name="context" />
        <slot name="title">
          <h1 v-if="title" :id="generatedTitleId">{{ title }}</h1>
        </slot>
        <slot name="description">
          <p v-if="description">{{ description }}</p>
        </slot>
      </div>

      <div v-if="$slots.actions" class="mom-page__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="mom-page__content">
      <slot />
    </div>
  </section>
</template>
