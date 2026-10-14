import { computed, onScopeDispose, ref } from 'vue';
import { hasAuthorities } from '../../auth';
import type { UserResponse } from '../api/users-api';
import { getUserRoles, replaceUserRoles } from '../api/users-api';
import { searchRoles, type RoleResponse } from '../api/roles-api';
import { userFeedback, type UserFeedback } from './user-feedback';

export type UserRoleAssignmentStage = 'select' | 'unknown';
const PAGE_SIZE = 50;

/** 用户角色整体替换状态；跨页保留草稿，未知写入必须重读后才能继续。 */
export function useUserRoleAssignment() {
  const opened = ref(false);
  const target = ref<UserResponse>();
  const roles = ref<RoleResponse[]>([]);
  const assigned = ref<RoleResponse[]>([]);
  const selectedIds = ref<string[]>([]);
  const pageNo = ref(1);
  const total = ref(0);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<UserFeedback>();
  const notice = ref<UserFeedback>();
  const stage = ref<UserRoleAssignmentStage>('select');
  const known = ref<RoleResponse[]>([]);
  const relationshipsLoaded = ref(false);
  let controller: AbortController | undefined;
  let sequence = 0;
  let disposed = false;

  const selectedRoles = computed(() => selectedIds.value
    .map((id) => known.value.find((role) => role.id === id))
    .filter((role): role is RoleResponse => !!role));
  const removedDisabledRoles = computed(() => selectedRoles.value.some((role) => !role.enabled));
  const changed = computed(() => {
    const before = assigned.value.map((role) => role.id).sort();
    const after = [...selectedIds.value].sort();
    return before.length !== after.length || before.some((id, index) => id !== after[index]);
  });
  const canSubmit = computed(() => opened.value && stage.value === 'select' && !loading.value && !saving.value
    && relationshipsLoaded.value && !error.value && changed.value && selectedIds.value.length <= 200 && !removedDisabledRoles.value);

  function remember(items: RoleResponse[]): void {
    const byId = new Map(known.value.map((role) => [role.id, role]));
    for (const role of items) byId.set(role.id, role);
    known.value = [...byId.values()];
  }

  async function loadPage(nextPage = pageNo.value): Promise<void> {
    const current = ++sequence;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = undefined;
    try {
      const result = await searchRoles(nextPage, PAGE_SIZE, controller.signal);
      if (disposed || current !== sequence) return;
      roles.value = result.records;
      remember(result.records);
      pageNo.value = result.pageNo;
      total.value = result.total;
    } catch (cause) {
      if (disposed || current !== sequence) return;
      error.value = userFeedback(cause);
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  async function openFor(user: UserResponse): Promise<void> {
    if (saving.value) return;
    if (!hasAuthorities(['auth:user:read', 'auth:user:write', 'auth:role:read'])) {
      error.value = { key: 'iam.users.forbidden' };
      return;
    }
    opened.value = true;
    target.value = user;
    roles.value = [];
    assigned.value = [];
    selectedIds.value = [];
    known.value = [];
    relationshipsLoaded.value = false;
    pageNo.value = 1;
    total.value = 0;
    stage.value = 'select';
    notice.value = undefined;
    error.value = undefined;
    loading.value = true;
    const current = ++sequence;
    controller?.abort();
    controller = new AbortController();
    try {
      const [currentRoles, page] = await Promise.all([
        getUserRoles(user.id, controller.signal), searchRoles(1, PAGE_SIZE, controller.signal),
      ]);
      if (disposed || current !== sequence) return;
      assigned.value = currentRoles;
      selectedIds.value = currentRoles.map((role) => role.id);
      relationshipsLoaded.value = true;
      remember([...currentRoles, ...page.records]);
      roles.value = page.records;
      pageNo.value = page.pageNo;
      total.value = page.total;
    } catch (cause) {
      if (disposed || current !== sequence) return;
      error.value = userFeedback(cause);
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  function toggle(role: RoleResponse): void {
    if (loading.value || saving.value || stage.value !== 'select') return;
    const selected = selectedIds.value.includes(role.id);
    if (!selected && !role.enabled) return;
    selectedIds.value = selected
      ? selectedIds.value.filter((id) => id !== role.id)
      : [...selectedIds.value, role.id];
    remember([role]);
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value || !target.value) return;
    saving.value = true;
    error.value = undefined;
    notice.value = undefined;
    try {
      const result = await replaceUserRoles(target.value.id, [...selectedIds.value]);
      if (disposed) return;
      assigned.value = result;
      selectedIds.value = result.map((role) => role.id);
      remember(result);
      opened.value = false;
      notice.value = { key: 'iam.users.saved' };
    } catch (cause) {
      if (disposed) return;
      error.value = userFeedback(cause, true);
      if (error.value.key === 'iam.users.unknownWrite') stage.value = 'unknown';
    } finally {
      saving.value = false;
    }
  }

  async function reloadLatest(): Promise<void> {
    if (!target.value || saving.value) return;
    await openFor(target.value);
  }

  async function retry(): Promise<void> {
    if (relationshipsLoaded.value) await loadPage(pageNo.value);
    else await reloadLatest();
  }

  function close(): void {
    if (saving.value) return;
    opened.value = false;
    target.value = undefined;
    ++sequence;
    controller?.abort();
  }

  onScopeDispose(() => { disposed = true; ++sequence; controller?.abort(); });
  return { opened, target, roles, selectedRoles, selectedIds, pageNo, total, loading, saving, error, notice, stage,
    changed, removedDisabledRoles, relationshipsLoaded, canSubmit, loadPage, openFor, toggle, submit, reloadLatest, retry, close };
}
