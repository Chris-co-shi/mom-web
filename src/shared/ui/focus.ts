import { nextTick } from 'vue';

/** 等待条件面板渲染，只聚焦仍在文档中且可见的目标。 */
export async function focusAfterRender(root: Element | null, selector: string): Promise<void> {
  await nextTick();
  if (!root?.isConnected) return;
  const target = [...root.querySelectorAll<HTMLElement>(selector)]
    .find(node => node.getClientRects().length > 0 && !node.matches(':disabled'));
  target?.focus();
}

/** 不参与业务校验或写入，只在页面完成提交处理后定位已有错误。 */
export async function submitWithFocus(event: Event, submit: () => void | Promise<void>): Promise<void> {
  const form = event.currentTarget as HTMLElement;
  await submit();
  await focusAfterRender(form, '[aria-invalid="true"], [role="alert"][tabindex="-1"]');
}
