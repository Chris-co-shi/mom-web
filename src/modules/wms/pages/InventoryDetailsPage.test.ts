import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryDetailsPage from './InventoryDetailsPage.vue';
import { searchActiveFreezes, searchInventoryDetails, freezeInventory, unfreezeInventory } from '../api/inventory-api';
import { ApiError } from '../../../shared/api/errors';

const push = vi.fn();
const detail = { id: 'balance-1', materialId: '1001', materialCode: 'MAT-1', materialName: '材料一', uomCode: 'kg',
  batchCode: 'B1', snCode: 'SN-1', warehouseId: '2001', warehouseCode: 'WH-1', locationId: '3001', locationCode: 'LOC-1',
  qualityStatus: 'QUALIFIED' as const, warehouseStatus: 'NORMAL' as const, quantity: '10' };
vi.mock('vue-router', async original => ({ ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push }), useRoute: () => ({ query: { warehouseId: '2001' } }) }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key,
  tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../../auth/model/auth-permissions', () => ({ hasAuthority: () => true }));
vi.mock('../api/inventory-api', () => ({ searchInventoryDetails: vi.fn(), searchActiveFreezes: vi.fn(),
  freezeInventory: vi.fn(), unfreezeInventory: vi.fn() }));

function mountPage() {
  return mount(InventoryDetailsPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div><slot /><slot name="footer" /></div>' },
    MomDataTable: { props: ['rows'], template: '<div><div v-for="row in rows" :key="row.id"><slot name="cell-actions" :row="row" /></div></div>' },
    MomCrudPagination: { template: '<div />' },
    MomModal: { props: ['open'], template: '<div v-if="open"><slot /><slot name="footer" /></div>' },
    MomButton: { template: '<button><slot /></button>' },
    MomInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    MomSelect: { props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>' },
    MomTextarea: { props: ['modelValue'], emits: ['update:modelValue'], template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  } } });
}

beforeEach(() => {
  push.mockReset();
  vi.mocked(searchInventoryDetails).mockResolvedValue({ records: [detail], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(searchActiveFreezes).mockResolvedValue([]);
  vi.mocked(freezeInventory).mockReset();
  vi.mocked(unfreezeInventory).mockReset().mockResolvedValue({ transactionId: 'tx-release', freezeId: 'freeze-1', remainingQuantity: '0' });
});

describe('WMS 实时库存明细冻结交互', () => {
  it('从期初跳转参数预填 warehouseId，并按明细余额查询有效限制', async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(searchInventoryDetails).toHaveBeenCalledWith(1, 20, expect.objectContaining({ warehouseId: '2001' }), expect.any(AbortSignal));
    await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.freeze.action')!.trigger('click');
    await flushPromises();
    expect(searchActiveFreezes).toHaveBeenCalledWith('balance-1');
  });

  it('冲突时显示刷新核对提示，不自动重试写入', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'request-1' });
    vi.mocked(freezeInventory).mockRejectedValue(new ApiError('conflict', { kind: 'conflict', code: 'conflict' }));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.freeze.action')!.trigger('click');
    await flushPromises();
    await wrapper.find('form.inventory-freeze__form').trigger('submit');
    await flushPromises();
    expect(freezeInventory).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('wms.inventory.freeze.conflict');
    vi.unstubAllGlobals();
  });

  it('提交结果未知时锁定重复写入，并允许刷新查询核对', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'request-2' });
    vi.mocked(freezeInventory).mockRejectedValue(new ApiError('network', {
      kind: 'network', code: 'network', resultUnknown: true,
    }));
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.freeze.action')!.trigger('click');
    await flushPromises();
    await wrapper.find('form.inventory-freeze__form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('wms.inventory.freeze.unknown');
    const refresh = wrapper.findAll('button').find(button => button.text() === 'wms.inventory.retry')!;
    await refresh.trigger('click');
    await flushPromises();
    expect(freezeInventory).toHaveBeenCalledTimes(1);
    expect(searchActiveFreezes).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('对选中的具体限制提交解冻数量和处理说明', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'release-key' });
    vi.mocked(searchActiveFreezes).mockResolvedValue([{
      id: 'freeze-1', transactionId: 'tx-freeze', originalBalanceId: 'balance-1', materialId: '1001',
      materialCode: 'MAT-1', materialName: '材料一', uomCode: 'kg', batchCode: 'B1', snCode: 'SN-1',
      warehouseId: '2001', warehouseCode: 'WH-1', locationId: '3001', locationCode: 'LOC-1',
      qualityStatus: 'QUALIFIED', reasonCode: 'PACKAGE_DAMAGE', note: null, originalQuantity: '4',
      remainingQuantity: '4', sourceType: 'MANUAL', sourceId: 'source-1', operatorId: 'user-1', frozenAt: '2026-01-01T00:00:00Z',
    }]);
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.freeze.action')!.trigger('click');
    await flushPromises();
    const inputs = wrapper.findAll('.inventory-freeze__item input');
    await inputs[0]!.setValue('1.5');
    await inputs[1]!.setValue('核实完成');
    await wrapper.find('.inventory-freeze__item form').trigger('submit');
    await flushPromises();
    expect(unfreezeInventory).toHaveBeenCalledWith('freeze-1', {
      requestKey: 'release-key', quantity: '1.5', note: '核实完成',
    });
    vi.unstubAllGlobals();
  });
});
