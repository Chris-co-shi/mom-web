<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard } from '../../auth';
import { MomButton, MomCheckbox, MomInput, MomLoading, MomNumberInput, MomTextarea } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { systemApi, type DictionaryItem, type DictionaryType } from '../api/system-api';
import { systemFeedback, validDictionaryCode, validDisplayText, validItemKey, validSortOrder, type SystemFeedback } from '../model/system-feedback';
import { useSystemList } from '../model/use-system-list';
import './system-pages.css';

type Action = 'create' | 'edit' | 'detail' | 'status';
type Kind = 'type' | 'item';
const { t } = useLocale();
const types = useSystemList(systemApi.listDictionaryTypes);
const selectedId = ref<string | null>(null);
const selected = computed(() => types.rows.value.find(row => row.id === selectedId.value) ?? null);
const items = useSystemList(signal => selectedId.value ? systemApi.listDictionaryItems(selectedId.value, signal) : Promise.resolve([]));
const typeSearch = ref(''); const itemSearch = ref('');
const typePage = ref(1); const itemPage = ref(1); const pageSize = ref(20);
const filteredTypes = computed(() => types.rows.value.filter(row => `${row.code} ${row.name}`.toLowerCase().includes(typeSearch.value.trim().toLowerCase())));
const typePages = computed(() => Math.max(1, Math.ceil(filteredTypes.value.length / 10)));
const visibleTypes = computed(() => filteredTypes.value.slice((typePage.value - 1) * 10, typePage.value * 10));
const filteredItems = computed(() => items.rows.value.filter(row => `${row.key} ${row.value} ${row.description ?? ''}`.toLowerCase().includes(itemSearch.value.trim().toLowerCase())));
const itemPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)));
const visibleItems = computed(() => filteredItems.value.slice((itemPage.value - 1) * pageSize.value, itemPage.value * pageSize.value));
const columns = computed<MomColumn[]>(() => [
  { key: 'key', title: t('system.dictionary.itemKey'), minWidth: 160 },
  { key: 'value', title: t('system.dictionary.itemValue'), minWidth: 190 },
  { key: 'sortOrder', title: t('system.common.sort'), width: 90 },
  { key: 'enabled', title: t('system.common.status'), width: 110 },
  { key: 'description', title: t('system.common.description'), minWidth: 180 },
  { key: 'actions', title: t('system.common.actions'), width: 180, fixed: 'right', resizable: false },
]);
const kind = ref<Kind>('type'); const action = ref<Action | null>(null);
const targetType = ref<DictionaryType | null>(null); const targetItem = ref<DictionaryItem | null>(null);
const form = reactive({ code: '', name: '', key: '', value: '', sortOrder: 0, description: '', enabled: true });
const saving = ref(false); const blocked = ref(false); const feedback = ref<SystemFeedback | null>(null); const notice = ref(false);
watch(typeSearch, () => { typePage.value = 1; });
watch([itemSearch, pageSize], () => { itemPage.value = 1; });
watch(typePages, count => { if (typePage.value > count) typePage.value = count; });
watch(itemPages, count => { if (itemPage.value > count) itemPage.value = count; });
watch(selectedId, id => { items.clear(); itemPage.value = 1; if (id) void items.reload(); });

