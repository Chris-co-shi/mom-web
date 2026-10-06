import { computed, onScopeDispose, reactive, ref } from 'vue';
import { isApiError } from '../../../shared/api/errors';
import { hasAuthority } from '../../auth';
import * as api from '../api/permissions-api';
import * as resourceApi from '../api/permission-resources-api';
import { permissionFeedback, type PermissionFeedback } from './permission-feedback';

export type PermissionAction = 'detail' | 'create' | 'edit' | 'status' | 'delete';

/** 权限目录的局部用例状态；写请求不自动重放，冲突或未知结果须人工核对。 */
export function usePermissionManagement(fixedResource?: resourceApi.PermissionResourceResponse) {
  const rows = ref<api.PermissionResponse[]>([]);
  const pageNo = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);
  const listError = ref<PermissionFeedback>();
  const writeError = ref<PermissionFeedback>();
  const notice = ref<PermissionFeedback>();
  const action = ref<PermissionAction>();
  const target = ref<api.PermissionResponse>();
  const detailLoading = ref(false);
  const saving = ref(false);
  const dialogError = ref<PermissionFeedback>();
  const blocked = ref(false);
  const form = reactive({ resourceId: '', actionCode: '', name: '', description: '' });
  const filters = reactive({ domainCode: fixedResource?.domainCode ?? '', resourceId: fixedResource?.id ?? '', keyword: '', enabled: '' });
  const resources = ref<resourceApi.PermissionResourceResponse[]>(fixedResource ? [fixedResource] : []);
  const resourceError = ref<PermissionFeedback>();
  const fieldErrors = ref<Partial<Record<keyof typeof form, PermissionFeedback['key']>>>({});
  let listController: AbortController | undefined;
  let detailController: AbortController | undefined;
  let listSequence = 0;
  let detailSequence = 0;
  let disposed = false;

  const canSubmit = computed(() => !!action.value && action.value !== 'detail' && !saving.value
    && !detailLoading.value && !blocked.value && !writeError.value && (action.value === 'create' || !!target.value));

  async function loadResources(): Promise<void> {
    if (fixedResource) { resources.value = [fixedResource]; return; }
    resourceError.value = undefined;
    const result: resourceApi.PermissionResourceResponse[] = [];
    let current = 1;
    try {
      while (!disposed) {
        const page = await resourceApi.searchResources(current, 100);
        result.push(...page.records);
        if (current >= page.totalPages) break;
        current += 1;
      }
      if (!disposed) resources.value = result;
    } catch (error) {
      resourceError.value = permissionFeedback(error);
      throw error;
    }
  }

  function setFilters(next: Partial<typeof filters>): void {
    if (fixedResource && (next.domainCode !== undefined || next.resourceId !== undefined)) return;
    Object.assign(filters, next);
    if (next.domainCode !== undefined) filters.resourceId = '';
    void loadPage(1);
  }

  async function loadPage(nextPage = pageNo.value, nextSize = pageSize.value): Promise<void> {
    const sequence = ++listSequence;
    listController?.abort();
    listController = new AbortController();
    loading.value = true;
    listError.value = undefined;
    pageNo.value = nextPage;
    pageSize.value = nextSize;
    rows.value = [];
    try {
      const result = await api.searchPermissions(nextPage, nextSize, listController.signal, {
        domainCode: filters.domainCode || undefined,
        resourceId: filters.resourceId || undefined,
        keyword: filters.keyword.trim() || undefined,
        enabled: filters.enabled === '' ? undefined : filters.enabled === 'true',
      });
      if (disposed || sequence !== listSequence) return;
      if (nextPage > 1 && result.records.length === 0) {
        await loadPage(Math.max(1, Math.min(nextPage - 1, result.totalPages)), nextSize);
        return;
      }
      rows.value = result.records;
      total.value = result.total;
      pageNo.value = result.pageNo;
      writeError.value = undefined;
    } catch (error) {
      if (disposed || sequence !== listSequence) return;
      listError.value = permissionFeedback(error);
    } finally {
      if (sequence === listSequence) loading.value = false;
    }
  }

  async function readTarget(id: string, keepDraft = false): Promise<void> {
    const sequence = ++detailSequence;
    detailController?.abort();
    detailController = new AbortController();
    detailLoading.value = true;
    blocked.value = true;
    dialogError.value = undefined;
    try {
      const permission = await api.getPermission(id, detailController.signal);
      if (disposed || sequence !== detailSequence) return;
      target.value = permission;
      if (!keepDraft) Object.assign(form, { resourceId: permission.resourceId, actionCode: permission.actionCode, name: permission.name, description: permission.description ?? '' });
      blocked.value = false;
    } catch (error) {
      if (disposed || sequence !== detailSequence) return;
      dialogError.value = permissionFeedback(error);
    } finally {
      if (sequence === detailSequence) detailLoading.value = false;
    }
  }

  async function open(next: PermissionAction, permission?: api.PermissionResponse): Promise<void> {
    if (saving.value) return;
    if (next !== 'detail' && writeError.value) return;
    if (next !== 'detail' && !hasAuthority('auth:permission:write')) {
      notice.value = { key: 'iam.permissions.forbidden' };
      return;
    }
    ++detailSequence;
    detailController?.abort();
    action.value = next;
    target.value = permission;
    dialogError.value = undefined;
    notice.value = undefined;
    fieldErrors.value = {};
    blocked.value = false;
    detailLoading.value = false;
    Object.assign(form, { resourceId: fixedResource?.id ?? '', actionCode: '', name: '', description: '' });
    if (next === 'create') void loadResources().catch((error) => { dialogError.value = permissionFeedback(error); blocked.value = true; });
    if (permission) await readTarget(permission.id);
  }

  function close(): void {
    if (saving.value) return;
    ++detailSequence;
    detailController?.abort();
    action.value = undefined;
    target.value = undefined;
  }

  async function reloadTarget(): Promise<void> {
    if (target.value && !saving.value) await readTarget(target.value.id, true);
  }

  function validate(): boolean {
    fieldErrors.value = {};
    if (action.value === 'create' && !form.resourceId) fieldErrors.value.resourceId = 'iam.permissions.invalidResource';
    if (action.value === 'create' && (!/^[A-Z][A-Z0-9_-]*$/.test(form.actionCode) || form.actionCode.length > 60)) fieldErrors.value.actionCode = 'iam.permissions.invalidAction';
    if ((action.value === 'create' || action.value === 'edit') && (!form.name.trim() || form.name.length > 200)) fieldErrors.value.name = 'iam.permissions.invalidName';
    if (form.description.length > 1000) fieldErrors.value.description = 'iam.permissions.invalidDescription';
    return Object.keys(fieldErrors.value).length === 0;
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    if (!hasAuthority('auth:permission:write')) { dialogError.value = { key: 'iam.permissions.forbidden' }; return; }
    if (!validate()) return;
    const currentAction = action.value;
    const permission = target.value;
    saving.value = true;
    dialogError.value = undefined;
    try {
      if (currentAction === 'create') {
        await api.createPermission({ resourceId: form.resourceId, actionCode: form.actionCode, name: form.name, description: form.description || null, enabled: true });
      } else if (permission) {
        if (currentAction === 'edit') await api.updatePermission(permission.id, { name: form.name, description: form.description || null, enabled: permission.enabled, version: permission.version });
        else if (currentAction === 'status') await api.setPermissionEnabled(permission.id, !permission.enabled, permission.version);
        else if (currentAction === 'delete') await api.deletePermission(permission.id);
      }
      if (disposed) return;
      action.value = undefined;
      target.value = undefined;
      notice.value = { key: 'iam.permissions.saved' };
      // 写入已成功，后续列表读取失败也不得重新发起写请求。
      await loadPage(currentAction === 'create' ? 1 : pageNo.value);
    } catch (error) {
      if (disposed) return;
      dialogError.value = permissionFeedback(error, true);
      blocked.value = dialogError.value.key === 'iam.permissions.unknownWrite'
        || dialogError.value.key === 'iam.permissions.conflict' || dialogError.value.key === 'iam.permissions.notFound';
      if (dialogError.value.key === 'iam.permissions.unknownWrite') writeError.value = dialogError.value;
      if (isApiError(error)) {
        for (const field of error.fieldErrors) {
          if (field.field === 'resourceId' || field.field === 'actionCode' || field.field === 'name' || field.field === 'description') fieldErrors.value[field.field] = 'iam.permissions.invalidField';
        }
      }
    } finally {
      saving.value = false;
    }
  }

  onScopeDispose(() => { disposed = true; listController?.abort(); detailController?.abort(); });
  return { rows, pageNo, pageSize, total, loading, listError, writeError, notice, action, target, detailLoading, saving,
    dialogError, blocked, form, filters, resources, resourceError, fieldErrors, canSubmit, loadPage, loadResources, setFilters, open, close, reloadTarget, submit };
}
