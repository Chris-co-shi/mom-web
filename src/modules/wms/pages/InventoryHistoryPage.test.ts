import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import InventoryHistoryPage from './InventoryHistoryPage.vue';
import { searchInventoryHistory, getInventoryHistoryTransaction } from '../api/inventory-history-api';
import { ApiError } from '../../../shared/api/errors';

const push = vi.fn();
vi.mock('vue-router', async original => ({ ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push }), useRoute: () => ({ query: { materialId: '1001', batchCode: 'B1' } }) }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key,
  tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../api/inventory-history-api', () => ({ searchInventoryHistory: vi.fn(), getInventoryHistoryTransaction: vi.fn() }));
const entry = { id: 'entry-1', transactionId: '123', lineNo: 1, transactionType: 'LOCATION_TRANSFER',
  sourceType: 'MANUAL', sourceId: 'move-1', operatorId: 'operator-1', occurredAt: '2026-10-19T00:00:00Z',
  materialId: '1001', materialCode: 'MAT-1', materialName: '材料一', uomCode: 'kg', batchCode: 'B1', snCode: null,
  warehouseId: '2001', warehouseCode: 'WH-1', locationId: '3001', locationCode: 'LOC-1',
  qualityStatus: 'QUALIFIED', warehouseStatus: 'NORMAL', deltaQuantity: '-2.000000',
  beforeQuantity: '5.000000', afterQuantity: '3.000000' };
