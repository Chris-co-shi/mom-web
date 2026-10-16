<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { MomButton } from '../ui';
import DynamicFormRenderer from './DynamicFormRenderer.vue';
import './form-designer.css';
import { localCodeSegmentCatalog } from './code-rule-catalog';
import { validateCodeRule } from './schema';
import type { CodeRuleDefinition, CodeRuleSegment, CodeSegmentCatalogEntry, CodeSegmentType, FormSchema } from './types';

const props = withDefaults(defineProps<{ modelValue?: CodeRuleDefinition; catalog?: readonly CodeSegmentCatalogEntry[] }>(), {
  modelValue: () => ({ schemaVersion: 1, segments: [] }), catalog: () => localCodeSegmentCatalog,
});
const emit = defineEmits<{ 'update:modelValue': [value: CodeRuleDefinition]; change: [value: CodeRuleDefinition] }>();
function cloneSegments(value: readonly CodeRuleSegment[] = []): CodeRuleSegment[] { return JSON.parse(JSON.stringify(value)) as CodeRuleSegment[]; }
const segments = ref<CodeRuleSegment[]>(cloneSegments(props.modelValue.segments));
let lastPublished = JSON.stringify(props.modelValue);
const draggableCatalog = ref<CodeSegmentCatalogEntry[]>([...props.catalog]);
const selectedId = ref<string | null>(segments.value[0]?.id ?? null);
const catalog = computed(() => props.catalog);
watch(() => props.catalog, (value) => { draggableCatalog.value = [...value]; }, { deep: true });
const selected = computed(() => segments.value.find((segment) => segment.id === selectedId.value));
const selectedCatalog = computed(() => catalog.value.find((item) => item.type === selected.value?.type));
const definition = computed<CodeRuleDefinition>(() => ({ schemaVersion: 1, segments: segments.value.map(({ id, type, params }) => ({ id, type, params: { ...params } })) }));
const errors = computed(() => validateCodeRule(definition.value, catalog.value));
const sample = computed(() => {
  const day = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = String(day.getFullYear()); const yy = year.slice(-2); const mm = pad(day.getMonth() + 1); const dd = pad(day.getDate());
  return segments.value.map((segment) => {
    if (segment.type === 'LITERAL') return String(segment.params.value ?? '');
    if (segment.type === 'DATE') return ({ YYYYMMDD: `${year}${mm}${dd}`, YYMMDD: `${yy}${mm}${dd}`, YYYYMM: `${year}${mm}`, YYMM: `${yy}${mm}` }[String(segment.params.format)] ?? '日期格式无效');
    if (segment.type === 'SEQUENCE') return String(1).padStart(Number(segment.params.width) || 1, '0');
    return `[${catalog.value.find((item) => item.type === segment.type)?.label ?? '未知片段'}]`;
  }).join('');
});

function publish(): void {
  const serialized = JSON.stringify(definition.value);
  if (serialized === lastPublished) return;
  lastPublished = serialized;
  emit('update:modelValue', definition.value); emit('change', definition.value);
}
watch(() => props.modelValue, (value) => {
  const serialized = JSON.stringify(value);
  if (serialized === lastPublished) return;
  lastPublished = serialized;
  segments.value = cloneSegments(value?.segments);
  if (!segments.value.some((segment) => segment.id === selectedId.value)) selectedId.value = segments.value[0]?.id ?? null;
}, { deep: true });
watch(segments, publish, { deep: true });
function cloneType(type: CodeSegmentType): CodeRuleSegment {
  const entry = catalog.value.find((item) => item.type === type);
  if (!entry) throw new Error(`未注册编码片段：${type}`);
  const errors = validateCodeRule({ schemaVersion: 1, segments: [{ id: 'probe', type, params: {} }] }, catalog.value);
  if (errors.some((error) => error.includes('Catalog 版本不兼容') || error.includes('参数 Schema 无效'))) throw new Error(errors.join('；'));
  const params = entry.parameterSchema.fields.reduce<Record<string, string | number | boolean | null>>((values, field) => {
    values[field.name] = field.defaultValue ?? (field.type === 'SWITCH' ? false : '');
    return values;
  }, {});
  return { id: `segment_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`, type, params };
}
function remove(id: string): void { segments.value = segments.value.filter((segment) => segment.id !== id); if (selectedId.value === id) selectedId.value = segments.value[0]?.id ?? null; }
function move(id: string, delta: number): void {
  const index = segments.value.findIndex((item) => item.id === id); const target = index + delta;
  if (target < 0 || target >= segments.value.length) return;
  const [segment] = segments.value.splice(index, 1); segments.value.splice(target, 0, segment);
}
function handleDrop(event: { newIndex?: number }): void {
  const index = event.newIndex ?? segments.value.length - 1;
  const segment = segments.value[index];
  if (segment) { segments.value.splice(index, 1, cloneType(segment.type)); selectedId.value = segments.value[index].id; }
}
function updateParams(value: Record<string, string | number | boolean | null>): void { if (selected.value) selected.value.params = { ...selected.value.params, ...value }; }
const parameterSchema = computed<FormSchema>(() => selectedCatalog.value?.parameterSchema ?? { schemaVersion: 1, fields: [] });
</script>

