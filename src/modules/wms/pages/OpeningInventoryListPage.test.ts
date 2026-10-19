import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/errors';
import { ROUTE_NAMES } from '../../../router/route-names';
import OpeningInventoryListPage from './OpeningInventoryListPage.vue';
import { createOpeningDocument, listOpeningDocuments } from '../api/opening-api';

const push = vi.fn();
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRouter: () => ({ push }) }));
vi.mock('../../auth/model/auth-permissions', () => ({ hasAuthority: () => true }));
vi.mock('../../mdm/api/catalog-api', () => ({ searchCatalog: vi.fn().mockResolvedValue({ records: [{ id: '2001', code: 'WH-1', name: '主仓' }] }) }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key, tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../api/opening-api', () => ({ createOpeningDocument: vi.fn(), listOpeningDocuments: vi.fn(), deleteOpeningDocument: vi.fn() }));

beforeEach(() => {
  push.mockReset();
  vi.mocked(listOpeningDocuments).mockReset();
  vi.mocked(createOpeningDocument).mockReset();
});

it('期初单创建结果未知时阻止重放，并按仓库查询已创建单据', async () => {
  const empty = { records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 };
  const document = { id: 'doc-1', documentNo: 'OB-00000001', warehouseId: '2001', warehouseCode: 'WH-1',
    status: 'DRAFT' as const, transactionId: null, createdBy: 'operator', version: 0,
    warehouseState: 'INITIALIZING' as const };
  vi.mocked(listOpeningDocuments).mockResolvedValueOnce(empty).mockResolvedValueOnce({ ...empty, records: [document], total: 1 });
  vi.mocked(createOpeningDocument).mockRejectedValue(new ApiError('网络结果未知', {
    kind: 'network', code: 'network', resultUnknown: true,
  }));
  const wrapper = mount(OpeningInventoryListPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div><slot /><slot name="footer" /></div>' },
    MomDataTable: { template: '<div />' },
    MomCrudPagination: { template: '<div />' },
    MomModal: { template: '<div />' },
    MomSelect: { props: ['options'], emits: ['update:modelValue'], template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>' },
    MomButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
  } } });
  await flushPromises();
  await wrapper.get('select').setValue('2001');
  const create = wrapper.findAll('button').find(button => button.text() === 'wms.opening.create')!;
  await create.trigger('click');
  await flushPromises();
  expect(create.attributes('disabled')).toBeDefined();
  expect(createOpeningDocument).toHaveBeenCalledTimes(1);
  expect(wrapper.get('[role="alert"]').text()).toContain('wms.opening.createUnknown');
  const refresh = wrapper.get('[role="alert"] button');
  await refresh.trigger('click');
  await flushPromises();
  expect(listOpeningDocuments).toHaveBeenLastCalledWith(1, 20, '2001');
  expect(push).toHaveBeenCalledWith({ name: ROUTE_NAMES.wmsOpeningDetail, params: { id: 'doc-1' } });
});
