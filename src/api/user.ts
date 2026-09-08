import { bearerHeaders, request } from './http';

export interface User {
  id: string;
  username: string;
  displayName: string;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  records: T[];
  pageNo: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListUsersParams {
  token: string;
  pageNo: number;
  pageSize: number;
}

export function listUsers(params: ListUsersParams) {
  const query = new URLSearchParams({
    pageNo: String(params.pageNo),
    pageSize: String(params.pageSize),
  });

  return request<PageResult<User>>(`/auth/users?${query.toString()}`, {
    headers: bearerHeaders(params.token),
  });
}
