import { describe, expect, it } from 'vitest';
import { initializeFormData, validateCodeRule, validateFieldValue, validateFormSchema } from './schema';
import type { FormSchema } from './types';

const schema: FormSchema = { schemaVersion: 1, fields: [
  { id: 'title', name: 'title', type: 'TEXT', label: '标题', required: true, minLength: 2, maxLength: 5, defaultValue: '示例' },
  { id: 'amount', name: 'amount', type: 'NUMBER', label: '数量', min: 1, max: 3, defaultValue: 2 },
  { id: 'kind', name: 'kind', type: 'SELECT', label: '类型', options: [{ label: 'A', value: 'a' }] },
] };

describe('FormSchema', () => {
  it('提供默认值并在回填时保留字段类型', () => {
    expect(initializeFormData(schema, { amount: '3', kind: 'a', ignored: 'x' })).toEqual({ title: '示例', amount: 3, kind: 'a' });
  });
  it('报告重复标识、非法范围和缺失下拉选项', () => {
    expect(validateFormSchema({ schemaVersion: 1, fields: [
      { ...schema.fields[0], id: 'same' }, { ...schema.fields[1], id: 'same', min: 5, max: 2 },
      { ...schema.fields[2], id: 'kind2', options: [] },
    ] })).toEqual(expect.arrayContaining([expect.stringContaining('重复'), expect.stringContaining('最小值'), expect.stringContaining('至少需要一个选项')]));
  });
  it('拒绝重复下拉值和不匹配的默认值', () => {
    expect(validateFormSchema({ schemaVersion: 1, fields: [{
      ...schema.fields[2], defaultValue: 'missing', options: [{ label: '甲', value: 'same' }, { label: '乙', value: 'same' }],
    }] })).toEqual(expect.arrayContaining([expect.stringContaining('选项值重复'), expect.stringContaining('默认值必须匹配')]));
  });
  it('校验必填、长度、数值范围和枚举成员', () => {
    expect(validateFieldValue(schema.fields[0], '')).toContain('必填');
    expect(validateFieldValue(schema.fields[0], 'x')).toContain('至少需要 2');
    expect(validateFieldValue(schema.fields[1], 4)).toContain('不能大于 3');
    expect(validateFieldValue(schema.fields[2], 'bad')).toContain('不是有效选项');
  });
});

describe('CodeRuleDefinition', () => {
  it('要求唯一流水号且步长固定为 1', () => {
    expect(validateCodeRule({ schemaVersion: 1, segments: [
      { id: 'lit', type: 'LITERAL', params: { value: 'P4' } },
      { id: 'seq', type: 'SEQUENCE', params: { width: 4, step: 2 } },
      { id: 'seq2', type: 'SEQUENCE', params: { width: 4, step: 1 } },
    ] })).toEqual(expect.arrayContaining([expect.stringContaining('步长必须固定为 1'), expect.stringContaining('必须且只能包含一个流水号')]));
  });
});
