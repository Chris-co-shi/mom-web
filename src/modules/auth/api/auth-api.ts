import { apiPath } from '../../../shared/api/config';
import { httpClient } from '../../../shared/api/http-client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export interface CurrentUser {
  userId: string;
  username: string;
  displayName: string;
  version: number;
}

export interface CurrentSessionResponse {
  user: CurrentUser;
  authorization: { authorities: string[] };
  session: { expiresAt: string };
}

export interface UpdateOwnProfileRequest {
  displayName: string;
  version: number;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
  version: number;
}

/** 自助接口不接收目标用户 ID，也不复用管理员重置接口。 */
export function updateOwnProfile(request: UpdateOwnProfileRequest): Promise<CurrentSessionResponse> {
  return httpClient.result({ path: apiPath('auth', '/me/profile'), method: 'PUT', body: request });
}

/** 原密码不做规范化；统一请求层不自动重试写入。 */
export function changeOwnPassword(request: ChangeOwnPasswordRequest): Promise<CurrentSessionResponse> {
  return httpClient.result({ path: apiPath('auth', '/me/password'), method: 'PUT', body: request });
}

/** 通过 Gateway 调用 Mini Auth V1 登录端点。 */
export function login(request: LoginRequest): Promise<LoginResponse> {
  return httpClient.result<LoginResponse>({
    path: apiPath('auth', '/login'),
    method: 'POST',
    body: request,
  });
}

/** 读取 Resource Server 已验证的当前 Opaque Token 权限快照。 */
export function getCurrentSession(): Promise<CurrentSessionResponse> {
  return httpClient.result<CurrentSessionResponse>({
    path: apiPath('auth', '/me'),
    method: 'GET',
  });
}

/** 注销当前已经通过 Resource Server 验证的 Opaque Token。 */
export function logout(): Promise<void> {
  return httpClient.result<void>({
    path: apiPath('auth', '/logout'),
    method: 'POST',
  });
}
