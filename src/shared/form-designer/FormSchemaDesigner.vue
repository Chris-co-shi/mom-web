<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { MomButton, MomCheckbox, MomInput, MomNumberInput, MomTextarea } from '../ui';
import DynamicFormRenderer from './DynamicFormRenderer.vue';
import { validateFormSchema } from './schema';
import type { FormField, FormFieldType, FormSchema } from './types';

const props = withDefaults(defineProps<{ modelValue?: FormSchema }>(), { modelValue: () => ({ schemaVersion: 1, fields: [] }) });
const emit = defineEmits<{ 'update:modelValue': [value: FormSchema]; change: [value: FormSchema] }>();
function cloneField(field: FormField): FormField { return { ...field, options: field.options?.map((option) => ({ ...option })) }; }
function cloneFields(value: readonly FormField[] = []): FormField[] { return value.map(cloneField); }
const fields = ref<FormField[]>(cloneFields(props.modelValue.fields));
let lastPublished = JSON.stringify(props.modelValue);
const selectedId = ref<string | null>(fields.value[0]?.id ?? null);
const importText = ref('');
const importError = ref('');
const previewData = ref<Record<string, string | number | null>>({});
const types: { type: FormFieldType; label: string; description: string }[] = [
  { type: 'TEXT', label: '文本', description: '单行文本字段' },
  { type: 'NUMBER', label: '数字', description: '数值字段' },
  { type: 'SELECT', label: '下拉', description: '枚举选项字段' },
];
const draggableTypes = ref([...types]);
const selected = computed(() => fields.value.find((field) => field.id === selectedId.value));
const schema = computed<FormSchema>(() => ({ schemaVersion: 1, fields: fields.value.map(cloneField) }));
const errors = computed(() => validateFormSchema(schema.value));
const previewSchema = computed(() => errors.value.length ? { schemaVersion: 1 as const, fields: [] } : schema.value);

function publish(): void {
  const serialized = JSON.stringify(schema.value);
  if (serialized === lastPublished) return;
  lastPublished = serialized;
  emit('update:modelValue', schema.value); emit('change', schema.value);
}
watch(() => props.modelValue, (next) => {
  const serialized = JSON.stringify(next);
  if (serialized === lastPublished) return;
  lastPublished = serialized;
  fields.value = cloneFields(next?.fields);
  if (!fields.value.some((field) => field.id === selectedId.value)) selectedId.value = fields.value[0]?.id ?? null;
}, { deep: true });
watch(fields, publish, { deep: true });

