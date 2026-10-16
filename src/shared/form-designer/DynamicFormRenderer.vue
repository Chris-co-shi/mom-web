<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { MomInput, MomSelect } from '../ui';
import { initializeFormData, validateFieldValue, validateFormSchema } from './schema';
import type { FormData, FormField, FormSchema, FormValue } from './types';

const props = withDefaults(defineProps<{ schema: FormSchema; modelValue?: FormData; disabled?: boolean }>(), { modelValue: () => ({}) });
const emit = defineEmits<{ 'update:modelValue': [value: FormData]; validation: [errors: Record<string, string>] }>();
const form = reactive<FormData>({});
const touched = reactive<Record<string, boolean>>({});
const schemaErrors = computed(() => validateFormSchema(props.schema));
const errors = computed(() => Object.fromEntries(props.schema.fields.flatMap((field) => {
  const message = validateFieldValue(field, form[field.name] ?? '');
  return message ? [[field.name, message]] : [];
})));

function applySource(resetTouched: boolean): void {
  const next = initializeFormData(props.schema, props.modelValue);
  Object.keys(form).forEach((key) => { if (!(key in next)) delete form[key]; });
  Object.assign(form, next);
  if (resetTouched) Object.keys(touched).forEach((key) => delete touched[key]);
}
watch(() => props.schema, () => applySource(true), { immediate: true, deep: true });
watch(() => props.modelValue, () => applySource(false), { immediate: true, deep: true });
watch(errors, (value) => emit('validation', value), { immediate: true });

function update(field: FormField, value: FormValue): void {
  form[field.name] = value;
  touched[field.name] = true;
  emit('update:modelValue', { ...form });
}
function blur(field: FormField): void { touched[field.name] = true; }
function validate(): boolean { return schemaErrors.value.length === 0 && Object.keys(errors.value).length === 0; }
defineExpose({ validate, errors });
</script>

<template>
  <div class="dynamic-form" :aria-invalid="schemaErrors.length > 0">
    <ul v-if="schemaErrors.length" class="designer-errors" role="alert">
      <li v-for="error in schemaErrors" :key="error">{{ error }}</li>
    </ul>
    <div v-for="field in schema.fields" :key="field.id" class="dynamic-form__field">
      <label :for="`dynamic-${field.id}`" class="dynamic-form__label">
        {{ field.label }}<span v-if="field.required" aria-hidden="true" class="dynamic-form__required">*</span>
      </label>
      <MomInput v-if="field.type === 'TEXT'" :id="`dynamic-${field.id}`" :model-value="String(form[field.name] ?? '')"
        :maxlength="field.maxLength" :readonly="field.readonly" :disabled="disabled || field.disabled"
        :aria-invalid="Boolean(touched[field.name] && errors[field.name])" :aria-describedby="errors[field.name] ? `error-${field.id}` : undefined"
        @update:model-value="update(field, $event)" @blur="blur(field)" />
      <MomInput v-else-if="field.type === 'NUMBER'" :id="`dynamic-${field.id}`" type="number" :model-value="String(form[field.name] ?? '')"
        :disabled="disabled || field.disabled || field.readonly" :aria-invalid="Boolean(touched[field.name] && errors[field.name])"
        @update:model-value="update(field, $event === '' ? null : Number($event))" @blur="blur(field)" />
      <MomSelect v-else :id="`dynamic-${field.id}`" :model-value="String(form[field.name] ?? '')"
        :options="(field.options ?? []).map((option) => ({ label: option.label, value: option.value }))"
        :placeholder="`请选择${field.label}`" :disabled="disabled || field.disabled || field.readonly"
        :aria-invalid="Boolean(touched[field.name] && errors[field.name])" @update:model-value="update(field, $event)" />
      <p v-if="touched[field.name] && errors[field.name]" :id="`error-${field.id}`" class="dynamic-form__error" role="alert">{{ errors[field.name] }}</p>
    </div>
  </div>
</template>
