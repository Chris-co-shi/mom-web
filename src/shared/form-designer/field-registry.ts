import { MomInput, MomNumberInput, MomSelect, MomCheckbox } from '../ui';
import { computed, defineComponent, h } from 'vue';
import { MomButton } from '../ui';
import type { FieldControlAdapter, FieldRegistry, FieldRegistryEntry, FormField, FormFieldType, FormValue } from './types';

/** 所有动态字段都支持的通用属性。 */
const common = [
  { key: 'name', label: '字段名', editor: 'text' }, { key: 'label', label: '标题', editor: 'text' },
  { key: 'required', label: '必填', editor: 'checkbox' }, { key: 'readonly', label: '只读', editor: 'checkbox' },
  { key: 'disabled', label: '禁用', editor: 'checkbox' },
] as const;
const textOnly = [...common, { key: 'defaultValue', label: '默认值', editor: 'text' }, { key: 'minLength', label: '最小长度', editor: 'number' }, { key: 'maxLength', label: '最大长度', editor: 'number' }] as const;
const numberOnly = [...common, { key: 'defaultValue', label: '默认值', editor: 'number' }, { key: 'min', label: '最小值', editor: 'number' }, { key: 'max', label: '最大值', editor: 'number' }] as const;
const selectOnly = [...common, { key: 'defaultValue', label: '默认值', editor: 'text' }] as const;
const switchOnly = [...common, { key: 'defaultValue', label: '默认值', editor: 'checkbox' }] as const;

/** 将动态字段统一适配到受控组件的 modelValue 事件。 */
const modelAdapter = (event = 'update:modelValue'): FieldControlAdapter => ({
  event,
  props: (field, value, context) => ({ id: `dynamic-${field.id}`, modelValue: value, readonly: field.readonly, disabled: context.disabled, 'aria-invalid': context.invalid, 'aria-describedby': context.describedBy }),
  value: (payload, field) => normalizeFieldValue(defaultFieldRegistry, field.type, payload),
});

const selectPropertyEditor = defineComponent({
  name: 'SelectFieldPropertyEditor',
  props: { field: { type: Object, required: true } },
  setup(props, { emit }) {
    const field = computed(() => props.field as FormField);
    function patchOptions(options: NonNullable<FormField['options']>): void { emit('update:field', { ...field.value, options }); }
    return () => h('fieldset', { class: 'form-designer__property-editor' }, [
      h('legend', '下拉选项'),
      ...(field.value.options ?? []).map((option, index) => h('div', { class: 'form-designer__option', key: index }, [
        h(MomInput, { modelValue: option.label, 'aria-label': `选项 ${index + 1} 显示文本`, 'onUpdate:modelValue': (label: string) => patchOptions((field.value.options ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, label } : item)) }),
        h(MomInput, { modelValue: option.value, 'aria-label': `选项 ${index + 1} 值`, 'onUpdate:modelValue': (value: string) => patchOptions((field.value.options ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, value } : item)) }),
        h(MomButton, { mode: 'text', 'aria-label': `删除选项 ${index + 1}`, onClick: () => patchOptions((field.value.options ?? []).filter((_, itemIndex) => itemIndex !== index)) }, () => '×'),
      ])),
      h(MomButton, { variant: 'outline', onClick: () => patchOptions([...(field.value.options ?? []), { label: '新选项', value: `option${(field.value.options?.length ?? 0) + 1}` }]) }, () => '添加选项'),
    ]);
  },
});

