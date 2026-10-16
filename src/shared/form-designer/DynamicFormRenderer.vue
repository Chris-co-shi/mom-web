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
function applySource(resetTouched: boolean): void {
  const next = initializeFormData({ schemaVersion: 1, fields: safeFields.value }, props.modelValue, props.registry);
  Object.keys(form).forEach((key) => { if (!(key in next)) delete form[key]; });
  Object.assign(form, next);
  if (resetTouched) Object.keys(touched).forEach((key) => delete touched[key]);
}
watch(() => props.schema, () => applySource(true), { immediate: true, deep: true });
watch(() => props.modelValue, () => applySource(false), { immediate: true, deep: true });
watch(errors, (value) => emit('validation', value), { immediate: true });
function update(field: FormField, value: FormValue): void {
  form[field.name] = value; touched[field.name] = true;
  const next = { ...form }; emit('update:modelValue', next);
}
function blur(field: FormField): void { touched[field.name] = true; }
function controlProps(field: FormField): Record<string, unknown> {
  const definition = props.registry.get(field.type);
  if (!definition) return {};
  const eventName = definition.adapter.event.startsWith('update:')
    ? `onUpdate:${definition.adapter.event.slice('update:'.length)}`
    : `on${definition.adapter.event[0].toUpperCase()}${definition.adapter.event.slice(1).replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())}`;
  return { ...definition.adapter.props(field, form[field.name], { field, disabled: Boolean(props.disabled || field.disabled), invalid: Boolean(touched[field.name] && errors.value[field.name]), describedBy: errors.value[field.name] ? `error-${field.id}` : undefined }), [eventName]: (payload: unknown) => controlValue(field, payload), onBlur: () => blur(field) };
}
function controlValue(field: FormField, payload: unknown): void {
  const definition = props.registry.get(field.type);
  if (definition) update(field, definition.adapter.value(payload, field));
}
function validate(): boolean { return schemaErrors.value.length === 0 && Object.keys(errors.value).length === 0; }
defineExpose({ validate, errors });
</script>

<template>
  <div class="dynamic-form" :aria-invalid="schemaErrors.length > 0">
    <ul v-if="schemaErrors.length" class="designer-errors" role="alert"><li v-for="error in schemaErrors" :key="error">{{ error }}</li></ul>
    <div v-for="field in safeFields" :key="field.id" class="dynamic-form__field">
      <label :for="`dynamic-${field.id}`" class="dynamic-form__label">{{ field.label }}<span v-if="field.required" aria-hidden="true" class="dynamic-form__required">*</span></label>
      <component :is="registry.get(field.type)?.control" v-bind="controlProps(field)" />
      <p v-if="touched[field.name] && errors[field.name]" :id="`error-${field.id}`" class="dynamic-form__error" role="alert">{{ errors[field.name] }}</p>
    </div>
  </div>
</template>
