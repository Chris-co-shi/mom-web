<script setup lang="ts">
import { computed } from 'vue';
import { useLocale } from '../../../shared/i18n/locale';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';

const props = defineProps<{ definition: CodeRuleDefinition; catalog: readonly CodeSegmentCatalogEntry[]; compact?: boolean }>();
const { t } = useLocale();
// 仅解释已保存的参数，不生成编号、不补默认值，也不改动历史定义。
const segments = computed(() => props.definition.segments.map(segment => {
  const entry = props.catalog.find(item => item.type === segment.type);
  return { id: segment.id, label: entry?.label ?? segment.type, known: !!entry,
    parameters: Object.entries(segment.params).map(([name, value]) => {
      const field = entry?.parameterSchema.fields.find(item => item.name === name);
      const option = field?.options?.find(item => item.value === value);
      return { name, label: field?.label ?? name, value: option?.label ?? String(value ?? '—'),
        unavailable: field?.type === 'SELECT' && value != null && value !== '' && !option };
    }) };
}));
</script>

<template>
  <div class="code-rule-definition" :class="{ 'code-rule-definition--compact': compact }">
    <p v-if="!segments.length" class="system-page__hint">{{ t('system.common.empty') }}</p>
    <ol v-else class="code-rule-definition__segments">
      <li v-for="(segment, index) in segments" :key="segment.id" class="code-rule-definition__segment">
        <span v-if="!compact" class="code-rule-definition__number" aria-hidden="true">{{ index + 1 }}</span>
        <div class="code-rule-definition__content">
          <strong>{{ segment.label }}</strong>
          <p v-if="!segment.known" class="system-page__hint">{{ t('system.coderules.unknownsegment') }}</p>
          <dl v-if="!compact" class="code-rule-definition__parameters">
            <div v-for="parameter in segment.parameters" :key="parameter.name">
              <dt>{{ parameter.label }}</dt><dd>{{ parameter.value }}<small v-if="parameter.unavailable">{{ t('system.coderules.unknownoption') }}</small></dd>
            </div>
          </dl>
          <span v-else class="code-rule-definition__values">{{ segment.parameters.map(parameter => `${parameter.label}: ${parameter.value}`).join(' · ') }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>