/** 为字段定义补齐配置和值校验，保持设计器与运行时渲染共用同一规则。 */
function entry(definition: Omit<FieldRegistryEntry, 'validateConfig' | 'validateValue'>): FieldRegistryEntry {
  return {
    ...definition,
    validateConfig(field) {
      const errors: string[] = [];
      if (field.type === 'SELECT') {
        if (!Array.isArray(field.options) || !field.options.length) errors.push('下拉字段至少需要一个选项');
        else {
          const values = new Set<string>();
          field.options.forEach((option, index) => {
            if (!option || typeof option.label !== 'string' || !option.label.trim() || typeof option.value !== 'string') errors.push(`第 ${index + 1} 个下拉选项无效`);
            else if (values.has(option.value)) errors.push(`下拉选项值重复：${option.value}`);
            else values.add(option.value);
          });
        }
        if (field.defaultValue !== undefined && field.defaultValue !== '' && !field.options?.some((option) => option.value === String(field.defaultValue))) errors.push('下拉默认值必须匹配一个选项');
      }
      if (field.type !== 'SELECT' && Array.isArray(field.options) && field.options.length) errors.push('只有下拉字段可以配置选项');
      if (field.type === 'TEXT') {
        for (const key of ['minLength', 'maxLength'] as const) if (field[key] !== undefined && (!Number.isInteger(field[key]) || Number(field[key]) < 0)) errors.push('文本长度必须为非负整数');
        if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) errors.push('最小长度不能大于最大长度');
        if (field.defaultValue !== undefined && typeof field.defaultValue !== 'string') errors.push('文本默认值必须是字符串');
      }
      if (field.type === 'NUMBER') {
        for (const key of ['min', 'max'] as const) if (field[key] !== undefined && !Number.isFinite(field[key])) errors.push('数值范围必须是有限数字');
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) errors.push('最小值不能大于最大值');
        if (field.defaultValue !== undefined && (typeof field.defaultValue !== 'number' || !Number.isFinite(field.defaultValue))) errors.push('数字默认值必须是有限数字');
      }
      if (field.type === 'SWITCH' && field.defaultValue !== undefined && typeof field.defaultValue !== 'boolean') errors.push('开关默认值必须是布尔值');
      if (field.type === 'SELECT' && field.defaultValue !== undefined && typeof field.defaultValue !== 'string') errors.push('下拉默认值必须是字符串');
      if (field.type !== 'TEXT' && field.type !== 'SELECT' && (field.minLength !== undefined || field.maxLength !== undefined)) errors.push('该类型不支持长度校验');
      if (field.type !== 'NUMBER' && (field.min !== undefined || field.max !== undefined)) errors.push('该类型不支持数值范围');
      return errors;
    },
    validateValue(field, value) {
      const empty = value === null || value === undefined || value === '';
      if (field.required && empty) return `${field.label}为必填项`;
      if (empty) return undefined;
      if (field.type === 'TEXT') {
        if (typeof value !== 'string') return `${field.label}必须是文本`;
        if (field.minLength !== undefined && value.length < field.minLength) return `${field.label}至少需要 ${field.minLength} 个字符`;
        if (field.maxLength !== undefined && value.length > field.maxLength) return `${field.label}不能超过 ${field.maxLength} 个字符`;
      }
      if (field.type === 'NUMBER') {
        if (typeof value !== 'number' || !Number.isFinite(value)) return `${field.label}必须是有效数字`;
        if (field.min !== undefined && value < field.min) return `${field.label}不能小于 ${field.min}`;
        if (field.max !== undefined && value > field.max) return `${field.label}不能大于 ${field.max}`;
      }
      if (field.type === 'SELECT' && !field.options?.some((option) => option.value === String(value))) return `${field.label}不是有效选项`;
      if (field.type === 'SWITCH' && typeof value !== 'boolean') return `${field.label}必须是布尔值`;
      return undefined;
    },
  };
}

/** 建立字段类型到字段能力定义的唯一注册表，并拒绝重复类型。 */
export function createFieldRegistry(entries: readonly FieldRegistryEntry[]): FieldRegistry {
  const registry = new Map<FormFieldType, FieldRegistryEntry>();
  for (const definition of entries) {
    if (!definition.type.trim() || registry.has(definition.type)) throw new Error(`FieldRegistry 类型重复或无效：${definition.type}`);
    registry.set(definition.type, definition);
  }
  return registry;
}

export const defaultFieldRegistry = createFieldRegistry([
  entry({ type: 'TEXT', label: '文本', description: '单行文本字段', preview: '请输入', control: MomInput, adapter: { ...modelAdapter(), props: (field, value, context) => ({ ...modelAdapter().props(field, value, context), placeholder: '请输入' }) }, valueKind: 'text', properties: textOnly, create: (id, name) => ({ id, name, type: 'TEXT', label: '文本字段', required: false, defaultValue: '' }), normalize: (value) => value == null ? '' : String(value) }),
  entry({ type: 'NUMBER', label: '数字', description: '数值字段', preview: '123', control: MomNumberInput, adapter: { ...modelAdapter(), props: (field, value, context) => ({ ...modelAdapter().props(field, value, context), min: field.min, max: field.max }) }, valueKind: 'number', properties: numberOnly, create: (id, name) => ({ id, name, type: 'NUMBER', label: '数字字段', required: false, defaultValue: 0 }), normalize: (value) => value == null || value === '' ? null : Number(value) }),
  entry({ type: 'SELECT', label: '下拉', description: '枚举选项字段', preview: '下拉选择', control: MomSelect, adapter: { ...modelAdapter(), props: (field, value, context) => ({ ...modelAdapter().props(field, value, context), options: field.options ?? [], placeholder: `请选择${field.label}` }) }, valueKind: 'select', properties: selectOnly, propertyEditor: selectPropertyEditor, create: (id, name) => ({ id, name, type: 'SELECT', label: '下拉字段', required: false, defaultValue: '', options: [{ label: '选项一', value: 'option1' }, { label: '选项二', value: 'option2' }] }), normalize: (value) => value == null ? '' : String(value) }),
  entry({ type: 'SWITCH', label: '开关', description: '布尔开关字段', preview: '开 / 关', control: MomCheckbox, adapter: { ...modelAdapter(), props: (field, value, context) => ({ ...modelAdapter().props(field, value, context), 'aria-label': field.label }) }, valueKind: 'boolean', properties: switchOnly, create: (id, name) => ({ id, name, type: 'SWITCH', label: '开关字段', required: false, defaultValue: false }), normalize: (value) => value === true }),
]);

/** 按注册类型创建带稳定 ID 的字段定义。 */
export function createField(registry: FieldRegistry, type: FormFieldType, id: string, name: string): FormField {
  const definition = registry.get(type);
  if (!definition) throw new Error(`未注册字段类型：${type}`);
  return definition.create(id, name);
}
/** 按字段类型把组件事件值规范化为表单模型值。 */
export function normalizeFieldValue(registry: FieldRegistry, type: FormFieldType, value: unknown): FormValue {
  const definition = registry.get(type);
  if (!definition) throw new Error(`未注册字段类型：${type}`);
  return definition.normalize ? definition.normalize(value) : (value as FormValue);
}
