import type { ReferenceOption, ReferencePage } from '../../../shared/ui/MomReferenceSelect.vue';
import { getCatalog, searchCatalog, type CatalogKind } from './catalog-api';
import { getMaterial, searchMaterials } from './material-api';

/** 物料参照沿用 MDM 关键字分页和按 ID 详情接口。 */
export const materialReference = {
  async search(keyword: string, page: number, signal: AbortSignal): Promise<ReferencePage> {
    const result = await searchMaterials(page, 20, { keyword: keyword || undefined }, signal);
    return { records: result.records, totalPages: result.totalPages };
  },
  resolve: (id: string, signal: AbortSignal): Promise<ReferenceOption> => getMaterial(id, signal),
};

/** 写入表单只提供已启用物料；旧值仍通过 ID 独立回显，交由业务校验决定能否保存。 */
export const activeMaterialReference = {
  ...materialReference,
  async search(keyword: string, page: number, signal: AbortSignal): Promise<ReferencePage> {
    const result = await searchMaterials(page, 20, { keyword: keyword || undefined, status: 'ENABLED' }, signal);
    return { records: result.records, totalPages: result.totalPages };
  },
};

/** 仓储结构参照由页面指定父级；分页、鉴权与 Gateway 路径沿用原 API。 */
export function catalogReference(kind: CatalogKind, params: () => Record<string, string>) {
  return {
    async search(keyword: string, page: number, signal: AbortSignal): Promise<ReferencePage> {
      const result = await searchCatalog(kind, page, 20, { ...params(), keyword }, signal);
      return { records: result.records, totalPages: result.totalPages };
    },
    resolve: (id: string, signal: AbortSignal): Promise<ReferenceOption> => getCatalog(kind, id, signal),
  };
}