<template>
  <section class="code-rule-designer" aria-label="编码规则设计器">
    <aside class="form-designer__panel">
      <h2>编码片段</h2><p>拖入画布或用键盘操作</p>
      <VueDraggable v-model="draggableCatalog" :group="{ name: 'code-segments', pull: 'clone', put: false }" :sort="false" item-key="type" class="form-designer__palette">
        <button v-for="item in catalog" :key="item.type" type="button" class="form-designer__palette-item" :data-type="item.type" @click="segments.push(cloneType(item.type)); selectedId = segments.at(-1)?.id ?? null">
          <strong>{{ item.label }}</strong><span>{{ item.description }}</span><small>拖动或按 Enter 添加</small>
        </button>
      </VueDraggable>
    </aside>
    <div class="form-designer__center">
      <section class="form-designer__panel">
        <div class="form-designer__heading"><div><h2>编码组成</h2><p>仅使用后端已注册的片段算法</p></div><span>{{ segments.length }} 个片段</span></div>
        <VueDraggable v-model="segments" :group="{ name: 'code-segments', pull: false, put: true }" item-key="id" handle=".form-designer__drag" class="form-designer__canvas" @add="handleDrop">
          <article v-for="(segment, index) in segments" :key="segment.id" class="form-designer__field" :class="{ 'form-designer__field--selected': segment.id === selectedId }">
            <button type="button" class="form-designer__drag" :aria-label="`拖动排序 ${segment.type}`" @click="selectedId = segment.id">⠿</button>
            <button type="button" class="form-designer__field-select" :aria-pressed="segment.id === selectedId" @click="selectedId = segment.id">
              <span><strong>{{ catalog.find((item) => item.type === segment.type)?.label ?? '未知片段' }}</strong><small>{{ segment.type }}</small></span>
              <code>{{ segment.type === 'LITERAL' ? segment.params.value : segment.type === 'DATE' ? segment.params.format : segment.type === 'SEQUENCE' ? `样例流水 ${String(1).padStart(Number(segment.params.width) || 1, '0')}` : '安全占位预览' }}</code>
            </button>
            <div class="form-designer__field-actions"><MomButton mode="text" :aria-label="`上移片段 ${index + 1}`" :disabled="index === 0" @click="move(segment.id, -1)">↑</MomButton>
              <MomButton mode="text" :aria-label="`下移片段 ${index + 1}`" :disabled="index === segments.length - 1" @click="move(segment.id, 1)">↓</MomButton>
              <MomButton mode="text" :aria-label="`删除片段 ${index + 1}`" @click="remove(segment.id)">删除</MomButton></div>
          </article>
          <p v-if="!segments.length" class="form-designer__empty">拖入固定字符、日期和唯一流水号</p>
        </VueDraggable>
        <div class="code-rule-designer__sample"><span>编码样例</span><code>{{ sample || '等待添加片段' }}</code><small>流水号仅为样例，不会分配真实编号</small></div>
        <div v-if="errors.length" class="designer-errors" role="alert"><p v-for="error in errors" :key="error">{{ error }}</p></div>
      </section>
      <section class="form-designer__panel"><h2>CodeRuleDefinition JSON</h2><pre class="form-designer__code">{{ JSON.stringify(definition, null, 2) }}</pre></section>
    </div>
    <aside class="form-designer__panel form-designer__properties">
      <h2>片段参数</h2>
      <p v-if="!selected" class="form-designer__muted">选择编码片段以配置参数</p>
          <template v-else-if="!selectedCatalog"><p class="designer-errors" role="alert">未注册片段类型：{{ selected.type }}</p></template>
          <template v-else><p>{{ selectedCatalog.description }}</p><p v-if="selectedCatalog.catalogVersion !== 1" class="designer-errors" role="alert">Catalog 版本不兼容</p><DynamicFormRenderer v-else :schema="parameterSchema" :model-value="selected.params" @update:model-value="updateParams" /></template>
    </aside>
  </section>
</template>
