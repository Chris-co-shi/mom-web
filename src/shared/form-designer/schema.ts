import type { CodeRuleDefinition, CodeRuleSegment, FormField, FormSchema, FormValue } from './types';

export function validateFormSchema(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['FormSchema 必须是对象'];
  const schema = value as Partial<FormSchema>;
  if (schema.schemaVersion !== 1) return ['schemaVersion 必须为 1'];
  if (!Array.isArray(schema.fields)) return ['fields 必须是数组'];
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  schema.fields.forEach((candidate, index) => {
    const field = candidate as FormField;
    const prefix = `第 ${index + 1} 个字段`;
    if (!field || typeof field !== 'object') { errors.push(`${prefix}必须是对象`); return; }
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field.id)) errors.push(`${prefix}标识无效（仅允许字母开头的字母、数字和下划线）`);
    if (ids.has(field.id)) errors.push(`${prefix}标识重复：${field.id}`); ids.add(field.id);
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field.name)) errors.push(`${prefix}字段名无效`);
    if (names.has(field.name)) errors.push(`${prefix}字段名重复：${field.name}`); names.add(field.name);
    if (!['TEXT', 'NUMBER', 'SELECT'].includes(field.type)) errors.push(`${prefix}类型无效`);
    if (typeof field.label !== 'string' || !field.label.trim()) errors.push(`${prefix}标题不能为空`);
    if (field.minLength !== undefined && (!Number.isInteger(field.minLength) || field.minLength < 0)) errors.push(`${prefix}最小长度必须是非负整数`);
    if (field.maxLength !== undefined && (!Number.isInteger(field.maxLength) || field.maxLength < 0)) errors.push(`${prefix}最大长度必须是非负整数`);
    if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) errors.push(`${prefix}最小长度不能大于最大长度`);
    if (field.min !== undefined && !Number.isFinite(field.min)) errors.push(`${prefix}最小值必须是有限数值`);
    if (field.max !== undefined && !Number.isFinite(field.max)) errors.push(`${prefix}最大值必须是有限数值`);
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) errors.push(`${prefix}最小值不能大于最大值`);
    if (field.type !== 'TEXT' && (field.minLength !== undefined || field.maxLength !== undefined)) errors.push(`${prefix}只有文本字段可以配置长度校验`);
    if (field.type !== 'NUMBER' && (field.min !== undefined || field.max !== undefined)) errors.push(`${prefix}只有数字字段可以配置数值范围`);
    if (field.type === 'SELECT') {
      if (!Array.isArray(field.options) || field.options.length === 0) errors.push(`${prefix}下拉字段至少需要一个选项`);
      else {
        const optionValues = new Set<string>();
        field.options.forEach((option, optionIndex) => {
          if (!option || typeof option.label !== 'string' || !option.label.trim() || typeof option.value !== 'string' || !option.value.trim()) errors.push(`${prefix}第 ${optionIndex + 1} 个下拉选项无效`);
          else if (optionValues.has(option.value)) errors.push(`${prefix}下拉选项值重复：${option.value}`);
          else optionValues.add(option.value);
        });
      }
    }
    if (field.type !== 'SELECT' && Array.isArray(field.options) && field.options.length) errors.push(`${prefix}只有下拉字段可以配置选项`);
    if (field.defaultValue !== undefined && field.type === 'TEXT' && typeof field.defaultValue !== 'string') errors.push(`${prefix}文本默认值必须是字符串`);
    if (field.defaultValue !== undefined && field.type === 'NUMBER' && (typeof field.defaultValue !== 'number' || !Number.isFinite(field.defaultValue))) errors.push(`${prefix}数字默认值必须是有限数字`);
    if (field.defaultValue !== undefined && field.type === 'SELECT' && (!Array.isArray(field.options) || !field.options.some((option) => option.value === String(field.defaultValue)))) errors.push(`${prefix}下拉默认值必须匹配一个选项`);
  });
  return errors;
}

export function validateFieldValue(field: FormField, value: FormValue): string | undefined {
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
  if (field.type === 'SELECT' && (!Array.isArray(field.options) || !field.options.some((option) => option.value === String(value)))) return `${field.label}不是有效选项`;
  return undefined;
}

export function validateCodeRule(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['CodeRuleDefinition 必须是对象'];
  const definition = value as Partial<CodeRuleDefinition>;
  if (definition.schemaVersion !== 1) return ['schemaVersion 必须为 1'];
  if (!Array.isArray(definition.segments) || definition.segments.length === 0) return ['至少需要一个编码片段'];
  const errors: string[] = [];
  const ids = new Set<string>();
  let sequences = 0;
  definition.segments.forEach((segment: CodeRuleSegment, index) => {
    if (!segment || !['LITERAL', 'DATE', 'SEQUENCE'].includes(segment.type)) { errors.push(`第 ${index + 1} 个编码片段类型无效`); return; }
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(segment.id)) errors.push(`第 ${index + 1} 个编码片段标识无效`);
    if (ids.has(segment.id)) errors.push(`编码片段标识重复：${segment.id}`); ids.add(segment.id);
    if (segment.type === 'SEQUENCE') {
      sequences += 1;
      if (segment.params?.step !== 1) errors.push('流水号步长必须固定为 1');
      if (!Number.isInteger(segment.params?.width) || Number(segment.params.width) < 1 || Number(segment.params.width) > 18) errors.push('流水号位数必须为 1 到 18 的整数');
    }
    if (segment.type === 'LITERAL' && (typeof segment.params?.value !== 'string' || segment.params.value.length === 0)) errors.push('固定字符不能为空');
    if (segment.type === 'DATE' && !['YYYYMMDD', 'YYMMDD', 'YYYYMM', 'YYMM'].includes(String(segment.params?.format))) errors.push('日期格式无效');
  });
  if (sequences !== 1) errors.push('编码规则必须且只能包含一个流水号片段');
  return errors;
}

export function initializeFormData(schema: FormSchema, input: Record<string, unknown> = {}): Record<string, FormValue> {
  return Object.fromEntries(schema.fields.map((field) => {
    const current = input[field.name];
    const value = current !== undefined ? current : field.defaultValue;
    return [field.name, normalizeValue(field, value)];
  }));
}

function normalizeValue(field: FormField, value: unknown): FormValue {
  if (value === undefined || value === null || value === '') return value === null ? null : '';
  if (field.type === 'NUMBER') return typeof value === 'number' ? value : Number(value);
  return String(value);
}
