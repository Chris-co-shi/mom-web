<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { ComboboxAnchor, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxRoot } from 'reka-ui';
import { useLocale } from '../i18n/locale';

/** 业务对象只读摘要；组件只负责交互，不持有任何领域 API。 */
export interface ReferenceOption { id: string; code: string; name: string }
export interface ReferencePage { records: ReferenceOption[]; totalPages: number }
const props = withDefaults(defineProps<{
  modelValue: string; label: string; search: (keyword: string, page: number, signal: AbortSignal) => Promise<ReferencePage>;
  resolve: (id: string, signal: AbortSignal) => Promise<ReferenceOption>;
  parentKey?: string; disabled?: boolean; placeholder?: string; emptyText?: string;
  loadingText?: string; errorText?: string; retryText?: string; moreText?: string; clearText?: string;
}>(), { parentKey: '', placeholder: '' });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const { tForOwner } = useLocale();
const uiText = (value: string | undefined, key: string) => value ?? tForOwner('system', key);
const options = ref<ReferenceOption[]>([]), selected = ref<ReferenceOption>();
const keyword = ref(''), page = ref(0), totalPages = ref(1), open = ref(false);
const loading = ref(false), error = ref(false), resolving = ref(false), resolveError = ref(false);
let listController: AbortController | undefined, detailController: AbortController | undefined;
let listSequence = 0, detailSequence = 0;
const hasMore = computed(() => page.value < totalPages.value);
function displayValue(value: unknown): string {
  if (!value) return '';
  const option = options.value.find(item => item.id === value) ?? selected.value;
  return option?.id === value ? `${option.name} · ${option.code}` : '';
}
async function load(nextPage = 1): Promise<void> {
  if (props.disabled) return;
  const current = ++listSequence;
  listController?.abort();
  const controller = new AbortController(); listController = controller;
  loading.value = true; error.value = false;
  try {
    const result = await props.search(keyword.value.trim(), nextPage, controller.signal);
    if (current !== listSequence || controller.signal.aborted) return;
    options.value = nextPage === 1 ? result.records : [...options.value, ...result.records];
    page.value = nextPage; totalPages.value = result.totalPages;
  } catch {
    if (current === listSequence && !controller.signal.aborted) error.value = true;
  } finally { if (current === listSequence) loading.value = false; }
}
async function resolveSelected(id: string): Promise<void> {
  const current = ++detailSequence;
  detailController?.abort();
  resolveError.value = false;
  if (!id) { selected.value = undefined; return; }
  const controller = new AbortController(); detailController = controller;
  resolving.value = true;
  try {
    const option = await props.resolve(id, controller.signal);
    if (current === detailSequence && !controller.signal.aborted) selected.value = option;
  } catch {
    if (current === detailSequence && !controller.signal.aborted) {
      selected.value = undefined; resolveError.value = true;
    }
  } finally { if (current === detailSequence) resolving.value = false; }
}
function onSearch(value: string): void { keyword.value = value; open.value = true; void load(); }
function onInput(event: Event): void { onSearch((event.target as HTMLInputElement).value); }
function onSelect(value: unknown): void {
  const id = String(value ?? '');
  if (!id) return;
  selected.value = options.value.find(option => option.id === id);
  emit('update:modelValue', id); open.value = false;
}
function clear(): void { selected.value = undefined; keyword.value = ''; emit('update:modelValue', ''); void load(); }
watch(() => props.modelValue, value => { void resolveSelected(value); }, { immediate: true });
watch(() => props.parentKey, (value, previous) => {
  if (value === previous) return;
  listController?.abort(); ++listSequence; options.value = []; page.value = 0; keyword.value = '';
  detailController?.abort(); ++detailSequence; selected.value = undefined; resolving.value = false; resolveError.value = false;
  if (props.modelValue) emit('update:modelValue', '');
  if (open.value) void load();
});
onScopeDispose(() => { listController?.abort(); detailController?.abort(); });
</script>

<template>
  <div class="mom-reference-select">
    <ComboboxRoot :model-value="modelValue || undefined" :open="open" :disabled="disabled"
      :ignore-filter="true" :reset-model-value-on-clear="false" :open-on-focus="true"
      @update:model-value="onSelect" @update:open="value => { open = value; if (value && !page) load(); }">
      <ComboboxAnchor class="mom-reference-select__anchor">
        <ComboboxInput :key="selected?.id" class="mom-reference-select__input" :aria-label="label" :placeholder="placeholder || label"
          :display-value="displayValue" @input="onInput" />
        <button v-if="modelValue" type="button" class="mom-reference-select__clear" :aria-label="uiText(clearText, 'system.common.clearSelection')"
          :disabled="disabled" @click.stop="clear">×</button>
      </ComboboxAnchor>
      <ComboboxContent class="mom-reference-select__content" position="popper" :side-offset="5">
        <p v-if="loading || resolving" role="status">{{ uiText(loadingText, 'system.common.loading') }}</p>
        <div v-if="error" role="alert" class="mom-reference-select__feedback">{{ uiText(errorText, 'system.common.loadFailed') }}
          <button type="button" @click="load(page || 1)">{{ uiText(retryText, 'system.common.retry') }}</button></div>
        <template v-else>
          <p v-if="!loading && !options.length">{{ uiText(emptyText, 'system.common.noResults') }}</p>
          <ComboboxItem v-for="option in options" :key="option.id" :value="option.id"
            class="mom-reference-select__item">
            <span>{{ option.name }}</span><small>{{ option.code }}</small>
          </ComboboxItem>
          <button v-if="hasMore && !loading" type="button" data-testid="reference-more"
            class="mom-reference-select__more" @click.prevent="load(page + 1)">{{ uiText(moreText, 'system.common.loadMore') }}</button>
        </template>
      </ComboboxContent>
    </ComboboxRoot>
    <div v-if="resolveError" class="mom-reference-select__feedback" role="alert">
      {{ uiText(errorText, 'system.common.loadFailed') }}
      <button type="button" @click="resolveSelected(modelValue)">{{ uiText(retryText, 'system.common.retry') }}</button>
    </div>
  </div>
</template>
