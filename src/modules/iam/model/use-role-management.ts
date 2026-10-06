import { computed, onScopeDispose, reactive, ref } from 'vue';
import { isApiError } from '../../../shared/api/errors';
import { hasAuthority } from '../../auth';
import * as api from '../api/roles-api';
import { roleFeedback, type RoleFeedback } from './role-feedback';

export type RoleAction = 'detail' | 'create' | 'edit' | 'status' | 'delete';

/** 角色目录的局部用例状态；写请求不自动重放，冲突或未知结果须人工核对。 */
export function useRoleManagement() {
  const rows = ref<api.RoleResponse[]>([]);
  const pageNo = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);
  const listError = ref<RoleFeedback>();
  const writeError = ref<RoleFeedback>();
  const notice = ref<RoleFeedback>();
  const action = ref<RoleAction>();
  const target = ref<api.RoleResponse>();
  const detailLoading = ref(false);
  const saving = ref(false);
  const dialogError = ref<RoleFeedback>();
  const blocked = ref(false);
  const form = reactive({ code: '', name: '', description: '' });
  const fieldErrors = ref<Partial<Record<keyof typeof form, RoleFeedback['key']>>>({});
  let listController: AbortController | undefined;
  let detailController: AbortController | undefined;
  let listSequence = 0;
  let detailSequence = 0;
  let disposed = false;

  const canSubmit = computed(() => !!action.value && action.value !== 'detail' && !saving.value
    && !detailLoading.value && !blocked.value && !writeError.value && (action.value === 'create' || !!target.value));

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
      const result = await api.searchRoles(nextPage, nextSize, listController.signal);
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
      listError.value = roleFeedback(error);
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
      const role = await api.getRole(id, detailController.signal);
      if (disposed || sequence !== detailSequence) return;
      target.value = role;
      if (!keepDraft) Object.assign(form, { code: role.code, name: role.name, description: role.description ?? '' });
      blocked.value = false;
    } catch (error) {
      if (disposed || sequence !== detailSequence) return;
      dialogError.value = roleFeedback(error);
    } finally {
      if (sequence === detailSequence) detailLoading.value = false;
    }
  }

  async function open(next: RoleAction, role?: api.RoleResponse): Promise<void> {
    if (saving.value) return;
    if (next !== 'detail' && writeError.value) return;
    if (next !== 'detail' && !hasAuthority('auth:role:write')) {
      notice.value = { key: 'iam.roles.forbidden' };
      return;
    }
    ++detailSequence;
    detailController?.abort();
    action.value = next;
    target.value = role;
    dialogError.value = undefined;
    notice.value = undefined;
    fieldErrors.value = {};
    blocked.value = false;
    detailLoading.value = false;
    Object.assign(form, { code: '', name: '', description: '' });
    if (role) await readTarget(role.id);
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
    if (action.value === 'create' && (!form.code.trim() || form.code.length > 100)) fieldErrors.value.code = 'iam.roles.invalidCode';
    if ((action.value === 'create' || action.value === 'edit') && (!form.name.trim() || form.name.length > 200)) fieldErrors.value.name = 'iam.roles.invalidName';
    if (form.description.length > 1000) fieldErrors.value.description = 'iam.roles.invalidDescription';
    return Object.keys(fieldErrors.value).length === 0;
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    if (!hasAuthority('auth:role:write')) { dialogError.value = { key: 'iam.roles.forbidden' }; return; }
    if (!validate()) return;
    const currentAction = action.value;
    const role = target.value;
    saving.value = true;
    dialogError.value = undefined;
    try {
      if (currentAction === 'create') {
        await api.createRole({ code: form.code, name: form.name, description: form.description || null, enabled: true });
      } else if (role) {
        if (currentAction === 'edit') await api.updateRole(role.id, { name: form.name, description: form.description || null, enabled: role.enabled, version: role.version });
        else if (currentAction === 'status') await api.setRoleEnabled(role.id, !role.enabled, role.version);
        else if (currentAction === 'delete') await api.deleteRole(role.id);
      }
      if (disposed) return;
      action.value = undefined;
      target.value = undefined;
      notice.value = { key: 'iam.roles.saved' };
      // 写入已成功，后续列表读取失败也不得重新发起写请求。
      await loadPage(currentAction === 'create' ? 1 : pageNo.value);
    } catch (error) {
      if (disposed) return;
      dialogError.value = roleFeedback(error, true);
      blocked.value = dialogError.value.key === 'iam.roles.unknownWrite'
        || dialogError.value.key === 'iam.roles.conflict' || dialogError.value.key === 'iam.roles.notFound';
      if (dialogError.value.key === 'iam.roles.unknownWrite') writeError.value = dialogError.value;
      if (isApiError(error)) {
        for (const field of error.fieldErrors) {
          if (field.field === 'code' || field.field === 'name' || field.field === 'description') fieldErrors.value[field.field] = 'iam.roles.invalidField';
        }
      }
    } finally {
      saving.value = false;
    }
  }

  onScopeDispose(() => { disposed = true; listController?.abort(); detailController?.abort(); });
  return { rows, pageNo, pageSize, total, loading, listError, writeError, notice, action, target, detailLoading, saving,
    dialogError, blocked, form, fieldErrors, canSubmit, loadPage, open, close, reloadTarget, submit };
}