async function refreshTypes(): Promise<void> {
  if (!(await types.reload())) return;
  blocked.value = false; feedback.value = null;
  if (!types.rows.value.some(row => row.id === selectedId.value)) selectedId.value = types.rows.value[0]?.id ?? null;
  else if (selectedId.value) await items.reload();
  if (targetType.value) targetType.value = types.rows.value.find(row => row.id === targetType.value?.id) ?? null;
}
async function refreshItems(): Promise<void> {
  if (!selectedId.value || !(await items.reload())) return;
  blocked.value = false; feedback.value = null;
  if (targetItem.value) targetItem.value = items.rows.value.find(row => row.id === targetItem.value?.id) ?? null;
}
function open(nextKind: Kind, nextAction: Action, row?: DictionaryType | DictionaryItem): void {
  if (saving.value || blocked.value) return;
  notice.value = false; kind.value = nextKind; action.value = nextAction; feedback.value = null;
  targetType.value = nextKind === 'type' ? (row as DictionaryType | undefined) ?? null : selected.value;
  targetItem.value = nextKind === 'item' ? (row as DictionaryItem | undefined) ?? null : null;
  const type = targetType.value; const item = targetItem.value;
  Object.assign(form, {
    code: type?.code ?? '', name: type?.name ?? '', key: item?.key ?? '', value: item?.value ?? '',
    sortOrder: item?.sortOrder ?? 0, description: (nextKind === 'type' ? type?.description : item?.description) ?? '', enabled: (nextKind === 'type' ? type?.enabled : item?.enabled) ?? true
  });
}
function close(): void { if (!saving.value) { action.value = null; feedback.value = null; } }
async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || blocked.value) return;
  if ((kind.value === 'type' && action.value !== 'create' && !targetType.value) ||
    (kind.value === 'item' && (!targetType.value || (action.value !== 'create' && !targetItem.value)))) {
    feedback.value = { key: 'system.feedback.notFound' }; blocked.value = true; return;
  }
  if (action.value === 'create' || action.value === 'edit') {
    const valid = kind.value === 'type'
      ? (action.value !== 'create' || validDictionaryCode(form.code.trim())) && validDisplayText(form.name, 200)
      : (action.value !== 'create' || validItemKey(form.key.trim())) && validDisplayText(form.value, 200) && validSortOrder(Number(form.sortOrder));
    if (!valid || !validDisplayText(form.description, 1000, false)) { feedback.value = { key: 'system.common.required' }; return; }
  }
  saving.value = true; feedback.value = null;
  try {
    let createdTypeId: string | null = null;
    if (kind.value === 'type') {
      if (action.value === 'create') createdTypeId = (await systemApi.createDictionaryType({ code: form.code.trim(), name: form.name.trim(), enabled: form.enabled, description: form.description.trim() || null })).id;
      else if (action.value === 'edit' && targetType.value) await systemApi.updateDictionaryType(targetType.value.id, { name: form.name.trim(), description: form.description.trim() || null, version: targetType.value.version });
      else if (action.value === 'status' && targetType.value) await systemApi.setDictionaryTypeStatus(targetType.value, !targetType.value.enabled);
    } else if (targetType.value) {
      if (action.value === 'create') await systemApi.createDictionaryItem(targetType.value.id, { key: form.key.trim(), value: form.value.trim(), sortOrder: Number(form.sortOrder), enabled: form.enabled, description: form.description.trim() || null });
      else if (action.value === 'edit' && targetItem.value) await systemApi.updateDictionaryItem(targetType.value.id, targetItem.value.id, { value: form.value.trim(), sortOrder: Number(form.sortOrder), description: form.description.trim() || null, version: targetItem.value.version });
      else if (action.value === 'status' && targetItem.value) await systemApi.setDictionaryItemStatus(targetType.value.id, targetItem.value, !targetItem.value.enabled);
    }
    const changedKind = kind.value; action.value = null; notice.value = true;
    if (changedKind === 'type') { await refreshTypes(); if (createdTypeId && types.rows.value.some(row => row.id === createdTypeId)) selectedId.value = createdTypeId; }
    else await refreshItems();
  } catch (cause) {
    feedback.value = systemFeedback(cause, true);
    blocked.value = feedback.value.key === 'system.feedback.conflict' || feedback.value.key === 'system.feedback.unknown';
  } finally { saving.value = false; }
}
onMounted(refreshTypes);
onBeforeRouteLeave(() => !saving.value);
</script>

