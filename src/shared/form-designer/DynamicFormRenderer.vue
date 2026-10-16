<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { defaultFieldRegistry } from './field-registry';
import { initializeFormData, validateFieldValue, validateFormSchema } from './schema';
import type { FieldRegistry, FormData, FormField, FormSchema, FormValue } from './types';

const props = withDefaults(defineProps<{ schema: FormSchema; modelValue?: FormData; disabled?: boolean; registry?: FieldRegistry }>(), { modelValue: () => ({}), registry: () => defaultFieldRegistry });
const emit = defineEmits<{ 'update:modelValue': [value: FormData]; validation: [errors: Record<string, string>] }>();
const form = reactive<FormData>({}); const touched = reactive<Record<string, boolean>>({});
const schemaErrors = computed(() => validateFormSchema(props.schema, props.registry));
const safeFields = computed(() => schemaErrors.value.length ? [] : props.schema.fields);
const errors = computed(() => Object.fromEntries(safeFields.value.flatMap((field) => {
  const message = validateFieldValue(field, form[field.name] ?? '', props.registry);
  return message ? [[field.name, message]] : [];
})));
let lastEmitted = '';
function applySource(resetTouched: boolean): void {
  const next = initializeFormData({ schemaVersion: 1, fields: safeFields.value }, props.modelValue, props.registry);
  Object.keys(form).forEach((key) => { if (!(key in next)) delete form[key]; });
  Object.assign(form, next);
  if (resetTouched) Object.keys(touched).forEach((key) => delete touched[key]);
}
watch(() => props.schema, () => applySource(true), { immediate: true, deep: true });
watch(() => props.modelValue, (value) => { const serialized = JSON.stringify(value ?? {}); if (serialized === lastEmitted) return; applySource(false); }, { immediate: true, deep: true });
watch(errors, (value) => emit('validation', value), { immediate: true });
function update(field: FormField, value: FormValue): void {
  form[field.name] = value; touched[field.name] = true;
  const next = { ...form }; lastEmitted = JSON.stringify(next); emit('update:modelValue', next);
}
function blur(field: FormField): void { touched[field.name] = true; }
function validate(): boolean { return schemaErrors.value.length === 0 && Object.keys(errors.value).length === 0; }
defineExpose({ validate, errors });
</script>

<template>
  <div class="dynamic-form" :aria-invalid="schemaErrors.length > 0">
    <ul v-if="schemaErrors.length" class="designer-errors" role="alert"><li v-for="error in schemaErrors" :key="error">{{ error }}</li></ul>
    <div v-for="field in safeFields" :key="field.id" class="dynamic-form__field">
      <label :for="`dynamic-${field.id}`" class="dynamic-form__label">{{ field.label }}<span v-if="field.required" aria-hidden="true" class="dynamic-form__required">*</span></label>
      <component :is="registry.get(field.type)?.control" :id="`dynamic-${field.id}`" :model-value="form[field.name]"
        :type="field.type === 'NUMBER' ? 'number' : undefined" :min="field.min" :max="field.max" :maxlength="field.maxLength"
        :readonly="field.readonly" :disabled="disabled || field.disabled || (field.type === 'NUMBER' && field.readonly)"
        :options="field.type === 'SELECT' ? (field.options ?? []).map((option) => ({ label: option.label, value: option.value })) : undefined"
        :placeholder="field.type === 'SELECT' ? `请选择${field.label}` : undefined"
        :aria-invalid="Boolean(touched[field.name] && errors[field.name])" :aria-describedby="errors[field.name] ? `error-${field.id}` : undefined"
        @update:model-value="update(field, props.registry.get(field.type)?.normalize?.($event) ?? $event)" @blur="blur(field)" />
      <p v-if="touched[field.name] && errors[field.name]" :id="`error-${field.id}`" class="dynamic-form__error" role="alert">{{ errors[field.name] }}</p>
    </div>
  </div>
</template>
