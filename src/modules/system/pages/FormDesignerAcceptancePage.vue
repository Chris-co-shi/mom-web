<script setup lang="ts">
import { ref } from 'vue';
import { MomButton } from '../../../shared/ui';
import LocaleSwitcher from '../../../shared/i18n/LocaleSwitcher.vue';
import ThemeSwitcher from '../../../shared/theme/ThemeSwitcher.vue';
import { CodeRuleDesigner, FormSchemaDesigner, localCodeSegmentCatalog } from '../../../shared/form-designer';
import type { CodeRuleDefinition, FormSchema } from '../../../shared/form-designer';

const active = ref<'form' | 'code'>('form');
const formSchema = ref<FormSchema>({ schemaVersion: 1, fields: [
  { id: 'product_code', name: 'productCode', type: 'TEXT', label: '产品编码', required: true, minLength: 2, maxLength: 24, defaultValue: 'P4' },
  { id: 'priority', name: 'priority', type: 'NUMBER', label: '优先级', required: true, min: 1, max: 9, defaultValue: 4 },
  { id: 'plant', name: 'plant', type: 'SELECT', label: '工厂', required: true, defaultValue: 'plant-a', options: [{ label: '一号工厂', value: 'plant-a' }, { label: '二号工厂', value: 'plant-b' }] },
] });
const codeRule = ref<CodeRuleDefinition>({ schemaVersion: 1, segments: [
  { id: 'literal_p4', type: 'LITERAL', params: { value: 'P4' } },
  { id: 'date_main', type: 'DATE', params: { format: 'YYYYMMDD' } },
  { id: 'sequence_main', type: 'SEQUENCE', params: { width: 4, step: 1 } },
] });
</script>

<template>
  <main class="designer-acceptance">
    <header class="designer-acceptance__header"><div><p class="designer-acceptance__eyebrow">SYSTEM · INTERACTIVE VALIDATION</p><h1>动态表单与编码规则设计器</h1><p>真实组件验收页。改动只保存在当前页面，不提交到服务端。</p></div>
      <div class="designer-acceptance__tools"><LocaleSwitcher compact /><ThemeSwitcher compact /><nav aria-label="设计器类型"><MomButton :variant="active === 'form' ? 'default' : 'outline'" @click="active = 'form'">FormSchema</MomButton><MomButton :variant="active === 'code' ? 'default' : 'outline'" @click="active = 'code'">编码规则</MomButton></nav></div></header>
    <div class="designer-acceptance__notice" role="note">{{ active === 'form' ? '拖拽组件到画布；字段名、约束和选项会即时反映到预览与 Schema。' : '编码规则只接受已注册片段；预览中的日期和流水均为本地样例。' }}</div>
    <FormSchemaDesigner v-if="active === 'form'" v-model="formSchema" />
    <CodeRuleDesigner v-else v-model="codeRule" :catalog="localCodeSegmentCatalog" />
  </main>
</template>