<template>
  <PageContainer>
    <section class="system-page" aria-labelledby="system-dictionary-title">
      <MomManagementHeader title-id="system-dictionary-title" :title="t('system.dictionary.title')"
        :description="t('system.dictionary.description')"><template #actions>
          <MomButton variant="outline" class="mom-management-button--secondary" round
            :disabled="types.loading.value || saving" @click="refreshTypes">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('system.common.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['system:dictionary:write']">
            <MomButton round :disabled="saving || blocked" @click="open('type', 'create')">
              <Plus :size="16" aria-hidden="true" />{{ t('system.dictionary.createType') }}
            </MomButton>
          </AuthorityGuard>
        </template></MomManagementHeader>
      <p v-if="notice" class="system-page__notice" role="status">{{ t('system.common.saved') }}</p>
      <div v-if="feedback && !action" class="system-page__error" role="alert">
        <p>{{ t(feedback.key) }}</p>
        <MomButton variant="outline" @click="refreshTypes">{{ t('system.common.refresh') }}</MomButton>
      </div>
      <div v-if="types.error.value" class="system-page__error" role="alert">
        <p>{{ t(types.error.value.key) }}</p><small v-if="types.error.value.correlationId">{{
          types.error.value.correlationId
        }}</small>
        <MomButton variant="outline" @click="refreshTypes">{{ t('system.common.refresh') }}</MomButton>
      </div>
      <div class="system-page__workspace">
        <aside class="system-page__rail" :aria-label="t('system.dictionary.types')" :aria-busy="types.loading.value">
          <div class="system-page__rail-header"><strong>{{ t('system.dictionary.types') }}</strong>
            <MomButton variant="outline" size="icon" :aria-label="t('system.common.refresh')"
              :disabled="types.loading.value" @click="refreshTypes">
              <RefreshCw :size="15" aria-hidden="true" />
            </MomButton>
          </div>
          <MomCrudSearch v-model="typeSearch" :label="t('system.common.search')" :disabled="types.loading.value" />
          <small class="system-page__count">{{ t('system.common.scope') }}</small>
          <div class="system-page__rail-list">
            <MomButton v-for="row in visibleTypes" :key="row.id" class="system-page__rail-item"
              :class="{ 'system-page__rail-item--active': selectedId === row.id }" :aria-pressed="selectedId === row.id"
              :disabled="types.loading.value || saving" @click="selectedId = row.id"><strong>{{ row.name
              }}</strong><small>{{
                  row.code }} · {{ t(row.enabled ? 'system.common.enabled' : 'system.common.disabled') }}</small>
            </MomButton>
            <p v-if="!types.loading.value && !visibleTypes.length" class="system-page__count">{{
              t('system.common.empty') }}
            </p>
          </div>
          <div class="system-page__rail-footer"><span>{{ t('system.common.page', {
            current: typePage, pages: typePages
          })
              }}</span>
            <div>
              <MomButton variant="outline" size="icon" :aria-label="t('system.common.previous')"
                :disabled="typePage <= 1" @click="typePage--">‹</MomButton>
              <MomButton variant="outline" size="icon" :aria-label="t('system.common.next')"
                :disabled="typePage >= typePages" @click="typePage++">›</MomButton>
            </div>
          </div>
          <MomLoading :model-value="types.loading.value" :text="t('system.common.loading')" />
        </aside>
        <div class="system-page__detail">
          <template v-if="selected">
            <div class="system-page__detail-heading">
              <div>
                <h2>{{ selected.name }}</h2>
                <p>{{ selected.code }} · {{ t('system.dictionary.noCascade') }}</p>
              </div>
              <div class="system-page__detail-actions">
                <AuthorityGuard :authorities="['system:dictionary:write']">
                  <MomButton variant="outline" @click="open('type', 'edit', selected)">{{ t('system.common.edit') }}
                  </MomButton>
                  <MomButton variant="outline" @click="open('type', 'status', selected)">{{ t(selected.enabled ?
                    'system.common.disable' : 'system.common.enable') }}</MomButton>
                </AuthorityGuard>
                <MomButton variant="outline" @click="open('type', 'detail', selected)">{{ t('system.common.detail') }}
                </MomButton>
              </div>
            </div>
            <div v-if="items.error.value" class="system-page__error" role="alert">
              <p>{{ t(items.error.value.key) }}</p><small v-if="items.error.value.correlationId">{{
                items.error.value.correlationId }}</small>
              <MomButton variant="outline" @click="refreshItems">{{ t('system.common.refresh') }}</MomButton>
            </div>
            <MomListSurface embedded :title="t('system.dictionary.items')" :hint="t('system.common.scope')"
              :loading="items.loading.value" :loading-text="t('system.common.loading')"><template #toolbar>
                <div class="mom-management-tools">
                  <MomCrudSearch v-model="itemSearch" :label="t('system.common.search')"
                    :disabled="items.loading.value" /><span class="mom-management-count">{{ t('system.common.count', {
                      total: items.rows.value.length, visible: filteredItems.length
                    }) }}</span>
                  <MomButton variant="outline" :disabled="items.loading.value" @click="refreshItems">{{
                    t('system.common.refresh') }}</MomButton>
                  <AuthorityGuard :authorities="['system:dictionary:write']">
                    <MomButton :disabled="saving || blocked" @click="open('item', 'create')">
                      <Plus :size="16" aria-hidden="true" />{{ t('system.dictionary.createItem') }}
                    </MomButton>
                  </AuthorityGuard>
                </div>
              </template>
              <MomDataTable class="system-page__table" :rows="visibleItems" :columns="columns"
                :empty-text="t('system.common.empty')"><template #cell-key="{ row }"><span class="system-page__code">{{
                  row.key }}</span></template><template #cell-enabled="{ row }"><span class="mom-management-status"
                    :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span
                      class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ?
                        'system.common.enabled' : 'system.common.disabled') }}</span></template><template
                  #cell-actions="{ row }">
                  <div class="system-page__row-actions">
                    <MomButton mode="text" @click="open('item', 'detail', row)">{{ t('system.common.detail') }}
                    </MomButton>
                    <AuthorityGuard :authorities="['system:dictionary:write']">
                      <MomButton mode="text" :disabled="saving || blocked" @click="open('item', 'edit', row)">{{
                        t('system.common.edit') }}</MomButton>
                      <MomButton mode="text" :disabled="saving || blocked" @click="open('item', 'status', row)">{{
                        t(row.enabled ? 'system.common.disable' : 'system.common.enable') }}</MomButton>
                    </AuthorityGuard>
                  </div>
                </template>
              </MomDataTable>
              <template #footer>
                <MomCrudPagination :page-no="itemPage" :page-size="pageSize" :total="filteredItems.length"
                  :summary="t('system.common.page', { current: itemPage, pages: itemPages })"
                  :page-size-label="t('system.common.pageSize')" :previous-label="t('system.common.previous')"
                  :next-label="t('system.common.next')" :jump-label="t('system.common.jump')"
                  :go-label="t('system.common.go')" :disabled="items.loading.value || saving" @page="itemPage = $event"
                  @size="pageSize = $event" />
              </template>
            </MomListSurface>
          </template>
          <div v-else class="system-page__empty">{{ t('system.dictionary.selectType') }}</div>
        </div>
      </div>
      <MomModal :open="!!action"
        :title="t(kind === 'type' ? 'system.dictionary.types' : 'system.dictionary.items') + ' · ' + t(action === 'create' ? 'system.common.create' : action === 'edit' ? 'system.common.edit' : action === 'detail' ? 'system.common.detail' : 'system.common.confirm')"
        :close-label="t('system.common.close')" :busy="saving" :busy-text="t('system.common.saving')" @close="close">
        <div v-if="feedback" class="system-page__error" role="alert">
          <p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small>
          <MomButton v-if="blocked" variant="outline" @click="kind === 'type' ? refreshTypes() : refreshItems()">{{
            t('system.common.refresh') }}</MomButton>
        </div>
        <dl v-if="action !== 'create'" class="system-page__summary">
          <div>
            <dt>{{ t(kind === 'type' ? 'system.dictionary.typeCode' : 'system.dictionary.itemKey') }}</dt>
            <dd>{{ kind === 'type' ? targetType?.code : targetItem?.key }}</dd>
          </div>
          <div>
            <dt>{{ t('system.common.status') }}</dt>
            <dd>{{ t((kind === 'type' ? targetType?.enabled : targetItem?.enabled) ? 'system.common.enabled' :
              'system.common.disabled') }}</dd>
          </div>
          <div>
            <dt>{{ t('system.common.version') }}</dt>
            <dd>{{ kind === 'type' ? targetType?.version : targetItem?.version }}</dd>
          </div>
        </dl>
        <form v-if="action && action !== 'detail'" class="system-page__form" @submit.prevent="submit">
          <template v-if="action === 'create' || action === 'edit'"><template v-if="kind === 'type'"><label
                v-if="action === 'create'">{{ t('system.dictionary.typeCode') }} *
                <MomInput v-model="form.code" :max-length="128" :disabled="saving" /><small>{{
                  t('system.dictionary.codeHint') }}</small>
              </label><label>{{ t('system.dictionary.typeName') }} *
                <MomInput v-model="form.name" :max-length="200" :disabled="saving" />
              </label></template><template v-else><label v-if="action === 'create'">{{ t('system.dictionary.itemKey') }}
                *
                <MomInput v-model="form.key" :max-length="64" :disabled="saving" /><small>{{
                  t('system.dictionary.keyHint') }}</small>
              </label><label>{{ t('system.dictionary.itemValue') }} *
                <MomInput v-model="form.value" :max-length="200" :disabled="saving" />
              </label><label>{{ t('system.common.sort') }}
                <MomNumberInput v-model="form.sortOrder" :min="0" :max="1000000" :disabled="saving" />
              </label></template><label>{{
                t('system.common.description') }}
              <MomTextarea v-model="form.description" :maxlength="1000" :disabled="saving" />
            </label><label v-if="action === 'create'" class="system-page__check">
              <MomCheckbox v-model="form.enabled" :disabled="saving" />{{ t('system.common.enabled') }}
            </label></template>
          <p v-else>{{ t(kind === 'type' ? 'system.dictionary.noCascade' : 'system.common.statusHint') }}</p>
          <div class="system-page__footer">
            <MomButton variant="outline" :disabled="saving" @click="close">{{ t('system.common.cancel') }}</MomButton>
            <MomButton type="submit" :disabled="saving || blocked">{{ t('system.common.save') }}</MomButton>
          </div>
        </form>
        <div v-else class="system-page__footer">
          <MomButton variant="outline" @click="close">{{ t('system.common.close') }}</MomButton>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