function mountPage() {
  return mount(InventoryHistoryPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div data-test="history-surface"><slot name="toolbar" /><slot /><slot name="footer" /></div>' },
    MomDataTable: { props: ['rows'], template: '<div><div v-for="row in rows" :key="row.id"><slot name="cell-materialCode" :row="row" /><slot name="cell-beforeQuantity" :row="row" /><slot name="cell-afterQuantity" :row="row" /><slot name="cell-deltaQuantity" :row="row" /><slot name="cell-actions" :row="row" /></div></div>' },
    MomCrudPagination: { emits: ['page', 'size'], template: '<button data-test="next" @click="$emit(\'page\', 2)">next</button>' },
    MomModal: { props: ['open'], template: '<div v-if="open"><slot /><slot name="footer" /></div>' },
    MomButton: { template: '<button><slot /></button>' },
    MomInput: { props: ['modelValue', 'type'], emits: ['update:modelValue'], template: '<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
    MomReferenceSelect: { props: ['modelValue'], emits: ['update:modelValue'],
      template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option value="2001">仓库</option><option value="3001">库位</option><option value="1002">物料</option></select>' },
    MomSelect: { props: ['modelValue', 'options'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>' },
  } } });
}
beforeEach(() => {
  push.mockReset();
  vi.mocked(searchInventoryHistory).mockReset().mockResolvedValue({ records: [entry], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(getInventoryHistoryTransaction).mockReset().mockResolvedValue({ id: '123', transactionType: 'LOCATION_TRANSFER',
    sourceType: 'MANUAL', sourceId: 'move-1', operatorId: 'operator-1', occurredAt: entry.occurredAt,
    reasonCode: null, note: null, entries: [entry, { ...entry, id: 'entry-2', lineNo: 2, deltaQuantity: '2.000000' }] });
});
it('深链接预填但首次不请求，主动查询后保留负号并打开全部分录', async () => {
  const wrapper = mountPage();
  expect(vi.mocked(searchInventoryHistory)).not.toHaveBeenCalled();
  expect(wrapper.find('[data-test="history-surface"] form').exists()).toBe(true);
  expect(wrapper.findAll('label').some(label => label.text() === 'wms.inventory.materialId')).toBe(false);
  await wrapper.get('form').trigger('submit'); await flushPromises();
  expect(searchInventoryHistory).toHaveBeenCalledWith(1, 20, expect.objectContaining({ materialId: '1001', batchCode: 'B1' }), expect.any(AbortSignal));
  expect(wrapper.text()).toContain('-2.000000');
  await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.history.transaction')!.trigger('click');
  await flushPromises();
  expect(getInventoryHistoryTransaction).toHaveBeenCalledWith('123', expect.any(AbortSignal));
  expect(wrapper.text()).toContain('+2.000000');
});
it('翻页仍由服务端查询，重置清空条件及结果', async () => {
  const wrapper = mountPage();
  await wrapper.get('form').trigger('submit'); await flushPromises();
  await wrapper.get('[data-test="next"]').trigger('click'); await flushPromises();
  expect(searchInventoryHistory).toHaveBeenLastCalledWith(2, 20, expect.anything(), expect.any(AbortSignal));
  await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.history.reset')!.trigger('click');
  expect(wrapper.text()).toContain('wms.inventory.history.queryfirst');
  expect((wrapper.findAll('input')[0]!.element as HTMLInputElement).value).toBe('');
});
it('业务参照选择按稳定 ID 查询，修改物料会解除深链接旧 ID 限定', async () => {
  const wrapper = mountPage();
  const inputs = wrapper.findAll('label');
  await inputs.find(label => label.text().startsWith('wms.inventory.material'))!.find('select').setValue('1002');
  await inputs.find(label => label.text().startsWith('wms.inventory.warehouse'))!.find('select').setValue('2001');
  await inputs.find(label => label.text().startsWith('wms.inventory.location'))!.find('select').setValue('3001');
  await wrapper.get('form').trigger('submit'); await flushPromises();
  expect(searchInventoryHistory).toHaveBeenCalledWith(1, 20, expect.objectContaining({
    materialId: '1002', warehouseId: '2001', locationId: '3001', batchCode: 'B1',
  }), expect.any(AbortSignal));
  expect(vi.mocked(searchInventoryHistory).mock.calls[0]![2]).not.toHaveProperty('materialKeyword');
});
it('查询失败与权限不足提供不同反馈', async () => {
  vi.mocked(searchInventoryHistory).mockRejectedValueOnce(new ApiError('forbidden', { kind: 'forbidden', code: 'forbidden' }))
    .mockRejectedValueOnce(new Error('database unavailable'));
  const wrapper = mountPage();
  await wrapper.get('form').trigger('submit'); await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('wms.inventory.forbidden');
  expect(wrapper.find('[data-test="next"]').exists()).toBe(false);
  await wrapper.get('form').trigger('submit'); await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('wms.inventory.loadFailed');
});
it('连续查询时较旧响应不能覆盖新页结果', async () => {
  let resolveOld!: (value: Awaited<ReturnType<typeof searchInventoryHistory>>) => void;
  vi.mocked(searchInventoryHistory).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ records: [entry], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  const wrapper = mountPage();
  await wrapper.get('form').trigger('submit');
  await wrapper.get('form').trigger('submit'); await flushPromises();
  resolveOld({ records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 });
  await flushPromises();
  expect(wrapper.text()).toContain('-2.000000');
});
it('旧历史快照的 NULL 显示未知占位，Decimal String 保留原精度', async () => {
  const oldEntry = { ...entry, materialId: null, materialCode: null, beforeQuantity: null,
    afterQuantity: null, deltaQuantity: '-0.000001' };
  vi.mocked(searchInventoryHistory).mockResolvedValueOnce({ records: [oldEntry], pageNo: 1,
    pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(getInventoryHistoryTransaction).mockResolvedValueOnce({ id: '123', transactionType: null,
    sourceType: null, sourceId: null, operatorId: null, occurredAt: entry.occurredAt,
    reasonCode: null, note: null, entries: [oldEntry] });
  const wrapper = mountPage();
  await wrapper.get('form').trigger('submit'); await flushPromises();
  expect(wrapper.text()).toContain('-0.000001');
  expect(wrapper.text().match(/wms\.inventory\.history\.missing/g)?.length).toBeGreaterThanOrEqual(3);
  await wrapper.findAll('button').find(button => button.text() === 'wms.inventory.history.transaction')!.trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('-0.000001');
  expect(wrapper.text()).toContain('wms.inventory.history.before wms.inventory.history.missing');
});
