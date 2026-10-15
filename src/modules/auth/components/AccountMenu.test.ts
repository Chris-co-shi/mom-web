import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import AccountMenu from './AccountMenu.vue';

describe('AccountMenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('展示当前用户与账户、改密、退出三个明确动作', async () => {
    const wrapper = mount(AccountMenu, {
      attachTo: document.body,
      props: {
        accountName: 'Alex Chen',
        accountLabel: 'Account settings',
        passwordLabel: 'Change password',
        logoutLabel: 'Sign out',
      },
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a href="#"><slot /></a>' },
        },
      },
    });

    const trigger = wrapper.get('[aria-label="Account settings"]');
    expect(trigger.text()).toContain('AC');
    await trigger.trigger('click');

    expect(document.body.textContent).toContain('Alex Chen');
    expect(document.body.textContent).toContain('Account settings');
    expect(document.body.textContent).toContain('Change password');
    expect(document.body.textContent).toContain('Sign out');
  });
});
