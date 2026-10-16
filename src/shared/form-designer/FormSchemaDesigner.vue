<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { MomButton, MomCheckbox, MomInput, MomNumberInput, MomTextarea } from '../ui';
import DynamicFormRenderer from './DynamicFormRenderer.vue';
import './form-designer.css';
import { createField, defaultFieldRegistry } from './field-registry';
import { validateFormSchema } from './schema';
import type { FieldRegistry, FormField, FormFieldType, FormSchema } from './types';

const props = withDefaults(defineProps<{ modelValue?: FormSchema; registry?: FieldRegistry }>(), { modelValue: () => ({ schemaVersion: 1, fields: [] }), registry: () => defaultFieldRegistry });
const emit = defineEmits<{ 'update:modelValue': [value: FormSchema]; change: [value: FormSchema] }>();
function cloneField(field: FormField): FormField { return { ...field, options: field.options?.map((option) => ({ ...option })) }; }
function cloneFields(value: readonly FormField[] = []): FormField[] { return value.map(cloneField); }
const fields = ref<FormField[]>(cloneFields(props.modelValue.fields));
let lastPublished = JSON.stringify(props.modelValue);
let nextNameId = 1;
const selectedId = ref<string | null>(fields.value[0]?.id ?? null); const importText = ref(''); const importError = ref('');
const previewData = ref<Record<string, string | number | boolean | null>>({});
const types = computed(() => [...props.registry.values()]); const draggableTypes = ref([...types.value]);
watch(types, (value) => { draggableTypes.value = [...value]; }, { deep: true });
const selected = computed(() => fields.value.find((field) => field.id === selectedId.value));
const selectedDefinition = computed(() => selected.value ? props.registry.get(selected.value.type) : undefined);
const schema = computed<FormSchema>(() => ({ schemaVersion: 1, fields: fields.value.map(cloneField) }));
const errors = computed(() => validateFormSchema(schema.value, props.registry));
const previewSchema = computed(() => errors.value.length ? { schemaVersion: 1 as const, fields: [] } : schema.value);
function publish(): void { const serialized = JSON.stringify(schema.value); if (serialized === lastPublished) return; lastPublished = serialized; emit('update:modelValue', schema.value); emit('change', schema.value); }
watch(() => props.modelValue, (next) => { const serialized = JSON.stringify(next); if (serialized === lastPublished) return; lastPublished = serialized; fields.value = cloneFields(next?.fields); if (!fields.value.some((field) => field.id === selectedId.value)) selectedId.value = fields.value[0]?.id ?? null; }, { deep: true });
watch(fields, publish, { deep: true });
function uniqueName(type: FormFieldType): string {
  const base = type.replace(/[^A-Za-z0-9_]/g, '').toLowerCase() || 'field'; let name = '';
  do { name = `${base}${nextNameId++}`; } while (fields.value.some((field) => field.name === name));
  return name;
}
function createRegisteredField(type: FormFieldType): FormField { return createField(props.registry, type, `field_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`, uniqueName(type)); }
function addByKeyboard(type: FormFieldType): void { const field = createRegisteredField(type); fields.value.push(field); selectedId.value = field.id; }
function handleDrop(event: { newIndex?: number }): void { const index = event.newIndex ?? fields.value.length - 1; const field = fields.value[index]; if (field) { fields.value.splice(index, 1, createRegisteredField(field.type)); selectedId.value = fields.value[index].id; } }
function removeField(id: string): void { fields.value = fields.value.filter((field) => field.id !== id); if (selectedId.value === id) selectedId.value = fields.value[0]?.id ?? null; }
function moveField(id: string, delta: number): void { const index = fields.value.findIndex((field) => field.id === id); const target = index + delta; if (target < 0 || target >= fields.value.length) return; const [field] = fields.value.splice(index, 1); fields.value.splice(target, 0, field); }
type FormFieldPropertyKey = import('./types').FieldProperty;
type PropertyValue = string | number | boolean | null | undefined;
function updateProperty(field: FormField, key: FormFieldPropertyKey, value: PropertyValue): void {
  switch (key) {
    case 'name': case 'label': field[key] = String(value ?? ''); break;
    case 'required': case 'readonly': case 'disabled': field[key] = Boolean(value); break;
    case 'defaultValue': field[key] = value as FormField['defaultValue']; break;
    case 'minLength': case 'maxLength': case 'min': case 'max': field[key] = value == null || value === '' ? undefined : Number(value); break;
  }
}
function propertyValue(field: FormField, key: FormFieldPropertyKey): PropertyValue { return field[key]; }
function importSchema(): void { importError.value = ''; try { const parsed = JSON.parse(importText.value) as FormSchema; const found = validateFormSchema(parsed, props.registry); if (found.length) { importError.value = found.join('；'); return; } fields.value = cloneFields(parsed.fields); selectedId.value = fields.value[0]?.id ?? null; previewData.value = {}; } catch { importError.value = 'JSON 格式无效'; } }
async function copySchema(): Promise<void> { await navigator.clipboard?.writeText(JSON.stringify(schema.value, null, 2)); }
</script>

