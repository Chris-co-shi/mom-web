/** MOM 当前 Controller 的统一响应信封。 */
export interface ApiResult<T> {
  code: string;
  message: string;
  data: T;
}

/** Bean Validation 与分页校验返回的字段级错误。 */
export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

/**
 * 平台统一分页请求。
 * params 必须由模块 API 显式提供；页码从 1 开始，不在客户端静默修正。
 */
export interface PageQuery<TParams extends object> {
  params: TParams;
  pageNo: number;
  pageSize: number;
}

/** 平台统一分页响应；业务 ID 仍必须使用 string，不能转成 JavaScript number。 */
export interface PageResult<TRecord> {
  records: TRecord[];
  pageNo: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
