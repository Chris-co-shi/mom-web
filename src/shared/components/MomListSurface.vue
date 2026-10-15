<script setup lang="ts">
import MomLoading from '../ui/MomLoading.vue';
import './mom-management.css';

defineProps<{
  title: string;
  hint: string;
  loading: boolean;
  loadingText: string;
  embedded?: boolean;
}>();
</script>

<template>
  <div class="mom-list-surface" :class="{ 'mom-list-surface--embedded': embedded }" :aria-busy="loading">
    <div class="mom-list-surface__toolbar">
      <div class="mom-list-surface__identity">
        <span class="mom-list-surface__mark" aria-hidden="true"></span>
        <div class="mom-list-surface__copy">
          <strong>{{ title }}</strong>
          <span>{{ hint }}</span>
        </div>
      </div>
      <slot name="toolbar" />
    </div>
    <div class="mom-list-surface__table-wrap"><slot /></div>
    <slot name="footer" />
    <MomLoading class="mom-list-surface__loading" :model-value="loading" :text="loadingText" />
  </div>
</template>
