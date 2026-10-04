import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthorityGuard from './AuthorityGuard.vue';
import { hasAuthorities } from '../model/auth-permissions';

vi.mock('../model/auth-permissions', () => ({
  hasAuthorities: vi.fn(),
}));

describe('AuthorityGuard', () => {
  beforeEach(() => {
    vi.mocked(hasAuthorities).mockReset();
  });

  it('有权时渲染受保护内容', () => {
    vi.mocked(hasAuthorities).mockReturnValue(true);

    const wrapper = mount(AuthorityGuard, {
      props: { authorities: ['auth:user:write'] },
      slots: { default: '<button>新增用户</button>' },
    });

    expect(wrapper.text()).toContain('新增用户');
    expect(hasAuthorities).toHaveBeenCalledWith(['auth:user:write'], 'all');
  });

  it('无权时不渲染按钮并允许提供降级内容', () => {
    vi.mocked(hasAuthorities).mockReturnValue(false);

    const wrapper = mount(AuthorityGuard, {
      props: { authorities: ['auth:user:write'] },
      slots: {
        default: '<button>新增用户</button>',
        fallback: '<span>只读</span>',
      },
    });

    expect(wrapper.text()).not.toContain('新增用户');
    expect(wrapper.text()).toContain('只读');
  });
});