function createField(type: FormFieldType): FormField {
  const id = `field_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
  const count = fields.value.filter((field) => field.type === type).length + 1;
  return { id, name: `${type.toLowerCase()}${count}`, type, label: `${types.find((item) => item.type === type)?.label}字段`, required: false,
    ...(type === 'TEXT' ? { defaultValue: '' } : {}), ...(type === 'NUMBER' ? { defaultValue: 0 } : {}),
    ...(type === 'SELECT' ? { defaultValue: '', options: [{ label: '选项一', value: 'option1' }, { label: '选项二', value: 'option2' }] } : {}) };
}
function addByKeyboard(type: FormFieldType): void { const field = createField(type); fields.value.push(field); selectedId.value = field.id; }
function handleDrop(event: { newIndex?: number }): void {
  const index = event.newIndex ?? fields.value.length - 1;
  const field = fields.value[index];
  if (field) { fields.value.splice(index, 1, createField(field.type)); selectedId.value = fields.value[index].id; }
}
function removeField(id: string): void { fields.value = fields.value.filter((field) => field.id !== id); if (selectedId.value === id) selectedId.value = fields.value[0]?.id ?? null; }
function moveField(id: string, delta: number): void {
  const index = fields.value.findIndex((field) => field.id === id); const target = index + delta;
  if (target < 0 || target >= fields.value.length) return;
  const [field] = fields.value.splice(index, 1); fields.value.splice(target, 0, field);
}
function importSchema(): void {
  importError.value = '';
  try {
    const parsed = JSON.parse(importText.value) as FormSchema;
    const found = validateFormSchema(parsed);
    if (found.length) { importError.value = found.join('；'); return; }
    fields.value = cloneFields(parsed.fields); selectedId.value = fields.value[0]?.id ?? null; previewData.value = {};
  } catch { importError.value = 'JSON 格式无效'; }
}
async function copySchema(): Promise<void> { await navigator.clipboard?.writeText(JSON.stringify(schema.value, null, 2)); }
</script>

<template>
  <section class="form-designer" aria-label="表单设计器">
    <aside class="form-designer__panel form-designer__library">
      <h2>组件库</h2><p>拖到画布添加；也可键盘选择后添加。</p>
      <VueDraggable v-model="draggableTypes" :group="{ name: 'form-fields', pull: 'clone', put: false }" :sort="false" item-key="type" class="form-designer__palette">
        <button v-for="item in draggableTypes" :key="item.type" type="button" class="form-designer__palette-item" :data-type="item.type" @click="addByKeyboard(item.type)">
          <strong>{{ item.label }}</strong><span>{{ item.description }}</span><small>拖动或按 Enter 添加</small>
        </button>
      </VueDraggable>
    </aside>
    <div class="form-designer__center">
      <section class="form-designer__panel form-designer__canvas-panel">
        <div class="form-designer__heading"><div><h2>表单画布</h2><p>字段顺序即 Schema 顺序</p></div><span>{{ fields.length }} 个字段</span></div>
        <VueDraggable v-model="fields" :group="{ name: 'form-fields', pull: false, put: true }" item-key="id" handle=".form-designer__drag" class="form-designer__canvas" ghost-class="form-designer__ghost" @add="handleDrop">
          <article v-for="(field, index) in fields" :key="field.id" class="form-designer__field" :class="{ 'form-designer__field--selected': field.id === selectedId }">
            <button type="button" class="form-designer__drag" :aria-label="`拖动排序 ${field.label}`" @click="selectedId = field.id">⠿</button>
            <button type="button" class="form-designer__field-select" :aria-pressed="field.id === selectedId" @click="selectedId = field.id">
              <span><strong>{{ field.label || '未命名字段' }}</strong><small>{{ field.name }} · {{ field.type }}</small></span>
              <span class="form-designer__field-preview">{{ field.type === 'SELECT' ? '下拉选择' : field.type === 'NUMBER' ? '123' : '请输入' }}</span>
            </button>
            <div class="form-designer__field-actions">
              <MomButton mode="text" :aria-label="`上移 ${field.label}`" :disabled="index === 0" @click="moveField(field.id, -1)">↑</MomButton>
              <MomButton mode="text" :aria-label="`下移 ${field.label}`" :disabled="index === fields.length - 1" @click="moveField(field.id, 1)">↓</MomButton>
              <MomButton mode="text" :aria-label="`删除 ${field.label}`" @click="removeField(field.id)">删除</MomButton>
            </div>
          </article>
          <p v-if="fields.length === 0" class="form-designer__empty">将左侧控件拖到这里，或通过键盘添加</p>
        </VueDraggable>
        <div v-if="errors.length" class="designer-errors" role="alert"><p v-for="error in errors" :key="error">{{ error }}</p></div>
      </section>
      <section class="form-designer__panel">
        <div class="form-designer__heading"><div><h2>实时预览</h2><p>预览数据与 Schema 分离</p></div></div>
        <DynamicFormRenderer :schema="previewSchema" v-model="previewData" />
      </section>
      <section class="form-designer__panel">
        <div class="form-designer__heading"><div><h2>FormSchema JSON</h2><p>导出或粘贴已有 Schema 导入</p></div><MomButton variant="outline" @click="copySchema">复制 JSON</MomButton></div>
        <MomTextarea :model-value="JSON.stringify(schema, null, 2)" readonly class="form-designer__json" aria-label="FormSchema JSON" />
        <MomTextarea v-model="importText" class="form-designer__json" aria-label="导入 FormSchema JSON" placeholder="粘贴 FormSchema JSON" />
        <MomButton variant="outline" @click="importSchema">导入 Schema</MomButton>
        <p v-if="importError" class="dynamic-form__error" role="alert">{{ importError }}</p>
      </section>
    </div>
    <aside class="form-designer__panel form-designer__properties">
      <h2>字段属性</h2>
      <p v-if="!selected" class="form-designer__muted">选择画布字段以编辑属性</p>
      <template v-else>
        <label>字段名<MomInput v-model="selected.name" autocomplete="off" /></label>
        <label>标题<MomInput v-model="selected.label" /></label>
        <label class="form-designer__check"><MomCheckbox v-model="selected.required" />必填</label>
        <label class="form-designer__check"><MomCheckbox v-model="selected.readonly" />只读</label>
        <label class="form-designer__check"><MomCheckbox v-model="selected.disabled" />禁用</label>
        <label>默认值
          <MomNumberInput v-if="selected.type === 'NUMBER'" :model-value="Number(selected.defaultValue ?? 0)" @update:model-value="selected.defaultValue = $event" />
          <MomInput v-else :model-value="String(selected.defaultValue ?? '')" @update:model-value="selected.defaultValue = $event" />
        </label>
        <template v-if="selected.type === 'TEXT'">
          <label>最小长度<MomNumberInput :model-value="selected.minLength ?? 0" :min="0" @update:model-value="selected.minLength = $event" /></label>
          <label>最大长度<MomNumberInput :model-value="selected.maxLength ?? 0" :min="0" @update:model-value="selected.maxLength = $event" /></label>
        </template>
        <template v-if="selected.type === 'NUMBER'">
          <label>最小值<MomNumberInput :model-value="selected.min ?? 0" @update:model-value="selected.min = $event" /></label>
          <label>最大值<MomNumberInput :model-value="selected.max ?? 0" @update:model-value="selected.max = $event" /></label>
        </template>
        <fieldset v-if="selected.type === 'SELECT'"><legend>下拉选项</legend>
          <div v-for="(option, index) in selected.options" :key="index" class="form-designer__option">
            <MomInput v-model="option.label" :aria-label="`选项 ${index + 1} 显示文本`" />
            <MomInput v-model="option.value" :aria-label="`选项 ${index + 1} 值`" />
            <MomButton mode="text" :aria-label="`删除选项 ${index + 1}`" @click="selected.options?.splice(index, 1)">×</MomButton>
          </div>
          <MomButton variant="outline" @click="selected.options?.push({ label: '新选项', value: `option${(selected.options?.length ?? 0) + 1}` })">添加选项</MomButton>
        </fieldset>
      </template>
    </aside>
  </section>
</template>
