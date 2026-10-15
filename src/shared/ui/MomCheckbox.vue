<script setup lang="ts">
import { Checkbox } from './checkbox';
defineProps<{ modelValue?: boolean; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; change: [value: boolean] }>();
function update(value: boolean | 'indeterminate'): void {
  const checked = value === true;
  emit('update:modelValue', checked);
  emit('change', checked);
}
</script>

<template>
  <Checkbox class="mom-ui-checkbox" :model-value="modelValue" :disabled="disabled" @update:model-value="update" />
</template>
