<script setup lang="ts">
import { computed } from 'vue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface Option { label: string; value: string | number }
const props = defineProps<{ modelValue?: string | number; options: readonly Option[]; placeholder?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: { value: string }] }>();
const emptyValue = '__mom_select_empty__';
const selected = computed(() => String(props.modelValue ?? '') || emptyValue);
function change(value: unknown): void {
  const next = String(value ?? '') === emptyValue ? '' : String(value ?? '');
  emit('update:modelValue', next);
  emit('change', { value: next });
}
</script>

<template>
  <Select :model-value="selected" :disabled="disabled" @update:model-value="change">
    <SelectTrigger class="mom-ui-select" :aria-label="placeholder"><SelectValue :placeholder="placeholder" /></SelectTrigger>
    <SelectContent class="mom-ui-select__content" position="popper" :side-offset="5">
      <SelectItem v-for="option in options" :key="String(option.value)" class="mom-ui-select__item" :value="String(option.value) || emptyValue">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
