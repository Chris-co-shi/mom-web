import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import ActionBar from '../../packages/common-ui/src/components/ActionBar.vue';
import ConfirmAction from '../../packages/common-ui/src/components/ConfirmAction.vue';
import DataState from '../../packages/common-ui/src/components/DataState.vue';
import MomIcon from '../../packages/common-ui/src/icons/MomIcon.vue';
import { resolveMomIcon } from '../../packages/common-ui/src/icons/registry';
import AuthShell from '../../packages/common-ui/src/layouts/AuthShell.vue';
import PortalShell from '../../packages/common-ui/src/layouts/PortalShell.vue';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('DataState', () => {
  it.each([
    'LOADING',
    'EMPTY',
    'NO_RESULT',
    'ERROR',
    'FORBIDDEN',
    'NOT_FOUND',
    'PARTIAL',
  ] as const)('显式呈现 %s 状态', (kind) => {
    const wrapper = mount(DataState, {
      props: { kind, title: `${kind} 标题` },
    });

    expect(wrapper.get('[role="status"]').attributes('data-kind')).toBe(kind);
    expect(wrapper.text()).toContain(`${kind} 标题`);
  });

  it('只在存在动作标签时发出显式动作', async () => {
    const wrapper = mount(DataState, {
      props: {
        actionLabel: '重新读取',
        kind: 'ERROR',
        title: '加载失败',
      },
    });

    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });
});

describe('ActionBar', () => {
  it('保留上下文、主次操作与溢出区的稳定语义', () => {
    const wrapper = mount(ActionBar, {
      props: { label: '用户操作' },
      slots: {
        context: '<span>筛选条件</span>',
        overflow: '<button>更多</button>',
        primary: '<button>新建</button>',
        secondary: '<button>刷新</button>',
      },
    });

    expect(wrapper.get('[role="toolbar"]').attributes('aria-label')).toBe('用户操作');
    expect(wrapper.text()).toContain('筛选条件');
    expect(wrapper.findAll('button').map((item) => item.text())).toEqual(['刷新', '新建', '更多']);
  });

  it('只有筛选上下文时不渲染空操作区', () => {
    const wrapper = mount(ActionBar, {
      props: { label: '用户筛选' },
      slots: { context: '<button>查询</button>' },
    });

    expect(wrapper.get('.mom-action-bar__context').text()).toBe('查询');
    expect(wrapper.find('.mom-action-bar__actions').exists()).toBe(false);
  });
});

describe('Lucide Registry', () => {
  it('已知键返回具名图标，未知键固定回退且不动态执行', () => {
    expect(resolveMomIcon('users').known).toBe(true);
    expect(resolveMomIcon('panel-left-open').known).toBe(true);
    expect(resolveMomIcon('log-out').known).toBe(true);
    expect(resolveMomIcon('remote-code.js').known).toBe(false);

    const wrapper = mount(MomIcon, {
      props: { iconKey: 'remote-code.js', label: '未知图标' },
    });
    expect(wrapper.get('svg').attributes('data-known')).toBe('false');
    expect(wrapper.get('svg').attributes('aria-label')).toBe('未知图标');
  });
});

describe('Shell', () => {
  it('AuthShell 只组合品牌、工具栏、表单与页脚', () => {
    const wrapper = mount(AuthShell, {
      props: { channel: 'PORTAL', title: '供应商协同门户' },
      slots: {
        footer: '版权',
        form: '<form><button>登录</button></form>',
        toolbar: '<button>主题</button>',
      },
    });

    expect(wrapper.get('main').attributes('data-channel')).toBe('PORTAL');
    expect(wrapper.get('.mom-auth-shell__brand-title').text()).toBe('供应商协同门户');
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.text()).toContain('登录');
    expect(wrapper.text()).toContain('版权');
  });

  it('PortalShell 不读取身份，只呈现显式身份插槽', () => {
    const wrapper = mount(PortalShell, {
      props: { subtitle: 'Supplier', title: '协同门户' },
      slots: { default: '<section>内容</section>', identity: '<span>张三</span>' },
    });

    expect(wrapper.text()).toContain('协同门户');
    expect(wrapper.text()).toContain('张三');
    expect(wrapper.text()).toContain('内容');
  });
});

describe('ConfirmAction', () => {
  it('关闭后把焦点返回触发控件', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = '打开确认';
    document.body.append(trigger);
    trigger.focus();

    const wrapper = mount(ConfirmAction, {
      attachTo: document.body,
      props: {
        cancelLabel: '取消',
        confirmLabel: '确认',
        description: '服务端执行最终校验',
        open: false,
        state: 'IDLE',
        title: '禁用用户',
      },
    });

    await wrapper.setProps({ open: true });
    await wrapper.setProps({ open: false });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(trigger);
  });

  it('原因和确认保持受控，不接收业务操作函数', async () => {
    const wrapper = mount(ConfirmAction, {
      attachTo: document.body,
      props: {
        cancelLabel: '取消',
        confirmLabel: '确认',
        description: '服务端执行最终校验',
        open: true,
        reason: '',
        reasonLabel: '审计原因',
        requireReason: true,
        state: 'IDLE',
        title: '禁用用户',
      },
    });

    const reason = document.body.querySelector('textarea');
    expect(reason).not.toBeNull();
    reason!.value = '安全治理';
    reason!.dispatchEvent(new Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:reason')?.at(-1)).toEqual(['安全治理']);

    const confirm = document.body.querySelector<HTMLButtonElement>(
      '.ant-modal-footer .ant-btn-primary',
    );
    expect(confirm).not.toBeNull();
    confirm!.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('结果未知时不提供重复确认入口', () => {
    mount(ConfirmAction, {
      attachTo: document.body,
      props: {
        cancelLabel: '关闭',
        confirmLabel: '确认',
        description: '命令已发出',
        open: true,
        state: 'RESULT_UNKNOWN',
        title: '结果未知',
      },
      slots: { resultUnknown: '请先查询最终状态' },
    });

    expect(document.body.textContent).toContain('请先查询最终状态');
    expect([...document.body.querySelectorAll('button')].some(
      (button) => button.textContent?.trim() === '确认',
    )).toBe(false);
  });
});
