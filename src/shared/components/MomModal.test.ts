import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MomModal from './MomModal.vue';

describe('MomModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('未提供说明时显式取消 aria-describedby，避免生成失效引用', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mount(MomModal, {
      attachTo: document.body,
      props: {
        open: true,
        title: '用户详情',
        closeLabel: '关闭',
      },
      slots: {
        default: '<p>弹窗正文</p>',
      },
    });

    await Promise.resolve();

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute('aria-describedby')).toBe(false);
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Missing `Description`'));
  });
});
