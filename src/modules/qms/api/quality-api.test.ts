import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createSpecification, releaseSpecificationRevision, searchCharacteristics, searchSpecifications } from './quality-api';

describe('QMS 质量定义 API 契约', () => {
  const fetchMock=vi.fn();
  beforeEach(()=>{fetchMock.mockReset().mockImplementation(async()=>new Response(JSON.stringify({code:'0',message:'ok',data:null}),{headers:{'Content-Type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);setHttpRequestContextProvider(()=>({accessToken:'qms-token',locale:'zh-CN'}));});
  it('只使用 /qms 前缀并发送分页对象',async()=>{
    await searchCharacteristics(1,20,true); await searchSpecifications(2,50,{plantId:'1'});
    expect(fetchMock.mock.calls[0]![0]).toBe('/qms/inspection-characteristics/search');
    expect(fetchMock.mock.calls[1]![0]).toBe('/qms/quality-specifications/search');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({params:{plantId:'1'},pageNo:2,pageSize:50});
  });
  it('范围保留 Decimal String 且发布只提交锁版本',async()=>{
    await createSpecification({code:'DMC-IN',name:'DMC',plantId:'1',materialId:'2',items:[{sequenceNo:10,characteristicId:'3',methodId:'4',uomId:'5',lowerLimit:'99.900000001',targetValue:'99.95',upperLimit:'100',mandatory:true}]});
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).items[0].lowerLimit).toBe('99.900000001');
    await releaseSpecificationRevision('6',1);
    expect(fetchMock.mock.calls[1]![0]).toBe('/qms/quality-specifications/revisions/release/6');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({lockVersion:1});
  });
});
