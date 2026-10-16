import { defaultFieldRegistry, normalizeFieldValue } from './field-registry';
import type { CodeRuleDefinition, CodeRuleSegment, FieldRegistry, FormField, FormSchema, FormValue } from './types';

export function validateFormSchema(value: unknown, registry: FieldRegistry = defaultFieldRegistry): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['FormSchema 必须是对象'];
  const schema = value as Partial<FormSchema>;
  if (schema.schemaVersion !== 1) return ['schemaVersion 必须为 1'];
  if (!Array.isArray(schema.fields)) return ['fields 必须是数组'];
  const errors: string[] = []; const ids = new Set<string>(); const names = new Set<string>();
  schema.fields.forEach((candidate, index) => {
    const prefix = `第 ${index + 1} 个字段`;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) { errors.push(`${prefix}必须是对象`); return; }
    const field = candidate as FormField;
    if (typeof field.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field.id)) errors.push(`${prefix}标识无效（仅允许字母开头的字母、数字和下划线）`);
    if (ids.has(field.id)) errors.push(`${prefix}标识重复：${field.id}`); ids.add(field.id);
    if (typeof field.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field.name)) errors.push(`${prefix}字段名无效`);
    if (names.has(field.name)) errors.push(`${prefix}字段名重复：${field.name}`); names.add(field.name);
    if (typeof field.type !== 'string' || !registry.has(field.type)) errors.push(`${prefix}类型未注册：${String(field.type)}`);
    if (typeof field.label !== 'string' || !field.label.trim()) errors.push(`${prefix}标题不能为空`);
    if (field.required !== undefined && typeof field.required !== 'boolean') errors.push(`${prefix}必填配置无效`);
    if (field.readonly !== undefined && typeof field.readonly !== 'boolean') errors.push(`${prefix}只读配置无效`);
    if (field.disabled !== undefined && typeof field.disabled !== 'boolean') errors.push(`${prefix}禁用配置无效`);
    const definition = registry.get(field.type);
    if (definition) errors.push(...(definition.validateConfig?.(field) ?? []).map((error) => `${prefix}${error}`));
  });
  return errors;
}

export function validateFieldValue(field: FormField, value: FormValue, registry: FieldRegistry = defaultFieldRegistry): string | undefined {
  const definition = registry.get(field.type);
  return definition ? definition.validateValue?.(field, value) : `字段类型未注册：${field.type}`;
}

export function validateCodeRule(value: unknown, catalog: readonly import('./types').CodeSegmentCatalogEntry[] = []): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['CodeRuleDefinition 必须是对象'];
  const definition = value as Partial<CodeRuleDefinition>;
  if (definition.schemaVersion !== 1) return ['schemaVersion 必须为 1'];
  if (!Array.isArray(definition.segments) || definition.segments.length === 0) return ['至少需要一个编码片段'];
  const errors: string[] = []; const ids = new Set<string>();
  definition.segments.forEach((segment: CodeRuleSegment, index) => {
    if (!segment || typeof segment !== 'object' || typeof segment.type !== 'string') { errors.push(`第 ${index + 1} 个编码片段无效`); return; }
    const entry = catalog.find((item) => item.type === segment.type);
    if (!entry) { errors.push(`第 ${index + 1} 个编码片段未注册：${segment.type}`); return; }
    if (entry.catalogVersion !== 1) errors.push(`编码片段 ${segment.type} Catalog 版本不兼容`);
    const schemaErrors = validateFormSchema(entry.parameterSchema, defaultFieldRegistry);
    if (schemaErrors.length) errors.push(`编码片段 ${segment.type} 参数 Schema 无效：${schemaErrors.join('，')}`);
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(segment.id)) errors.push(`第 ${index + 1} 个编码片段标识无效`);
    if (ids.has(segment.id)) errors.push(`编码片段标识重复：${segment.id}`); ids.add(segment.id);
    if (!segment.params || typeof segment.params !== 'object' || Array.isArray(segment.params)) { errors.push(`编码片段 ${segment.type} 参数无效`); return; }
    if (schemaErrors.length) return;
    for (const field of entry.parameterSchema.fields) {
      if (!(field.name in segment.params)) { errors.push(`${entry.label}缺少参数：${field.label}`); continue; }
      const issue = validateFieldValue(field, segment.params[field.name], defaultFieldRegistry);
      if (issue) errors.push(issue);
    }
  });
  if (catalog.some((entry) => entry.type === 'SEQUENCE') && definition.segments.filter((segment) => segment?.type === 'SEQUENCE').length !== 1) errors.push('编码规则必须且只能包含一个流水号片段');
  return errors;
}

export function initializeFormData(schema: FormSchema, input: Record<string, unknown> = {}, registry: FieldRegistry = defaultFieldRegistry): Record<string, FormValue> {
  return Object.fromEntries(schema.fields.map((field) => {
    const value = input[field.name] !== undefined ? input[field.name] : field.defaultValue;
    return [field.name, normalizeFieldValue(registry, field.type, value)];
  }));
}
