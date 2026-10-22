import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import ProductionVersionManagementPage from './ProductionVersionManagementPage.vue';
import { searchFormulas, getFormula } from '../api/formula-api';
import { searchRoutings, getRouting } from '../api/routing-api';

vi.mock('vue-router', async original => ({ ...(await original<typeof import('vue-router')>()), onBeforeRouteLeave: vi.fn() }));
vi.mock('../../auth', () => ({ hasAuthority: () => true, AuthorityGuard: { template: '<div><slot /></div>' } }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key,
  tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../api/factory-api', () => ({ searchPlants: vi.fn().mockResolvedValue({ records: [
  { id: '1', code: 'PLANT', name: '工厂', status: 'ENABLED' } ] }) }));
vi.mock('../api/material-api', () => ({ searchMaterials: vi.fn().mockResolvedValue({ records: [
  { id: '2', code: 'FG', name: '成品', status: 'ENABLED' } ] }) }));
vi.mock('../api/production-version-api', () => ({ searchProductionVersions: vi.fn().mockResolvedValue({
  records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 }), getProductionVersion: vi.fn(),
  createProductionVersion: vi.fn(), updateProductionVersion: vi.fn(), releaseProductionVersion: vi.fn(),
  obsoleteProductionVersion: vi.fn() }));
vi.mock('../api/formula-api', () => ({ searchFormulas: vi.fn(), getFormula: vi.fn() }));
vi.mock('../api/routing-api', () => ({ searchRoutings: vi.fn(), getRouting: vi.fn() }));

it('生产版本可选择被后续草稿遮住的已发布修订', async () => {
  vi.mocked(searchFormulas).mockResolvedValue({ records: [{ id: '10', code: 'FORMULA', name: '配方',
    plantId: '1', outputMaterialId: '2', releasedRevisions: [{ id: '11', revisionNo: 1 }, { id: '13', revisionNo: 3 }] } as never],
    pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(searchRoutings).mockResolvedValue({ records: [{ id: '20', code: 'ROUTE', name: '路线',
    plantId: '1', releasedRevisions: [{ id: '21', revisionNo: 1 }] } as never],
    pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(getFormula).mockResolvedValue({ formula: { id: '10', code: 'FORMULA', name: '配方', plantId: '1', outputMaterialId: '2' },
    revision: { id: '12', revisionNo: 2, status: 'DRAFT' }, items: [] } as never);
  vi.mocked(getRouting).mockResolvedValue({ routing: { id: '20', code: 'ROUTE', name: '路线', plantId: '1' },
    revision: { id: '22', revisionNo: 2, status: 'DRAFT' }, steps: [] } as never);
  const wrapper = mount(ProductionVersionManagementPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div><slot /><slot name="footer" /></div>' },
    MomDataTable: { template: '<div />' }, MomCrudPagination: { template: '<div />' },
    MomModal: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
    MomButton: { template: '<button><slot /></button>' }, MomInput: { template: '<input />' },
    MomSelect: { props: ['options'], template: '<select><option v-for="option in options" :key="option.value" :value="option.value">{{option.label}}</option></select>' },
  } } });
  await flushPromises();
  await wrapper.findAll('button').find(button => button.text() === 'mdm.struct.create')!.trigger('click');
  await flushPromises();
  expect(wrapper.find('option[value="11"]').exists()).toBe(true);
  expect(wrapper.find('option[value="13"]').exists()).toBe(true);
  expect(wrapper.find('option[value="21"]').exists()).toBe(true);
  wrapper.unmount();
});
