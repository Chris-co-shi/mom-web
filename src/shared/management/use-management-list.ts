import { onBeforeUnmount, ref, type Ref } from 'vue';
import { managementFeedback, type ManagementFeedback } from './management-feedback';

/** 完整列表的读取生命周期；取消旧请求并防止响应乱序覆盖。 */
export function useManagementList<T>(read: (signal: AbortSignal) => Promise<T[]>) {
  const rows = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<ManagementFeedback | null>(null);
  let requestId = 0;
  let controller: AbortController | null = null;

  async function reload(): Promise<boolean> {
    controller?.abort();
    const current = ++requestId;
    controller = new AbortController();
    loading.value = true;
    error.value = null;
    try {
      const result = await read(controller.signal);
      if (current !== requestId) return false;
      rows.value = result;
      return true;
    } catch (cause) {
      if (current !== requestId) return false;
      rows.value = [];
      error.value = managementFeedback(cause);
      return false;
    } finally {
      if (current === requestId) loading.value = false;
    }
  }
  function clear(): void {
    controller?.abort();
    requestId++;
    rows.value = [];
    error.value = null;
    loading.value = false;
  }
  onBeforeUnmount(clear);
  return { rows, loading, error, reload, clear };
}
