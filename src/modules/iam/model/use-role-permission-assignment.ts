import { computed, onScopeDispose, ref, watch } from 'vue';
import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';
import { hasAuthorities } from '../../auth';
import type { PermissionResponse } from '../api/permissions-api';
import { searchPermissions } from '../api/permissions-api';
import { searchResources, type PermissionResourceResponse } from '../api/permission-resources-api';
import type { RoleResponse } from '../api/roles-api';
import { getRole, getRolePermissions, replaceRolePermissions } from '../api/roles-api';

export interface GrantFeedback { key: MessageKey; correlationId?: string }
export type GrantStage = 'select' | 'review' | 'stale' | 'unknown';

function feedback(error: unknown, writing = false): GrantFeedback {
  if (!isApiError(error)) return { key: writing ? 'iam.grants.unknownWrite' : 'iam.grants.loadFailed' };
  let key: MessageKey = 'iam.grants.loadFailed';
  if (writing && (error.resultUnknown || error.kind === 'network' || error.kind === 'timeout'
    || error.kind === 'server' || error.kind === 'protocol')) key = 'iam.grants.unknownWrite';
  else if (error.code === 'auth.permission_disabled') key = 'iam.grants.disabled';
  else if (error.code === 'auth.relation_selection_too_large') key = 'iam.grants.limit';
  else if (error.kind === 'conflict') key = 'iam.grants.conflict';
  else if (error.kind === 'not_found') key = 'iam.grants.notFound';
  else if (error.kind === 'forbidden') key = 'iam.grants.forbidden';
  else if (error.kind === 'unauthenticated') key = 'iam.grants.unauthenticated';
  else if (error.kind === 'rate_limited') key = 'iam.grants.rateLimited';
  return { key, correlationId: error.correlationId };
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/** 角色权限整体替换的局部状态；无关系版本，重读仅缩小并发窗口而不承诺 CAS。 */
export function useRolePermissionAssignment() {
  const opened = ref(false);
  const target = ref<RoleResponse>();
  const assigned = ref<PermissionResponse[]>([]);
  const selectedIds = ref<string[]>([]);
  const known = ref<PermissionResponse[]>([]);
  const catalog = ref<PermissionResponse[]>([]);
  const resources = ref<PermissionResourceResponse[]>([]);
  const domainCode = ref('');
  const resourceId = ref('');
  const pageNo = ref(1);
  const total = ref(0);
  const pageSize = 50;
  const searchQuery = ref('');
  const loading = ref(false);
  const catalogLoading = ref(false);
  const saving = ref(false);
  const stage = ref<GrantStage>('select');
  const error = ref<GrantFeedback>();
  const catalogError = ref<GrantFeedback>();
  const notice = ref<GrantFeedback>();
  let controller: AbortController | undefined;
  let pageController: AbortController | undefined;
  let sequence = 0;
  let pageSequence = 0;
  let disposed = false;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const baselineIds = computed(() => assigned.value.map((item) => item.id));
  const selected = computed(() => selectedIds.value.map((id) => known.value.find((item) => item.id === id)).filter((item): item is PermissionResponse => !!item));
  const added = computed(() => selected.value.filter((item) => !baselineIds.value.includes(item.id)));
  const removed = computed(() => assigned.value.filter((item) => !selectedIds.value.includes(item.id)));
  const visibleCatalog = computed(() => catalog.value);
  const domainOptions = computed(() => [...new Set(resources.value.map((item) => item.domainCode))].sort()
    .map((value) => ({ value, label: value })));
  const resourceOptions = computed(() => resources.value.filter((item) => item.domainCode === domainCode.value)
    .map((item) => ({ value: item.id, label: item.name })));
  const hasCatalogScope = computed(() => !!resourceId.value || !!searchQuery.value.trim());
  const groupedCatalog = computed(() => {
    const domains = new Map<string, Map<string, PermissionResponse[]>>();
    for (const item of visibleCatalog.value) {
      let resources = domains.get(item.domainCode);
      if (!resources) { resources = new Map(); domains.set(item.domainCode, resources); }
      const key = `${item.resourceId}:${item.resourceName}`;
      const permissions = resources.get(key) ?? [];
      permissions.push(item);
      resources.set(key, permissions);
    }
    return [...domains].map(([domain, resources]) => ({ domain, resources: [...resources].map(([key, permissions]) => ({
      id: key, name: permissions[0]!.resourceName, permissions,
    })) }));
  });
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
  const invalidSelection = computed(() => selected.value.some((item) => !item.enabled));
  const canReview = computed(() => opened.value && !loading.value && !catalogLoading.value && !saving.value && !catalogError.value
    && stage.value === 'select' && selectedIds.value.length <= 200 && !invalidSelection.value
    && (added.value.length > 0 || removed.value.length > 0));

  function remember(items: PermissionResponse[]): void {
    const byId = new Map(known.value.map((item) => [item.id, item]));
    for (const item of items) byId.set(item.id, item);
    known.value = [...byId.values()];
  }

  async function readCurrent(role: RoleResponse, preserveUnknown = false): Promise<void> {
    const current = ++sequence;
    ++pageSequence;
    controller?.abort();
    pageController?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = undefined;
    catalogError.value = undefined;
    catalog.value = [];
    assigned.value = [];
    selectedIds.value = [];
    try {
      const [freshRole, relations, resourcePages] = await Promise.all([
        getRole(role.id, controller.signal), getRolePermissions(role.id, controller.signal),
        loadResourceCatalog(controller.signal),
      ]);
      if (disposed || current !== sequence) return;
      target.value = freshRole;
      assigned.value = relations;
      selectedIds.value = relations.map((item) => item.id);
      known.value = [];
      remember(relations);
      resources.value = resourcePages;
      pageNo.value = 1;
      total.value = 0;
      stage.value = 'select';
      if (preserveUnknown) notice.value = { key: 'iam.grants.reconciled' };
    } catch (cause) {
      if (disposed || current !== sequence) return;
      error.value = feedback(cause);
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  async function openFor(role: RoleResponse): Promise<void> {
    if (saving.value) return;
    if (!hasAuthorities(['auth:role:read', 'auth:role:write', 'auth:permission:read'])) {
      error.value = { key: 'iam.grants.forbidden' };
      return;
    }
    // 上次写入结果未知时只能回到原目标核对，不允许切换目标后直接重发。
    if (stage.value === 'unknown' && target.value) {
      opened.value = true;
      return;
    }
    opened.value = true;
    target.value = role;
    stage.value = 'select';
    notice.value = undefined;
    searchQuery.value = '';
    domainCode.value = '';
    resourceId.value = '';
    await readCurrent(role);
  }

  function close(): void {
    if (saving.value) return;
    opened.value = false;
    ++sequence;
    ++pageSequence;
    controller?.abort();
    pageController?.abort();
    if (searchTimer) clearTimeout(searchTimer);
  }

  async function loadResourceCatalog(signal: AbortSignal): Promise<PermissionResourceResponse[]> {
    const all: PermissionResourceResponse[] = [];
    let page = 1;
    while (true) {
      const result = await searchResources(page, 100, {}, signal);
      all.push(...result.records);
      if (all.length >= result.total || !result.records.length) return all;
      page += 1;
    }
  }

  function setDomain(value: string): Promise<void> {
    domainCode.value = value;
    resourceId.value = '';
    return loadCatalog(1);
  }

  function setResource(value: string): Promise<void> {
    resourceId.value = value;
    return loadCatalog(1);
  }

  async function loadCatalog(nextPage: number): Promise<void> {
    if (!opened.value || loading.value || saving.value || nextPage < 1 || (nextPage > 1 && nextPage > pageCount.value)) return;
    const current = ++pageSequence;
    pageController?.abort();
    pageController = new AbortController();
    catalogLoading.value = true;
    catalogError.value = undefined;
    if (!hasCatalogScope.value) {
      catalog.value = [];
      total.value = 0;
      pageNo.value = 1;
      catalogLoading.value = false;
      return;
    }
    try {
      const result = await searchPermissions(nextPage, pageSize, pageController.signal, {
        domainCode: domainCode.value || undefined,
        resourceId: resourceId.value || undefined,
        keyword: searchQuery.value.trim() || undefined,
      });
      if (disposed || current !== pageSequence || !opened.value) return;
      catalog.value = result.records;
      remember(result.records);
      pageNo.value = result.pageNo;
      total.value = result.total;
    } catch (cause) {
      if (disposed || current !== pageSequence || !opened.value) return;
      catalogError.value = feedback(cause);
    } finally {
      if (current === pageSequence) catalogLoading.value = false;
    }
  }

  watch(searchQuery, () => {
    if (searchTimer) clearTimeout(searchTimer);
    if (opened.value && !loading.value) searchTimer = setTimeout(() => void loadCatalog(1), 300);
  });

  function toggle(item: PermissionResponse): void {
    if (loading.value || catalogLoading.value || saving.value || stage.value !== 'select') return;
    error.value = undefined;
    const exists = selectedIds.value.includes(item.id);
    if (exists) selectedIds.value = selectedIds.value.filter((id) => id !== item.id);
    else if (!item.enabled) error.value = { key: 'iam.grants.disabled' };
    else if (selectedIds.value.length >= 200) error.value = { key: 'iam.grants.limit' };
    else selectedIds.value = [...selectedIds.value, item.id];
  }

  async function checkFresh(): Promise<boolean> {
    if (!target.value) return false;
    const roleId = target.value.id;
    const current = sequence;
    loading.value = true;
    error.value = undefined;
    try {
      const [freshRole, latest] = await Promise.all([getRole(roleId), getRolePermissions(roleId)]);
      if (disposed || !opened.value || sequence !== current || target.value?.id !== roleId) return false;
      target.value = freshRole;
      if (!sameIds(baselineIds.value, latest.map((item) => item.id))) {
        stage.value = 'stale';
        error.value = { key: 'iam.grants.stale' };
        return false;
      }
      return true;
    } catch (cause) {
      if (!disposed && sequence === current && target.value?.id === roleId) error.value = feedback(cause);
      return false;
    } finally {
      if (sequence === current) loading.value = false;
    }
  }

  async function review(): Promise<void> {
    if (!canReview.value) return;
    if (await checkFresh()) stage.value = 'review';
  }

  function back(): void {
    if (!saving.value && stage.value === 'review') stage.value = 'select';
  }

  async function submit(): Promise<boolean> {
    if (stage.value !== 'review' || loading.value || saving.value || !target.value) return false;
    if (!hasAuthorities(['auth:role:read', 'auth:role:write', 'auth:permission:read'])) {
      error.value = { key: 'iam.grants.forbidden' }; return false;
    }
    if (selectedIds.value.length > 200 || invalidSelection.value) {
      error.value = { key: selectedIds.value.length > 200 ? 'iam.grants.limit' : 'iam.grants.disabled' }; return false;
    }
    const fresh = await checkFresh();
    if (!fresh || !target.value || !opened.value) return false;
    saving.value = true;
    error.value = undefined;
    try {
      await replaceRolePermissions(target.value.id, selectedIds.value);
      if (disposed) return false;
      stage.value = 'select';
      saving.value = false;
      close();
      return true;
    } catch (cause) {
      if (disposed) return false;
      error.value = feedback(cause, true);
      if (error.value.key === 'iam.grants.unknownWrite') stage.value = 'unknown';
      else if (error.value.key === 'iam.grants.disabled' || error.value.key === 'iam.grants.notFound'
        || error.value.key === 'iam.grants.conflict') stage.value = 'stale';
      return false;
    } finally {
      saving.value = false;
    }
  }

  onScopeDispose(() => { disposed = true; controller?.abort(); pageController?.abort(); if (searchTimer) clearTimeout(searchTimer); });
  return { opened, target, assigned, selectedIds, selected, catalog, visibleCatalog, groupedCatalog, resources, domainCode, resourceId,
    domainOptions, resourceOptions, hasCatalogScope, setDomain, setResource, pageNo, pageCount, total, searchQuery,
    loading, catalogLoading, saving, stage, error, catalogError, notice, added, removed, invalidSelection, canReview,
    openFor, close, loadCatalog, toggle, review, back, submit, reconcile: () => target.value && readCurrent(target.value, stage.value === 'unknown') };
}
