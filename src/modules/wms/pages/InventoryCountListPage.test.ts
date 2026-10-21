import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { ApiError } from '../../../shared/api/errors';
import { ROUTE_NAMES } from '../../../router/route-names';
import InventoryCountListPage from './InventoryCountListPage.vue';
import { createCount, findCountByRequestKey, listCounts } from '../api/inventory-count-api';

const push=vi.fn();
const currentUser=ref<string|undefined>('user-1');
const storageKey='mom.wms.inventory-count.pending-create';
const empty={records:[],pageNo:1,pageSize:20,total:0,totalPages:0};
const detail={task:{id:'count-1',requestKey:'fixed-request-key',warehouseId:'2001'},lines:[]} as never;
vi.mock('vue-router',async original=>({...(await original<typeof import('vue-router')>()),useRouter:()=>({push})}));
vi.mock('../../auth/model/auth-session',()=>({useAuthSession:()=>({userId:currentUser})}));
vi.mock('../../auth/model/auth-permissions',()=>({hasAuthority:()=>true}));
vi.mock('../../mdm/api/catalog-api',()=>({searchCatalog:vi.fn().mockResolvedValue({records:[{id:'2001',code:'WH-1',name:'主仓'}]})}));
vi.mock('../../../shared/i18n/locale',()=>({useLocale:()=>({t:(key:string)=>key,tForOwner:(_owner:string,key:string)=>key})}));
vi.mock('../api/inventory-count-api',()=>({createCount:vi.fn(),findCountByRequestKey:vi.fn(),listCounts:vi.fn()}));

beforeEach(()=>{push.mockReset();vi.mocked(createCount).mockReset();vi.mocked(findCountByRequestKey).mockReset();vi.mocked(listCounts).mockReset();
  currentUser.value='user-1';window.sessionStorage.clear();
  vi.mocked(listCounts).mockResolvedValue(empty);
  vi.stubGlobal('crypto',{randomUUID:()=> 'fixed-request-key'});
});

function mountPage() {
  return mount(InventoryCountListPage,{global:{stubs:{
    PageContainer:{template:'<div><slot /></div>'},
    MomManagementHeader:{template:'<div><slot name="actions" /></div>'},
    MomListSurface:{template:'<div><slot /><slot name="footer" /></div>'},
    MomDataTable:{template:'<div />'},MomCrudPagination:{template:'<div />'},
    MomReferenceSelect:{emits:['update:modelValue'],template:'<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><option value="2001">主仓 · WH-1</option></select>'},
    MomButton:{props:['disabled'],template:'<button :disabled="disabled"><slot /></button>'},
  }}});
}

async function selectAndCreate(wrapper:ReturnType<typeof mountPage>) {
  await flushPromises();
  await wrapper.get('select').setValue('2001');
  await wrapper.findAll('button').find(item=>item.text()==='wms.inventory.count.create')!.trigger('click');
  await flushPromises();
}

it('正常成功清理待确认记录，刷新后不再核对或创建',async()=>{
  vi.mocked(createCount).mockResolvedValue(detail);
  const page=mountPage();await selectAndCreate(page);
  expect(createCount).toHaveBeenCalledWith('fixed-request-key','2001',{locationIds:[],materialIds:[]});
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  expect(push).toHaveBeenCalledWith({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:'count-1'}});
  page.unmount();mountPage();await flushPromises();
  expect(findCountByRequestKey).not.toHaveBeenCalled();
  expect(createCount).toHaveBeenCalledTimes(1);
});

it('请求进行时刷新先按原键核对，空结果保持阻断',async()=>{
  vi.mocked(createCount).mockImplementation(()=>new Promise(()=>{}));
  vi.mocked(findCountByRequestKey).mockResolvedValue(null);
  const page=mountPage();await selectAndCreate(page);
  expect(JSON.parse(window.sessionStorage.getItem(storageKey)!)).toEqual({
    userId:'user-1',requestKey:'fixed-request-key',warehouseId:'2001',locationIds:[],materialIds:[],
  });
  page.unmount();const restored=mountPage();await flushPromises();
  expect(findCountByRequestKey).toHaveBeenCalledWith('fixed-request-key');
  expect(restored.get('[role="alert"]').text()).toContain('wms.inventory.count.unknown');
  expect(window.sessionStorage.getItem(storageKey)).not.toBeNull();
  expect(createCount).toHaveBeenCalledTimes(1);
});

it('提交成功但响应丢失，刷新恢复原单且不再次发号',async()=>{
  vi.mocked(createCount).mockRejectedValue(new ApiError('网络中断',{kind:'network',code:'network',resultUnknown:true}));
  vi.mocked(findCountByRequestKey).mockResolvedValue(detail);
  const page=mountPage();await selectAndCreate(page);
  expect(window.sessionStorage.getItem(storageKey)).not.toBeNull();
  page.unmount();mountPage();await flushPromises();
  expect(findCountByRequestKey).toHaveBeenCalledWith('fixed-request-key');
  expect(createCount).toHaveBeenCalledTimes(1);
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  expect(push).toHaveBeenCalledWith({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:'count-1'}});
});

it('换用户不查询、不重放原用户请求，并清理原待确认记录',async()=>{
  window.sessionStorage.setItem(storageKey,JSON.stringify({userId:'user-1',requestKey:'fixed-request-key',
    warehouseId:'2001',locationIds:[],materialIds:[]}));
  currentUser.value='user-2';mountPage();await flushPromises();
  expect(findCountByRequestKey).not.toHaveBeenCalled();
  expect(createCount).not.toHaveBeenCalled();
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
});

