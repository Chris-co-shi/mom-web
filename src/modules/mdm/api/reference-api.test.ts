import { describe, expect, it, vi } from 'vitest';
import { searchCatalog, getCatalog } from './catalog-api';
import { catalogReference } from './reference-api';

vi.mock('./catalog-api', () => ({ searchCatalog: vi.fn(), getCatalog: vi.fn() }));
vi.mock('./material-api', () => ({ searchMaterials: vi.fn(), getMaterial: vi.fn() }));

describe('MDM 仓储参照', () => {
  it('把仓库父级和关键字交给服务端分页，按 ID 独立解析选中项', async () => {
    vi.mocked(searchCatalog).mockResolvedValue({ records: [{ id: 'L1', code: 'LOC-1', name: '库位一',
      status: 'ENABLED', version: 0, createdAt: '', updatedAt: '' }], pageNo: 2, pageSize: 20, total: 21, totalPages: 2 });
    vi.mocked(getCatalog).mockResolvedValue({ id: 'L2', code: 'LOC-2', name: '库位二',
      status: 'ENABLED', version: 0, createdAt: '', updatedAt: '' });
    const reference = catalogReference('locations', () => ({ warehouseId: 'W1' }));
    const signal = new AbortController().signal;
    expect(await reference.search('库位', 2, signal)).toEqual({ records: [expect.objectContaining({ id: 'L1' })], totalPages: 2 });
    expect(searchCatalog).toHaveBeenCalledWith('locations', 2, 20, { warehouseId: 'W1', keyword: '库位' }, signal);
    expect((await reference.resolve('L2', signal)).code).toBe('LOC-2');
    expect(getCatalog).toHaveBeenCalledWith('locations', 'L2', signal);
  });
});
