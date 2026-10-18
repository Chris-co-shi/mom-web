import { mount } from '@vue/test-utils';
import { markRaw } from 'vue';
import { describe, expect, it } from 'vitest';
import DynamicFormRenderer from './DynamicFormRenderer.vue';
import FormSchemaDesigner from './FormSchemaDesigner.vue';
import CodeRuleDesigner from './CodeRuleDesigner.vue';
import { localCodeSegmentCatalog } from './code-rule-catalog';
import { createFieldRegistry, defaultFieldRegistry } from './field-registry';
import { initializeDynamicFormData } from './schema';
import type { CodeRuleSegment, CodeSegmentCatalogEntry, FormSchema } from './types';

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
    await wrapper.setProps({ schema: { schemaVersion: 1, fields: [] } });
    expect(wrapper.findAll('input')).toHaveLength(0);
    expect(wrapper.vm.$.exposed?.validate?.()).toBe(true);
  });
  it('连续外部回填始终以最新 modelValue 为准', async () => {
    const wrapper = mount(DynamicFormRenderer, { props: { schema, modelValue: { name: '第一次' } } });
    await wrapper.setProps({ modelValue: { name: '第二次' } });
    await wrapper.setProps({ modelValue: { name: '第三次' } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('第三次');
  });
  it('SWITCH 可以新增、渲染并将 false 双向绑定', async () => {
    const switchSchema: FormSchema = { schemaVersion: 1, fields: [{ id: 'enabled', name: 'enabled', type: 'SWITCH', label: '启用', defaultValue: false }] };
    const wrapper = mount(DynamicFormRenderer, { props: { schema: switchSchema } });
    const checkbox = wrapper.findComponent({ name: 'MomCheckbox' });
    expect(checkbox.props('modelValue')).toBe(false);
    await checkbox.vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ enabled: true });
  });
  it('非法 Schema 安全失败且不尝试渲染未知类型', () => {
    const wrapper = mount(DynamicFormRenderer, { props: { schema: { schemaVersion: 1, fields: [{ id: 'bad', name: 'bad', type: 'MISSING', label: '未知' }] } as unknown as FormSchema } });
    expect(wrapper.text()).toContain('类型未注册');
    expect(wrapper.findAll('input')).toHaveLength(0);
  });
  it('通过注册项适配非标准 props 与 change 事件完成回填、更新和校验', async () => {
    const Custom = { props: ['value', 'caption'], emits: ['change'], template: '<input :value="value" :aria-label="caption" @input="$emit(\'change\', $event.target.value)" />' };
    const registry = createFieldRegistry([...defaultFieldRegistry.values(), {
      type: 'CUSTOM', label: '自定义', description: '测试', preview: '自定义', control: markRaw(Custom),
      adapter: { event: 'change', props: (field, value) => ({ value, caption: field.label }), value: (value) => String(value) },
      valueKind: 'text', properties: [], create: (id, name) => ({ id, name, type: 'CUSTOM', label: '自定义字段', required: true, defaultValue: '初始' }),
      normalize: (value) => value == null ? '' : String(value),
      validateValue: (_field, value) => value ? undefined : '自定义值必填',
    }]);
    const customSchema: FormSchema = { schemaVersion: 1, fields: [{ id: 'custom', name: 'custom', type: 'CUSTOM', label: '自定义字段', required: true, defaultValue: '初始' }] };
    const wrapper = mount(DynamicFormRenderer, { props: { schema: customSchema, registry } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('初始');
    await wrapper.find('input').setValue('更新');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ custom: '更新' });
    await wrapper.setProps({ modelValue: { custom: '外部回填' } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('外部回填');
    expect(wrapper.vm.$.exposed?.validate?.()).toBe(true);
  });
  it('required SWITCH 接受 false，默认值可由宿主纯函数初始化', async () => {
    const switchSchema: FormSchema = { schemaVersion: 1, fields: [{ id: 'enabled', name: 'enabled', type: 'SWITCH', label: '启用', required: true, defaultValue: false }] };
    const wrapper = mount(DynamicFormRenderer, { props: { schema: switchSchema } });
    expect(wrapper.vm.$.exposed?.validate?.()).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(initializeDynamicFormData(switchSchema)).toEqual({ enabled: false });
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
  it('注册元数据驱动 palette、属性面板和拖拽 clone 字段创建', async () => {
    const wrapper = mount(FormSchemaDesigner);
    expect(wrapper.find('[data-type="SWITCH"]').exists()).toBe(true);
    await wrapper.get('[data-type="SWITCH"]').trigger('click');
    expect(wrapper.text()).toContain('开关字段');
    expect(wrapper.findAll('.form-designer__properties label')).toHaveLength(defaultFieldRegistry.get('SWITCH')!.properties.length);
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ fields: [expect.objectContaining({ type: 'SWITCH', defaultValue: false })] });
  });
  it('SELECT 复杂选项属性由注册编辑器提供，JSON 导入导出保持一致', async () => {
    const select: FormSchema = { schemaVersion: 1, fields: [{ id: 'plant', name: 'plant', type: 'SELECT', label: '工厂', options: [{ label: '一号', value: 'p1' }] }] };
    const wrapper = mount(FormSchemaDesigner, { props: { modelValue: select } });
    expect(wrapper.text()).toContain('下拉选项');
    await wrapper.get('[aria-label="选项 1 显示文本"]').setValue('二号');
    const exported = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as FormSchema;
    expect(exported.fields[0].options?.[0].label).toBe('二号');
    await wrapper.findAll('textarea')[1].setValue(JSON.stringify(exported));
    await wrapper.findAll('button').find((button) => button.text() === '导入 Schema')?.trigger('click');
    expect(wrapper.findAll('.form-designer__field')).toHaveLength(1);
  });
  it('允许外部 Catalog 添加新片段并按参数 Schema 渲染，未知片段安全报错', async () => {
    const extra = { type: 'PREFIX', label: '前缀算法', description: '自定义前缀', catalogVersion: 1 as const, parameterSchema: { schemaVersion: 1 as const, fields: [{ id: 'prefix', name: 'prefix', type: 'TEXT', label: '前缀内容', defaultValue: 'X' }] } };
    const wrapper = mount(CodeRuleDesigner, { props: { modelValue: { schemaVersion: 1, segments: [] }, catalog: [...localCodeSegmentCatalog, extra] } });
    expect(wrapper.find('[data-type="PREFIX"]').exists()).toBe(true);
    await wrapper.get('[data-type="PREFIX"]').trigger('click');
    expect(wrapper.find('.form-designer__properties').text()).toContain('前缀内容');
    expect(wrapper.text()).toContain('安全占位预览');
    await wrapper.setProps({ modelValue: { schemaVersion: 1, segments: [{ id: 'unknown', type: 'MISSING', params: {} }] } });
    expect(wrapper.text()).toContain('未注册片段类型：MISSING');
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


describe('CodeRuleDesigner 拖拽对象契约', () => {
  it('克隆时即提供完整片段，model 更新先于 add 事件也能安全渲染，且 add 不重建 ID', async () => {
    const wrapper = mount(CodeRuleDesigner, { props: { catalog: localCodeSegmentCatalog } });
    const [palette, canvas] = wrapper.findAllComponents({ name: 'VueDraggable' });
    const clone = palette.props('clone') as (entry: CodeSegmentCatalogEntry) => CodeRuleSegment;
    expect(clone).toBeTypeOf('function');
    const segment = clone(localCodeSegmentCatalog[0]);
    expect(segment).toMatchObject({ id: expect.stringMatching(/^segment_/), type: 'LITERAL', params: { value: 'P4' } });
    canvas.vm.$emit('update:modelValue', [segment]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.form-designer__code').text()).toContain(segment.id);
    canvas.vm.$emit('add', { newDraggableIndex: 0, clonedData: segment });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ schemaVersion: 1, segments: [segment] });
    expect(wrapper.find('.form-designer__properties').text()).toContain('固定内容');
    expect(clone(localCodeSegmentCatalog[0]).id).not.toBe(segment.id);
    wrapper.unmount();
  });
});
