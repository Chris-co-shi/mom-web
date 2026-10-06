<script setup lang="ts">
defineProps<{ modelValue: number; min?: number; max?: number; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
function update(event: Event): void {
  const next = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(next)) emit('update:modelValue', next);
}
</script>

<template>
  <input class="mom-ui-input" type="number" :value="modelValue" :min="min" :max="max" :disabled="disabled" @input="update" />
</template>
