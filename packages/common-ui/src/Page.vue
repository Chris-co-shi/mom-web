<script setup lang="ts">
import type { PageProps } from './types';

defineOptions({
  name: 'MomPage',
});

defineProps<PageProps>();
</script>

<template>
  <section class="mom-page">
    <header
      v-if="title || description || $slots.title || $slots.description || $slots.extra"
      class="mom-page__header"
      :class="headerClass"
    >
      <div class="mom-page__heading">
        <slot name="title">
          <h1 v-if="title">{{ title }}</h1>
        </slot>

        <slot name="description">
          <p v-if="description">{{ description }}</p>
        </slot>
      </div>

      <div v-if="$slots.extra" class="mom-page__extra">
        <slot name="extra" />
      </div>
    </header>

    <div class="mom-page__content" :class="contentClass">
      <slot />
    </div>
  </section>
</template>
