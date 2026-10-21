<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { MomButton, MomInput } from '../../../shared/ui';
import { useLocale } from '../../../shared/i18n/locale';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { managementFeedback } from '../../../shared/management/management-feedback';
import { codeRuleApi, type CodeGenerationField, type CodeGenerationResult, type CodeRuleOwner, type CodeRuleView } from '../api/code-rule-api';

const props = defineProps<{ owner: CodeRuleOwner; rule: CodeRuleView }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const { t } = useLocale();
const fields = ref<CodeGenerationField[]>([]);
const loading = ref(true);
const fieldError = ref(false);
const values = ref<Record<string, string>>({});
const submitting = ref(false);
const result = ref<CodeGenerationResult | null>(null);
const error = ref<ReturnType<typeof managementFeedback> | null>(null);
const errorCode = ref<string | null>(null);
const unknown = ref(false);
const copied = ref(false);
let pending: { ruleCode: string; context: Record<string, string>; requestKey: string } | null = null;

const contextKeys = computed(() => {
  const keys = new Set<string>();
  for (const segment of props.rule.definition.segments.filter(item => item.type === 'BUSINESS_FIELD')) {
    const field = fields.value.find(item => item.fieldKey === segment.params.fieldKey);
    field?.requiredContextKeys.forEach(key => keys.add(key));
  }
  return [...keys];
});
const missingField = computed(() => props.rule.definition.segments.some(segment => segment.type === 'BUSINESS_FIELD'
  && !fields.value.some(field => field.fieldKey === segment.params.fieldKey)));

onMounted(async () => {
  try { fields.value = await codeRuleApi.generationFields(props.owner); }
  catch { fieldError.value = true; }
  finally { loading.value = false; }
});

async function generate(): Promise<void> {
  if (submitting.value || loading.value || fieldError.value || missingField.value) return;
  if (!pending) {
    if (contextKeys.value.some(key => !values.value[key]?.trim())) { error.value = { key: 'system.coderules.contextmissing' }; return; }
    pending = { ruleCode: props.rule.ruleCode,
      context: Object.fromEntries(contextKeys.value.map(key => [key, values.value[key].trim()])), requestKey: crypto.randomUUID() };
  }
  submitting.value = true; error.value = null; errorCode.value = null; result.value = null; copied.value = false;
  emit('busy', true);
  try { result.value = await codeRuleApi.generate(props.owner, pending); pending = null; unknown.value = false; }
  catch (cause) {
    errorCode.value = isApiError(cause) ? cause.code : null;
    unknown.value = classifyWriteFailure(cause) === 'unknown';
    error.value = unknown.value ? { key: 'system.feedback.unknown', correlationId: isApiError(cause) ? cause.correlationId : undefined }
      : managementFeedback(cause, true);
    if (!unknown.value) pending = null;
  } finally { submitting.value = false; emit('busy', false); }
}

async function copy(): Promise<void> {
  if (!result.value) return;
  try { await navigator.clipboard.writeText(result.value.code); copied.value = true; }
  catch { error.value = { key: 'system.feedback.failed' }; }
}
</script>

<template>
  <section class="code-rule-management__generation" :aria-label="t('system.coderules.generate')">
    <h3>{{ t('system.coderules.generate') }}</h3>
    <p class="system-page__hint">{{ t('system.coderules.generatehint') }}</p>
    <p v-if="loading" role="status">{{ t('system.common.loading') }}</p>
    <p v-else-if="fieldError || missingField" class="system-page__error" role="alert">{{ t('system.coderules.fieldcatalogfailed') }}</p>
    <template v-else>
      <label v-for="key in contextKeys" :key="key" class="code-rule-management__field">
        {{ t('system.coderules.contextkey') }} · {{ key }}
        <MomInput v-model="values[key]" :disabled="submitting || unknown" :max-length="256" required />
      </label>
      <p v-if="error" class="system-page__error" role="alert">{{ t(error.key) }} <small v-if="errorCode">{{ errorCode }}</small> <small v-if="error.correlationId">{{ error.correlationId }}</small></p>
      <div class="code-rule-management__generation-actions">
        <MomButton :disabled="submitting" @click="generate">{{ t(unknown ? 'system.coderules.retrygeneration' : 'system.coderules.generate') }}</MomButton>
        <template v-if="result">
          <code>{{ result.code }}</code>
          <span>{{ t('system.coderules.generatedrevision') }} {{ result.revisionNo }}</span>
          <MomButton variant="outline" @click="copy">{{ t(copied ? 'system.coderules.copied' : 'system.coderules.copy') }}</MomButton>
        </template>
      </div>
    </template>
  </section>
</template>
