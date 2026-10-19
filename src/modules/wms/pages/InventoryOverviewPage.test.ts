import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import InventoryOverviewPage from './InventoryOverviewPage.vue';
import { ROUTE_NAMES } from '../../../router/route-names';
import { searchInventoryOverview } from '../api/inventory-api';

const push = vi.fn();
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRouter: () => ({ push }) }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({
  t: (key: string) => key, tForOwner: (_owner: string, key: string) => key,
}) }));
vi.mock('../api/inventory-api', () => ({ searchInventoryOverview: vi.fn() }));

beforeEach(() => {
  push.mockReset();
  vi.mocked(searchInventoryOverview).mockResolvedValue({
    records: [{ materialId: '1001', materialCode: 'MAT-1', materialName: '材料一', uomCode: 'kg',
      totalQuantity: '10', availableQuantity: '8', unavailableQuantity: '2', frozenQuantity: '2' }],
    pageNo: 1, pageSize: 20, total: 1, totalPages: 1,
  });
});

it('点击真实总览行进入该 Material 的明细路由', async () => {
  const wrapper = mount(InventoryOverviewPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div><slot /><slot name="footer" /></div>' },
    MomDataTable: { props: ['rows'], template: '<div><template v-for="row in rows"><slot name="cell-actions" :row="row" /></template></div>' },
    MomCrudPagination: { template: '<div />' },
    MomButton: { template: '<button><slot /></button>' },
    MomInput: { template: '<input />' },
  } } });
  await flushPromises();
  const action = wrapper.findAll('button').find(button => button.text() === 'wms.inventory.viewDetails');
  expect(action).toBeDefined();
  await action!.trigger('click');
  expect(push).toHaveBeenCalledWith({ name: ROUTE_NAMES.wmsInventoryDetails, query: { materialId: '1001' } });
});
