import { onBeforeUnmount, ref, type Ref } from 'vue';
import { systemFeedback, type SystemFeedback } from './system-feedback';

/** System 管理端完整列表的读取生命周期；取消旧请求，避免切换主项后的响应乱序覆盖。 */
export function useSystemList<T>(read: (signal: AbortSignal) => Promise<T[]>) {
  const rows = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<SystemFeedback | null>(null);
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
      error.value = systemFeedback(cause);
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
