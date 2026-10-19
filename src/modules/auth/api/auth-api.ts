import { apiPath } from '../../../shared/api/config';
import { httpClient } from '../../../shared/api/http-client';

/** 登录请求；密码只发送给 Auth 登录端点，不进入会话存储。 */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Auth 签发的 Opaque Token 响应。 */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

/** 当前认证用户快照；version 用于自助修改的乐观并发控制。 */
export interface CurrentUser {
  userId: string;
  username: string;
  displayName: string;
  version: number;
}

/** Resource Server 已验证的当前会话及 authority 快照。 */
export interface CurrentSessionResponse {
  user: CurrentUser;
  authorization: { authorities: string[] };
  session: { expiresAt: string };
}

/** 自助修改展示名称请求。 */
export interface UpdateOwnProfileRequest {
  displayName: string;
  version: number;
}

/** 自助修改密码请求；必须同时携带当前密码和读取到的 version。 */
export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
  version: number;
}

/** 自助接口不接收目标用户 ID，也不复用管理员重置接口。 */
export function updateOwnProfile(request: UpdateOwnProfileRequest): Promise<CurrentSessionResponse> {
  return httpClient.result({ path: apiPath('auth', '/users/me/profile'), method: 'PUT', body: request });
}

/** 原密码不做规范化；统一请求层不自动重试写入。 */
export function changeOwnPassword(request: ChangeOwnPasswordRequest): Promise<CurrentSessionResponse> {
  return httpClient.result({ path: apiPath('auth', '/users/change-password/me'), method: 'PUT', body: request });
}

/** 通过 Gateway 调用 Mini Auth V1 登录端点。 */
export function login(request: LoginRequest): Promise<LoginResponse> {
  return httpClient.result<LoginResponse>({
    path: apiPath('auth', '/sessions/login'),
    method: 'POST',
    body: request,
  });
}

/** 读取 Resource Server 已验证的当前 Opaque Token 权限快照。 */
export function getCurrentSession(): Promise<CurrentSessionResponse> {
  return httpClient.result<CurrentSessionResponse>({
    path: apiPath('auth', '/users/me'),
    method: 'GET',
  });
}

/** 注销当前已经通过 Resource Server 验证的 Opaque Token。 */
export function logout(): Promise<void> {
  return httpClient.result<void>({
    path: apiPath('auth', '/sessions/logout'),
    method: 'POST',
  });
}
