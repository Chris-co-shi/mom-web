<script setup lang="ts">
import { Textarea } from './textarea';
defineProps<{ modelValue?: string; disabled?: boolean; maxlength?: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <Textarea class="mom-ui-input mom-ui-textarea" :model-value="modelValue ?? ''" :disabled="disabled" :maxlength="maxlength"
    @update:model-value="emit('update:modelValue', String($event))" />
</template>
