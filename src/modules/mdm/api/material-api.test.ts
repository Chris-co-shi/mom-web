import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { searchMaterialCategories, createMaterialCategory, updateMaterialCategory,
  searchMaterials, createMaterial, updateMaterial, setMaterialEnabled } from './material-api';

describe('MDM 物料与分类 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ code:'0', message:'ok',
      data:{ records:[], pageNo:1, pageSize:20, total:0, totalPages:0 } }), {
      headers:{ 'Content-Type':'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken:'test-token', locale:'zh-CN' }));
  });
  it('分类查询直接父级，不递归查询后代', async () => {
    await searchMaterialCategories(1, 20, { parentId:'101', status:'ENABLED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/material-categories/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      params:{ parentId:'101', status:'ENABLED' }, pageNo:1, pageSize:20,
    });
  });
  it('分类创建/更新保留 sort 和可清空父级、保质期建议', async () => {
    await createMaterialCategory({ code:'CAT01', name:'材料', parentId:null, sort:0,
      defaultShelfLifeDays:null, status:'ENABLED' });
    await updateMaterialCategory('102', { name:'调整', parentId:null, sort:2,
      defaultShelfLifeDays:360, version:4 });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      name:'调整', parentId:null, sort:2, defaultShelfLifeDays:360, version:4,
    });
  });
  it('物料使用服务端 keyword、categoryId、baseUomId、status 过滤', async () => {
    await searchMaterials(2, 10, { keyword:'电子', categoryId:'101', baseUomId:'102', status:'ENABLED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/materials/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).params).toEqual({
      keyword:'电子', categoryId:'101', baseUomId:'102', status:'ENABLED',
    });
  });
  it('CATEGORY_DEFAULT 创建时保质期为空；更新不发送 shelfLifeSource', async () => {
    await createMaterial({ code:'MAT01', name:'材料', categoryId:'101', baseUomId:'102',
      shelfLifeSource:'CATEGORY_DEFAULT', shelfLifeDays:null, status:'ENABLED' });
    await updateMaterial('103', { name:'材料A', categoryId:'101', baseUomId:'102', shelfLifeDays:30, version:2 });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).shelfLifeDays).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      name:'材料A', categoryId:'101', baseUomId:'102', shelfLifeDays:30, version:2,
    });
  });
  it('启停严格使用 PATCH 和读取版本', async () => {
    await setMaterialEnabled('104',false,6);
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({version:6});
  });
});
