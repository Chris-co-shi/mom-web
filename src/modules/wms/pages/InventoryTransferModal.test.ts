import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryTransferModal from './InventoryTransferModal.vue';
import { transferInventory } from '../api/inventory-api';
import { searchCatalog } from '../../mdm/api/catalog-api';
import { ApiError } from '../../../shared/api/errors';

vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key,
  tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../api/inventory-api', () => ({ transferInventory: vi.fn() }));
vi.mock('../../mdm/api/catalog-api', () => ({ searchCatalog: vi.fn() }));

const balance = { id: 'balance-1', materialId: '1001', materialCode: 'MAT-1', materialName: '材料一', uomCode: 'kg',
  batchCode: 'B1', snCode: null, warehouseId: '2001', warehouseCode: 'WH-1', locationId: '3001', locationCode: 'LOC-1',
  qualityStatus: 'QUALIFIED' as const, warehouseStatus: 'NORMAL' as const, quantity: '10' };

function mountModal(snCode: string | null = null) {
  return mount(InventoryTransferModal, { props: { balance: { ...balance, snCode } }, global: { stubs: {
    MomModal: { template: '<div><slot /><slot name="footer" /></div>' },
    MomButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
    MomQuantityInput: { props: ['modelValue', 'unitValue'], emits: ['update:modelValue'],
      template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    MomReferenceSelect: { name: 'MomReferenceSelect', props: ['modelValue', 'search'], emits: ['update:modelValue'],
      template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option value="3002">目标库位</option></select>' },
  } } });
}

beforeEach(() => {
  vi.mocked(searchCatalog).mockReset().mockImplementation(async () => ({
    records: [{ id: '3001', code: 'LOC-1', name: '来源', status: 'ENABLED' as const,
          version: 0, createdAt: '', updatedAt: '' },
        { id: '3002', code: 'LOC-2', name: '目标', status: 'ENABLED' as const,
          version: 0, createdAt: '', updatedAt: '' }],
    pageNo: 1, pageSize: 20, total: 2, totalPages: 1,
  }));
  vi.mocked(transferInventory).mockReset().mockResolvedValue({ transactionId: 'tx-1' });
});

describe('库内移动弹窗', () => {
  it('分页搜索当前仓库库位，排除来源并提交单次写入', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'move-key' });
    const wrapper = mountModal(); await flushPromises();
    const reference = wrapper.findComponent({ name: 'MomReferenceSelect' });
    const result = await reference.props('search')('', 1, new AbortController().signal);
    expect(searchCatalog).toHaveBeenCalledWith('locations', 1, 20,
      { warehouseId: '2001', keyword: '', status: 'ENABLED' }, expect.any(AbortSignal));
    expect(result.records.map((row: { id: string }) => row.id)).toEqual(['3002']);
    expect(wrapper.findAll('option').map(option => option.attributes('value'))).toEqual(['', '3002']);
    await wrapper.find('select').setValue('3002');
    await wrapper.find('input').setValue('2.5');
    await wrapper.find('form').trigger('submit'); await flushPromises();
    expect(transferInventory).toHaveBeenCalledExactlyOnceWith({
      requestKey: 'move-key', balanceId: 'balance-1', targetLocationId: '3002', quantity: '2.5',
    });
    expect(wrapper.emitted('done')).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it('带 SN 标签时禁止部分移动', async () => {
    const wrapper = mountModal('SN-1'); await flushPromises();
    await wrapper.find('select').setValue('3002');
    await wrapper.find('input').setValue('2');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit');
    expect(transferInventory).not.toHaveBeenCalled();
  });

  it('未知写入结果禁用再次提交，要求刷新核对', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'move-key' });
    vi.mocked(transferInventory).mockRejectedValue(new ApiError('network',
      { kind: 'network', code: 'network', resultUnknown: true }));
    const wrapper = mountModal(); await flushPromises();
    await wrapper.find('select').setValue('3002');
    await wrapper.find('form').trigger('submit'); await flushPromises();
    expect(wrapper.text()).toContain('wms.inventory.transfer.unknown');
    await wrapper.find('form').trigger('submit');
    expect(transferInventory).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
