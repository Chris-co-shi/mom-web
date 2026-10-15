<script setup lang="ts">
import { computed } from 'vue';
import { Input } from './input';

const props = withDefaults(defineProps<{
  modelValue?: string;
  value?: string;
  type?: string;
  size?: 'default' | 'large';
  disabled?: boolean;
  readonly?: boolean;
  maxLength?: number;
  maxlength?: number;
  autoComplete?: string;
  autocomplete?: string;
}>(), { type: 'text', size: 'default' });
const emit = defineEmits<{ 'update:modelValue': [value: string]; input: [value: string] }>();
const currentValue = computed(() => props.modelValue ?? props.value ?? '');
function update(value: string | number): void {
  const text = String(value);
  emit('update:modelValue', text);
}
function notifyInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  emit('input', value);
}
</script>

<template>
  <Input class="mom-ui-input" :class="{ 'mom-ui-input--large': size === 'large' }" :type="type" :model-value="currentValue"
    :disabled="disabled" :readonly="readonly" :maxlength="maxLength ?? maxlength" :autocomplete="autoComplete ?? autocomplete"
    @update:model-value="update" @input="notifyInput" />
</template>
