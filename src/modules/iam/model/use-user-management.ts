import { computed, onScopeDispose, reactive, ref } from 'vue';
import { isApiError } from '../../../shared/api/errors';
import { hasAuthority } from '../../auth';
import * as api from '../api/users-api';
import { userFeedback, type UserFeedback } from './user-feedback';

export type UserAction = 'detail' | 'create' | 'edit' | 'password' | 'delete';

/** 页面局部用例状态：查询防乱序，写入不重放，表单不进入全局状态或持久化。 */
export function useUserManagement() {
  const rows = ref<api.UserResponse[]>([]);
  const pageNo = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);
  const listError = ref<UserFeedback>();
  const statusError = ref<UserFeedback>();
  const statusBlocked = ref(false);
  const notice = ref<UserFeedback>();
  const action = ref<UserAction>();
  const target = ref<api.UserResponse>();
  const detailLoading = ref(false);
  const saving = ref(false);
  const dialogError = ref<UserFeedback>();
  const blocked = ref(false);
  const form = reactive({ username: '', displayName: '', password: '', confirmation: '' });
  const fieldErrors = ref<Partial<Record<keyof typeof form, UserFeedback['key']>>>({});
  let listController: AbortController | undefined;
  let detailController: AbortController | undefined;
  let listSequence = 0;
  let detailSequence = 0;
  let disposed = false;

  const canSubmit = computed(() => !!action.value && action.value !== 'detail' && !saving.value
    && !detailLoading.value && !blocked.value && (action.value === 'create' || !!target.value));

  function clearPasswords(): void { form.password = ''; form.confirmation = ''; }

  async function loadPage(nextPage = pageNo.value, nextSize = pageSize.value): Promise<void> {
    const sequence = ++listSequence;
    listController?.abort();
    listController = new AbortController();
    loading.value = true;
    listError.value = undefined;
    pageNo.value = nextPage;
    pageSize.value = nextSize;
    // 失败后不让旧页数据冒充本次请求结果。
    rows.value = [];
    try {
      const result = await api.searchUsers(nextPage, nextSize, listController.signal);
      if (disposed || sequence !== listSequence) return;
      if (nextPage > 1 && result.records.length === 0) {
        await loadPage(Math.max(1, Math.min(nextPage - 1, result.totalPages)), nextSize);
        return;
      }
      rows.value = result.records;
      total.value = result.total;
      pageNo.value = result.pageNo;
      statusError.value = undefined;
      statusBlocked.value = false;
    } catch (error) {
      if (disposed || sequence !== listSequence) return;
      listError.value = userFeedback(error); // search 虽是 POST，但失败提示按只读查询处理。
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
    clearPasswords();
    try {
      const user = await api.getUser(id, detailController.signal);
      if (disposed || sequence !== detailSequence) return;
      target.value = user;
      if (!keepDraft) {
        form.username = user.username;
        form.displayName = user.displayName;
      }
      blocked.value = false;
    } catch (error) {
      if (disposed || sequence !== detailSequence) return;
      dialogError.value = userFeedback(error);
    } finally {
      if (sequence === detailSequence) detailLoading.value = false;
    }
  }

  async function open(next: UserAction, user?: api.UserResponse): Promise<void> {
    if (saving.value) return;
    if (next !== 'detail' && !hasAuthority('auth:user:write')) {
      notice.value = { key: 'iam.users.forbidden' };
      return;
    }
    ++detailSequence;
    detailController?.abort();
    action.value = next;
    target.value = user;
    dialogError.value = undefined;
    notice.value = undefined;
    fieldErrors.value = {};
    blocked.value = false;
    detailLoading.value = false;
    Object.assign(form, { username: '', displayName: '', password: '', confirmation: '' });
    if (user) await readTarget(user.id);
  }

  function close(): void {
    if (saving.value) return;
    ++detailSequence;
    detailController?.abort();
    action.value = undefined;
    target.value = undefined;
    clearPasswords();
  }

  async function reloadTarget(): Promise<void> {
    if (target.value && !saving.value) await readTarget(target.value.id, true);
  }

  /** 表格状态列独立写入；失败或版本冲突不乐观翻转，结果不明时须先刷新列表核对。 */
  async function toggleEnabled(user: api.UserResponse): Promise<void> {
    if (saving.value || loading.value || statusBlocked.value) return;
    if (!hasAuthority('auth:user:write')) { statusError.value = { key: 'iam.users.forbidden' }; return; }
    saving.value = true;
    statusError.value = undefined;
    notice.value = undefined;
    try {
      const updated = await api.setUserEnabled(user.id, !user.enabled, user.version);
      if (disposed) return;
      rows.value = rows.value.map((row) => row.id === updated.id ? updated : row);
      notice.value = { key: 'iam.users.statusSaved' };
    } catch (error) {
      if (disposed) return;
      const feedback = userFeedback(error, true);
      statusError.value = { ...feedback, key: feedback.key === 'iam.users.conflict' ? 'iam.users.statusConflict'
        : feedback.key === 'iam.users.unknownWrite' ? 'iam.users.statusUnknown' : feedback.key };
      statusBlocked.value = feedback.key === 'iam.users.unknownWrite'
        || feedback.key === 'iam.users.conflict' || feedback.key === 'iam.users.notFound';
    } finally {
      saving.value = false;
    }
  }

  function validate(): boolean {
    fieldErrors.value = {};
    if (action.value === 'create' && (!form.username.trim() || form.username.length > 120)) fieldErrors.value.username = 'iam.users.invalidUsername';
    if ((action.value === 'create' || action.value === 'edit') && (!form.displayName.trim() || form.displayName.length > 200)) fieldErrors.value.displayName = 'iam.users.invalidName';
    if (action.value === 'create' || action.value === 'password') {
      if (!form.password.trim() || form.password.length < 8 || form.password.length > 128) fieldErrors.value.password = 'iam.users.invalidPassword';
      if (form.password !== form.confirmation) fieldErrors.value.confirmation = 'iam.users.passwordMismatch';
    }
    return Object.keys(fieldErrors.value).length === 0;
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    if (!hasAuthority('auth:user:write')) { dialogError.value = { key: 'iam.users.forbidden' }; return; }
    if (!validate()) return;
    const currentAction = action.value;
    const user = target.value;
    saving.value = true;
    dialogError.value = undefined;
    try {
      if (currentAction === 'create') await api.createUser({ username: form.username, displayName: form.displayName, password: form.password, enabled: true });
      else if (user) {
        if (currentAction === 'edit') await api.updateUser(user.id, { displayName: form.displayName, enabled: user.enabled, version: user.version });
        else if (currentAction === 'password') await api.resetUserPassword(user.id, form.password, user.version);
        else if (currentAction === 'delete') await api.deleteUser(user.id);
      }
      if (disposed) return;
      action.value = undefined;
      target.value = undefined;
      notice.value = { key: 'iam.users.saved' };
      // 写成功与列表刷新失败是两个结果，不能因为后者而重发写请求。
      await loadPage(currentAction === 'create' ? 1 : pageNo.value);
    } catch (error) {
      if (disposed) return;
      dialogError.value = userFeedback(error, true);
      blocked.value = dialogError.value.key === 'iam.users.unknownWrite'
        || dialogError.value.key === 'iam.users.conflict' || dialogError.value.key === 'iam.users.notFound';
      if (isApiError(error)) {
        for (const field of error.fieldErrors) {
          const name = field.field === 'newPassword' ? 'password' : field.field;
          if (name === 'username' || name === 'displayName' || name === 'password' || name === 'confirmation') fieldErrors.value[name] = 'iam.users.invalidField';
        }
      }
    } finally {
      clearPasswords();
      saving.value = false;
    }
  }

  onScopeDispose(() => { disposed = true; listController?.abort(); detailController?.abort(); clearPasswords(); });
  return { rows, pageNo, pageSize, total, loading, listError, statusError, statusBlocked, notice, action, target, detailLoading, saving,
    dialogError, blocked, form, fieldErrors, canSubmit, loadPage, open, close, reloadTarget,
    toggleEnabled, submit };
}