<template>
  <section class="form-designer" aria-label="表单设计器">
    <aside class="form-designer__panel form-designer__library"><h2>组件库</h2><p>拖到画布添加；也可键盘选择后添加。</p>
      <VueDraggable v-model="draggableTypes" :group="{ name: 'form-fields', pull: 'clone', put: false }" :sort="false" item-key="type" class="form-designer__palette">
        <button v-for="item in draggableTypes" :key="item.type" type="button" class="form-designer__palette-item" :data-type="item.type" @click="addByKeyboard(item.type)"><strong>{{ item.label }}</strong><span>{{ item.description }}</span><small>拖动或按 Enter 添加</small></button>
      </VueDraggable>
    </aside>
    <div class="form-designer__center">
      <section class="form-designer__panel form-designer__canvas-panel">
        <div class="form-designer__heading"><div><h2>表单画布</h2><p>字段顺序即 Schema 顺序</p></div><span>{{ fields.length }} 个字段</span></div>
        <VueDraggable v-model="fields" :group="{ name: 'form-fields', pull: false, put: true }" item-key="id" handle=".form-designer__drag" class="form-designer__canvas" ghost-class="form-designer__ghost" @add="handleDrop">
          <article v-for="(field, index) in fields" :key="field.id" class="form-designer__field" :class="{ 'form-designer__field--selected': field.id === selectedId }">
            <button type="button" class="form-designer__drag" :aria-label="`拖动排序 ${field.label}`" @click="selectedId = field.id">⠿</button>
            <button type="button" class="form-designer__field-select" :aria-pressed="field.id === selectedId" @click="selectedId = field.id"><span><strong>{{ field.label || '未命名字段' }}</strong><small>{{ field.name }} · {{ field.type }}</small></span><span class="form-designer__field-preview">{{ props.registry.get(field.type)?.preview ?? '未知类型' }}</span></button>
            <div class="form-designer__field-actions"><MomButton mode="text" :aria-label="`上移 ${field.label}`" :disabled="index === 0" @click="moveField(field.id, -1)">↑</MomButton><MomButton mode="text" :aria-label="`下移 ${field.label}`" :disabled="index === fields.length - 1" @click="moveField(field.id, 1)">↓</MomButton><MomButton mode="text" :aria-label="`删除 ${field.label}`" @click="removeField(field.id)">删除</MomButton></div>
          </article>
          <p v-if="fields.length === 0" class="form-designer__empty">将左侧控件拖到这里，或通过键盘添加</p>
        </VueDraggable>
        <div v-if="errors.length" class="designer-errors" role="alert"><p v-for="error in errors" :key="error">{{ error }}</p></div>
      </section>
      <section class="form-designer__panel"><div class="form-designer__heading"><div><h2>实时预览</h2><p>预览数据与 Schema 分离</p></div></div><DynamicFormRenderer :schema="previewSchema" v-model="previewData" :registry="props.registry" /></section>
      <section class="form-designer__panel"><div class="form-designer__heading"><div><h2>FormSchema JSON</h2><p>导出或粘贴已有 Schema 导入</p></div><MomButton variant="outline" @click="copySchema">复制 JSON</MomButton></div>
        <MomTextarea :model-value="JSON.stringify(schema, null, 2)" readonly class="form-designer__json" aria-label="FormSchema JSON" /><MomTextarea v-model="importText" class="form-designer__json" aria-label="导入 FormSchema JSON" placeholder="粘贴 FormSchema JSON" /><MomButton variant="outline" @click="importSchema">导入 Schema</MomButton><p v-if="importError" class="dynamic-form__error" role="alert">{{ importError }}</p>
      </section>
    </div>
    <aside class="form-designer__panel form-designer__properties"><h2>字段属性</h2><p v-if="!selected" class="form-designer__muted">选择画布字段以编辑属性</p>
      <template v-else><label v-for="property in selectedDefinition?.properties" :key="property.key" :class="{ 'form-designer__check': property.editor === 'checkbox' }">{{ property.editor === 'checkbox' ? '' : property.label }}
        <MomInput v-if="property.editor === 'text'" :model-value="String(propertyValue(selected!, property.key) ?? '')" :aria-label="property.label" @update:model-value="updateProperty(selected!, property.key, $event)" />
        <MomNumberInput v-else-if="property.editor === 'number'" :model-value="Number(propertyValue(selected!, property.key) ?? 0)" :aria-label="property.label" @update:model-value="updateProperty(selected!, property.key, $event)" />
        <MomCheckbox v-else :model-value="Boolean(propertyValue(selected!, property.key))" :aria-label="property.label" @update:model-value="updateProperty(selected!, property.key, $event)" />{{ property.editor === 'checkbox' ? property.label : '' }}
      </label>
        <component v-if="selectedDefinition?.propertyEditor" :is="selectedDefinition.propertyEditor" :field="selected" @update:field="fields[fields.findIndex((field) => field.id === selected!.id)] = $event" />
      </template>
    </aside>
  </section>
</template>