it('待确认期间用户切换立即清理原请求',async()=>{
  vi.mocked(createCount).mockRejectedValue(new ApiError('网络中断',{kind:'network',code:'network',resultUnknown:true}));
  const page=mountPage();await selectAndCreate(page);
  expect(window.sessionStorage.getItem(storageKey)).not.toBeNull();
  currentUser.value='user-2';await flushPromises();
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  expect(page.find('[role="alert"]').exists()).toBe(false);
});

it('确定失败清理原键，允许用户修正后重新创建',async()=>{
  vi.mocked(createCount).mockRejectedValue(new ApiError('仓库不可用',{kind:'conflict',code:'warehouse_inactive',status:409}));
  const page=mountPage();await selectAndCreate(page);
  expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  expect(page.get('[role="alert"]').text()).toContain('仓库不可用');
  expect(page.findAll('button').find(item=>item.text()==='wms.inventory.count.create')!.attributes('disabled')).toBeUndefined();
});

it('不能保存待确认键时阻断写请求',async()=>{
  const setItem=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('storage unavailable');});
  try {
    const page=mountPage();await selectAndCreate(page);
    expect(createCount).not.toHaveBeenCalled();
    expect(page.get('[role="alert"]').text()).toContain('wms.inventory.count.writefailed');
  } finally {setItem.mockRestore();}
});

it('创建结果未知时普通刷新不能解除，按原请求键读取到提交结果才解除',async()=>{
  const empty={records:[],pageNo:1,pageSize:20,total:0,totalPages:0};
  vi.mocked(listCounts).mockResolvedValue(empty);
  vi.mocked(createCount).mockRejectedValueOnce(new ApiError('结果未知',{kind:'network',code:'network',resultUnknown:true}));
  vi.mocked(findCountByRequestKey).mockResolvedValueOnce(null).mockResolvedValueOnce({task:{id:'count-1',
    requestKey:'fixed-request-key',warehouseId:'2001'},lines:[]} as never);
  const wrapper=mount(InventoryCountListPage,{global:{stubs:{
    PageContainer:{template:'<div><slot /></div>'},
    MomManagementHeader:{template:'<div><slot name="actions" /></div>'},
    MomListSurface:{template:'<div><slot /><slot name="footer" /></div>'},
    MomDataTable:{template:'<div />'},MomCrudPagination:{template:'<div />'},
    MomReferenceSelect:{emits:['update:modelValue'],template:'<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><option value="2001">主仓 · WH-1</option></select>'},
    MomButton:{props:['disabled'],template:'<button :disabled="disabled"><slot /></button>'},
  }}});
  await flushPromises();
  await wrapper.get('select').setValue('2001');
  const button=()=>wrapper.findAll('button').find(item=>item.text()==='wms.inventory.count.create')!;
  await button().trigger('click');await flushPromises();
  expect(createCount).toHaveBeenCalledTimes(1);
  expect(button().attributes('disabled')).toBeDefined();
  expect(wrapper.get('[role="alert"]').text()).toContain('wms.inventory.count.unknown');
  await wrapper.findAll('button').find(item=>item.text()==='system.common.refresh')!.trigger('click');
  await flushPromises();
  await button().trigger('click');await flushPromises();
  expect(createCount).toHaveBeenCalledTimes(1);
  const reconcile=()=>wrapper.get('[role="alert"] button');
  await reconcile().trigger('click');await flushPromises();
  expect(button().attributes('disabled')).toBeDefined();
  await reconcile().trigger('click');await flushPromises();
  expect(createCount).toHaveBeenNthCalledWith(1,'fixed-request-key','2001',{locationIds:[],materialIds:[]});
  expect(findCountByRequestKey).toHaveBeenCalledTimes(2);
  expect(findCountByRequestKey).toHaveBeenCalledWith('fixed-request-key');
  expect(push).toHaveBeenCalledWith({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:'count-1'}});
});

it('仓库库存未启用时展示后端具体原因',async()=>{
  vi.mocked(listCounts).mockResolvedValue({records:[],pageNo:1,pageSize:20,total:0,totalPages:0});
  vi.mocked(createCount).mockRejectedValue(new ApiError('请先完成期初建账并启用仓库库存',{
    kind:'conflict',code:'wms.inventory.count_warehouse_inactive',status:409,
  }));
  const wrapper=mount(InventoryCountListPage,{global:{stubs:{
    PageContainer:{template:'<div><slot /></div>'},
    MomManagementHeader:{template:'<div><slot name="actions" /></div>'},
    MomListSurface:{template:'<div><slot /><slot name="footer" /></div>'},
    MomDataTable:{template:'<div />'},MomCrudPagination:{template:'<div />'},
    MomReferenceSelect:{emits:['update:modelValue'],template:'<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><option value="2001">主仓 · WH-1</option></select>'},
    MomButton:{props:['disabled'],template:'<button :disabled="disabled"><slot /></button>'},
  }}});
  await flushPromises();
  await wrapper.get('select').setValue('2001');
  await wrapper.findAll('button').find(item=>item.text()==='wms.inventory.count.create')!.trigger('click');
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('请先完成期初建账并启用仓库库存');
});
