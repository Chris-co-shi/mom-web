import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DynamicFormRenderer from './DynamicFormRenderer.vue';
import FormSchemaDesigner from './FormSchemaDesigner.vue';
import CodeRuleDesigner from './CodeRuleDesigner.vue';
import { localCodeSegmentCatalog } from './code-rule-catalog';
import type { FormSchema } from './types';

const schema: FormSchema = { schemaVersion: 1, fields: [{ id: 'name', name: 'name', type: 'TEXT', label: '名称', required: true, defaultValue: '默认' }] };

describe('DynamicFormRenderer', () => {
  it('渲染默认值、接收回填并通过 v-model 发出更新', async () => {
    const wrapper = mount(DynamicFormRenderer, { props: { schema } });
    expect(wrapper.find('input').element.value).toBe('默认');
    await wrapper.setProps({ modelValue: { name: '回填' } });
    expect(wrapper.find('input').element.value).toBe('回填');
    await wrapper.find('input').setValue('更新');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ name: '更新' });
  });
  it('对必填空值显示明确错误', async () => {
    const wrapper = mount(DynamicFormRenderer, { props: { schema, modelValue: { name: '' } } });
    await wrapper.find('input').trigger('blur');
    expect(wrapper.text()).toContain('名称为必填项');
  });
  it('Schema 输入变化时重新渲染字段并应用新默认值', async () => {
    const wrapper = mount(DynamicFormRenderer, { props: { schema } });
    await wrapper.setProps({ schema: { schemaVersion: 1, fields: [{ id: 'next', name: 'nextName', type: 'TEXT', label: '新字段', defaultValue: '新值' }] } });
    expect(wrapper.text()).toContain('新字段');
    expect(wrapper.find('input').element.value).toBe('新值');
  });
});

describe('FormSchemaDesigner', () => {
  it('把字段属性变化和导入都同步到 v-model', async () => {
    const wrapper = mount(FormSchemaDesigner, { props: { modelValue: schema } });
    await wrapper.get('.form-designer__properties input').setValue('displayName');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ fields: [expect.objectContaining({ name: 'displayName' })] });
    const textareas = wrapper.findAll('textarea');
    await textareas[1].setValue(JSON.stringify(schema));
    await wrapper.findAll('button').find((button) => button.text() === '导入 Schema')?.trigger('click');
    expect(wrapper.findAll('.form-designer__field')).toHaveLength(1);
    expect(wrapper.text()).toContain('名称');
  });
  it('目录包含固定注册的三类编码算法参数表单', () => {
    expect(localCodeSegmentCatalog.map((entry) => entry.type)).toEqual(['LITERAL', 'DATE', 'SEQUENCE']);
    expect(localCodeSegmentCatalog.find((entry) => entry.type === 'DATE')?.parameterSchema.fields[0].type).toBe('SELECT');
  });
});

describe('CodeRuleDesigner', () => {
  it('按 Catalog 默认值创建片段并输出不含 UI 状态的业务定义', async () => {
    const wrapper = mount(CodeRuleDesigner, { props: { modelValue: { schemaVersion: 1, segments: [] }, catalog: localCodeSegmentCatalog } });
    await wrapper.get('.form-designer__palette-item').trigger('click');
    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as { segments: Array<{ id: string; type: string; params: Record<string, unknown> }> };
    expect(emitted.segments).toHaveLength(1);
    expect(emitted.segments[0]).toMatchObject({ type: 'LITERAL', params: { value: 'P4' } });
    expect(emitted.segments[0]).not.toHaveProperty('selectedId');
  });
});
