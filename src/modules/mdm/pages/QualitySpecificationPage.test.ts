import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import QualitySpecificationPage from './QualitySpecificationPage.vue';
import { searchSpecifications } from '../api/quality-api';

vi.mock('../../auth', () => ({ hasAuthority: () => true, AuthorityGuard: { template: '<div><slot /></div>' } }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key,
  tForOwner: (_owner: string, key: string) => key }) }));
vi.mock('../api/factory-api', () => ({ searchPlants: vi.fn().mockResolvedValue({ records: [] }) }));
vi.mock('../api/material-api', () => ({ searchMaterials: vi.fn().mockResolvedValue({ records: [] }) }));
vi.mock('../api/uom-api', () => ({ searchUomCatalog: vi.fn().mockResolvedValue({ records: [] }) }));
vi.mock('../api/quality-api', () => ({ searchSpecifications: vi.fn(), getSpecification: vi.fn(),
  createSpecification: vi.fn(), nextSpecificationRevision: vi.fn(), obsoleteSpecificationRevision: vi.fn(),
  releaseSpecificationRevision: vi.fn(), searchCharacteristics: vi.fn().mockResolvedValue({ records: [] }),
  searchMethods: vi.fn().mockResolvedValue({ records: [] }), updateSpecificationDraft: vi.fn() }));

it('质量标准列表和创建表单显示成品检验用途', async () => {
  vi.mocked(searchSpecifications).mockResolvedValue({ records: [{ id: '1', code: 'FG-1', name: '成品标准',
    plantId: '2', materialId: '3', inspectionUsage: 'FINISHED_GOODS', latestRevisionNo: 1,
    latestStatus: 'RELEASED' }], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  const wrapper = mount(QualitySpecificationPage, { global: { stubs: {
    PageContainer: { template: '<div><slot /></div>' },
    MomManagementHeader: { template: '<div><slot name="actions" /></div>' },
    MomListSurface: { template: '<div><slot /><slot name="footer" /></div>' },
    MomDataTable: { props: ['rows'], template: '<div><template v-for="row in rows"><slot name="cell-inspectionUsage" :row="row" /></template></div>' },
    MomCrudPagination: { template: '<div />' },
    MomModal: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
    MomButton: { template: '<button><slot /></button>' }, MomInput: { template: '<input />' },
    MomSelect: { props: ['options'], template: '<select><option v-for="option in options" :key="option.value" :value="option.value">{{option.label}}</option></select>' },
  } } });
  await flushPromises();
  expect(wrapper.text()).toContain('mdm.quality.spec.usage.finished_goods');
  await wrapper.findAll('button').find(button => button.text() === 'mdm.struct.create')!.trigger('click');
  await flushPromises();
  expect(wrapper.find('option[value="FINISHED_GOODS"]').exists()).toBe(true);
  wrapper.unmount();
});
