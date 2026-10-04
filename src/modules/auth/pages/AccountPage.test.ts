import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { ApiError } from '../../../shared/api/errors';
import AccountPage from './AccountPage.vue';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), profile: vi.fn(), password: vi.fn() }));
vi.mock('../model/auth-session', () => ({
  useAuthSession: () => ({ user: ref({ userId: 'hidden-id', username: 'operator', displayName: '操作员', version: 3 }) }),
  synchronizeAuthSession: mocks.refresh,
  updateOwnProfile: mocks.profile,
  changeOwnPassword: mocks.password,
}));

describe('账户设置', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.refresh.mockResolvedValue(undefined); });

  it('展示登录名而不是技术 ID，资料写入只发送显示名和版本', async () => {
    const page = mount(AccountPage);
    await flushPromises();
    expect(page.text()).not.toContain('hidden-id');
    expect((page.findAll('input')[0]!.element as HTMLInputElement).value).toBe('operator');
    await page.findAll('input')[1]!.setValue('新名称');
    await page.findAll('form')[0]!.trigger('submit');
    await flushPromises();
    expect(mocks.profile).toHaveBeenCalledWith({ displayName: '新名称', version: 3 });
    page.unmount();
  });

  it('原密码错误显示反馈且清空密码输入', async () => {
    mocks.password.mockRejectedValueOnce(new ApiError('wrong', { code: 'auth.current_password_invalid', kind: 'validation', status: 400 }));
    const page = mount(AccountPage);
    await flushPromises();
    const inputs = page.findAll('input');
    await inputs[2]!.setValue(' old password ');
    await inputs[3]!.setValue(' new password ');
    await inputs[4]!.setValue(' new password ');
    await page.findAll('form')[1]!.trigger('submit');
    await flushPromises();
    expect(mocks.password).toHaveBeenCalledWith({ currentPassword: ' old password ', newPassword: ' new password ', version: 3 });
    expect(page.get('[role="alert"]').text()).toContain('原密码不正确');
    for (const input of inputs.slice(2)) expect((input.element as HTMLInputElement).value).toBe('');
    expect(mocks.password).toHaveBeenCalledTimes(1);
    page.unmount();
  });

  it('版本冲突保留草稿，刷新前禁止重复写入', async () => {
    mocks.profile.mockRejectedValueOnce(new ApiError('conflict', { code: 'auth.optimistic_lock_conflict', kind: 'conflict', status: 409 }));
    const page = mount(AccountPage);
    await flushPromises();
    await page.findAll('input')[1]!.setValue('未丢失草稿');
    await page.findAll('form')[0]!.trigger('submit');
    await flushPromises();
    expect(page.get('[role="alert"]').text()).toContain('刷新');
    expect((page.findAll('input')[1]!.element as HTMLInputElement).value).toBe('未丢失草稿');
    await page.findAll('form')[0]!.trigger('submit');
    expect(mocks.profile).toHaveBeenCalledTimes(1);
    await page.get('.account-heading button').trigger('click');
    await flushPromises();
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    expect((page.findAll('input')[1]!.element as HTMLInputElement).value).toBe('未丢失草稿');
    page.unmount();
  });
});
