<script setup lang="ts">
import { Search } from '@lucide/vue';
import MomInput from '../ui/MomInput.vue';
import './mom-crud-controls.css';

defineProps<{ modelValue: string; label: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label class="mom-crud-search">
    <Search :size="17" aria-hidden="true" />
    <span class="mom-visually-hidden">{{ label }}</span>
    <MomInput :model-value="modelValue" type="search" :placeholder="label" :disabled="disabled"
      @update:model-value="emit('update:modelValue', String($event ?? ''))" />
  </label>
</template>
