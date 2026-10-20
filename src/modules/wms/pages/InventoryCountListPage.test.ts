import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/errors';
import { ROUTE_NAMES } from '../../../router/route-names';
import InventoryCountListPage from './InventoryCountListPage.vue';
import { createCount, listCounts } from '../api/inventory-count-api';

const push=vi.fn();
vi.mock('vue-router',async original=>({...(await original<typeof import('vue-router')>()),useRouter:()=>({push})}));
vi.mock('../../auth/model/auth-permissions',()=>({hasAuthority:()=>true}));
vi.mock('../../mdm/api/catalog-api',()=>({searchCatalog:vi.fn().mockResolvedValue({records:[{id:'2001',code:'WH-1',name:'主仓'}]})}));
vi.mock('../../../shared/i18n/locale',()=>({useLocale:()=>({t:(key:string)=>key,tForOwner:(_owner:string,key:string)=>key})}));
vi.mock('../api/inventory-count-api',()=>({createCount:vi.fn(),listCounts:vi.fn()}));

beforeEach(()=>{push.mockReset();vi.mocked(createCount).mockReset();vi.mocked(listCounts).mockReset();
  vi.stubGlobal('crypto',{randomUUID:()=> 'fixed-request-key'});
});

it('创建结果未知时停止提交，手动刷新后复用原请求键安全核对',async()=>{
  const empty={records:[],pageNo:1,pageSize:20,total:0,totalPages:0};
  vi.mocked(listCounts).mockResolvedValue(empty);
  vi.mocked(createCount).mockRejectedValueOnce(new ApiError('结果未知',{kind:'network',code:'network',resultUnknown:true}))
    .mockResolvedValueOnce({task:{id:'count-1'},lines:[]} as never);
  const wrapper=mount(InventoryCountListPage,{global:{stubs:{
    PageContainer:{template:'<div><slot /></div>'},
    MomManagementHeader:{template:'<div><slot name="actions" /></div>'},
    MomListSurface:{template:'<div><slot /><slot name="footer" /></div>'},
    MomDataTable:{template:'<div />'},MomCrudPagination:{template:'<div />'},
    MomSelect:{props:['options'],emits:['update:modelValue'],template:'<select @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><option v-for="item in options" :value="item.value">{{ item.label }}</option></select>'},
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
  expect(createCount).toHaveBeenNthCalledWith(1,'fixed-request-key','2001',{locationIds:[],materialIds:[]});
  expect(createCount).toHaveBeenNthCalledWith(2,'fixed-request-key','2001',{locationIds:[],materialIds:[]});
  expect(push).toHaveBeenCalledWith({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:'count-1'}});
});
