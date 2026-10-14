import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import MomCrudRowMenu from './MomCrudRowMenu.vue';
import MomModal from './MomModal.vue';

it('菜单打开弹窗后关闭，焦点回到持久存在的行菜单按钮', async () => {
  const Scene = defineComponent({
    components: { MomCrudRowMenu, MomModal },
    setup: () => ({ open: ref(false) }),
    template: `<MomCrudRowMenu label="更多" :actions="[{key:'edit',label:'编辑'}]" @select="open=true" />
      <MomModal :open="open" title="编辑" close-label="关闭" @close="open=false">内容</MomModal>`,
  });
  const wrapper = mount(Scene, { attachTo: document.body });
  const trigger = wrapper.get('button');
  await trigger.trigger('keydown', { key: 'Enter' });
  await flushPromises();
  const item = document.querySelector<HTMLElement>('[role="menuitem"]');
  expect(item).not.toBeNull();
  item?.click();
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
  document.querySelector<HTMLElement>('[aria-label="关闭"]')?.click();
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger.element));
  wrapper.unmount();
});
