import { computed, onScopeDispose, reactive, ref } from 'vue';
import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';
import { hasAuthority } from '../../auth';
import * as api from '../api/factory-api';

export type PlantAction = 'detail' | 'create' | 'edit' | 'status';
export interface PlantFeedback { key: MessageKey; correlationId?: string }

/** 稳定机器码驱动反馈；结果未知和版本冲突禁止盲目重试。 */
function feedback(error: unknown, writing = false): PlantFeedback {
  if (!isApiError(error)) return { key: writing ? 'mdm.plants.unknownWrite' : 'mdm.plants.loadFailed' };
  let key: MessageKey = 'mdm.plants.loadFailed';
  if (writing && (error.resultUnknown || ['network', 'timeout', 'server', 'protocol'].includes(error.kind))) {
    key = 'mdm.plants.unknownWrite';
  } else if (error.code === 'mdm.code_conflict') key = 'mdm.plants.codeConflict';
  else if (error.code === 'mdm.version_conflict' || error.kind === 'conflict') key = 'mdm.plants.versionConflict';
  else if (error.kind === 'not_found') key = 'mdm.plants.notFound';
  else if (error.kind === 'forbidden') key = 'mdm.plants.forbidden';
  else if (error.kind === 'validation') key = 'mdm.plants.validation';
  return { key, correlationId: error.correlationId };
}

/** Plant 页仅维护自己的表格、弹窗和请求生命周期；不进入 Pinia 或全局共享 CRUD。 */
export function usePlantManagement() {
  const rows = ref<api.PlantView[]>([]);
  const pageNo = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const loading = ref(false);
  const saving = ref(false);
  const detailLoading = ref(false);
  const listError = ref<PlantFeedback>();
  const dialogError = ref<PlantFeedback>();
  const notice = ref<PlantFeedback>();
  const blocked = ref(false);
  const action = ref<PlantAction>();
  const target = ref<api.PlantView>();
  const form = reactive<{ code: string; name: string; timeZoneId: string; status: api.MasterStatus }>({
    code: '', name: '', timeZoneId: '', status: 'ENABLED',
  });
  const fieldError = ref(false);
  let listController: AbortController | undefined;
  let detailController: AbortController | undefined;
  let listSequence = 0;
  let detailSequence = 0;
  let disposed = false;

  const canSubmit = computed(() => !!action.value && action.value !== 'detail' &&
    !saving.value && !detailLoading.value && !blocked.value &&
    (action.value === 'create' || !!target.value));

  async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
    const sequence = ++listSequence;
    listController?.abort();
    listController = new AbortController();
    loading.value = true;
    listError.value = undefined;
    pageNo.value = next;
    pageSize.value = size;
    rows.value = []; // 防止把旧页数据显示为本次请求结果
    try {
      const page = await api.searchPlants(next, size, listController.signal);
      if (disposed || sequence !== listSequence) return;
      if (next > 1 && page.records.length === 0) {
        await loadPage(Math.max(1, next - 1), size);
        return;
      }
      rows.value = page.records;
      pageNo.value = page.pageNo;
      total.value = page.total;
    } catch (error) {
      if (disposed || sequence !== listSequence) return;
      listError.value = feedback(error);
    } finally {
      if (sequence === listSequence) loading.value = false;
    }
  }

  async function readTarget(id: string, preserveDraft = false): Promise<void> {
    const sequence = ++detailSequence;
    detailController?.abort();
    detailController = new AbortController();
    detailLoading.value = true;
    blocked.value = true;
    dialogError.value = undefined;
    try {
      const current = await api.getPlant(id, detailController.signal);
      if (disposed || sequence !== detailSequence) return;
      target.value = current;
      if (!preserveDraft) {
        form.code = current.code;
        form.name = current.name;
        form.timeZoneId = current.timeZoneId ?? '';
        form.status = current.status;
      }
      blocked.value = false;
    } catch (error) {
      if (disposed || sequence !== detailSequence) return;
      dialogError.value = feedback(error);
    } finally {
      if (sequence === detailSequence) detailLoading.value = false;
    }
  }

  async function open(next: PlantAction, row?: api.PlantView): Promise<void> {
    if (saving.value) return;
    if (next !== 'detail' && !hasAuthority('mdm:factory:write')) {
      notice.value = { key: 'mdm.plants.forbidden' };
      return;
    }
    detailController?.abort();
    ++detailSequence;
    action.value = next;
    target.value = row;
    dialogError.value = undefined;
    notice.value = undefined;
    blocked.value = false;
    fieldError.value = false;
    Object.assign(form, { code: row?.code ?? '', name: row?.name ?? '',
      timeZoneId: row?.timeZoneId ?? '', status: row?.status ?? 'ENABLED' });
    if (row) await readTarget(row.id);
  }

  function close(): void {
    if (saving.value) return;
    ++detailSequence;
    detailController?.abort();
    action.value = undefined;
    target.value = undefined;
    dialogError.value = undefined;
  }

  async function reloadTarget(): Promise<void> {
    if (target.value && !saving.value) await readTarget(target.value.id, true);
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value || !action.value || !hasAuthority('mdm:factory:write')) return;
    const next = action.value;
    const current = target.value;
    if (next === 'create' || next === 'edit') {
      fieldError.value = !form.name.trim() || form.name.length > 200 ||
        (next === 'create' && (!form.code.trim() || form.code.length > 64)) ||
        (next === 'create' && !form.timeZoneId.trim()) || form.timeZoneId.length > 64;
      if (fieldError.value) return;
    }
    saving.value = true;
    dialogError.value = undefined;
    try {
      if (next === 'create') await api.createPlant({ code: form.code, name: form.name,
        timeZoneId: form.timeZoneId.trim(), status: form.status });
      else if (current && next === 'edit') await api.updatePlant(current.id, { name: form.name,
        timeZoneId: form.timeZoneId.trim() || null, version: current.version });
      else if (current && next === 'status') await api.setPlantEnabled(current.id, current.status !== 'ENABLED', current.version);
      if (disposed) return;
      action.value = undefined;
      target.value = undefined;
      notice.value = { key: 'mdm.plants.saved' };
      // HTTP 写成功与随后的列表查询失败是不同结果；不重复发起写入。
      await loadPage(next === 'create' ? 1 : pageNo.value);
    } catch (error) {
      if (disposed) return;
      dialogError.value = feedback(error, true);
      blocked.value = isApiError(error)
        ? error.resultUnknown || ['conflict', 'not_found', 'timeout', 'network', 'server', 'protocol'].includes(error.kind)
        : true;
    } finally {
      saving.value = false;
    }
  }

  onScopeDispose(() => {
    disposed = true;
    listController?.abort();
    detailController?.abort();
  });
  return {
    rows, pageNo, pageSize, total, loading, saving, detailLoading, listError, dialogError,
    notice, blocked, action, target, form, fieldError, canSubmit, loadPage, open, close, reloadTarget, submit,
  };
}
