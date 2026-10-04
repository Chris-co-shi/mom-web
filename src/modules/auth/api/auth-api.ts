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

/** 通过 Gateway 调用 Mini Auth V1 登录端点。 */
export function login(request: LoginRequest): Promise<LoginResponse> {
  return httpClient.result<LoginResponse>({
    path: apiPath('auth', '/login'),
    method: 'POST',
    body: request,
  });
}

/** 注销当前已经通过 Resource Server 验证的 Opaque Token。 */
export function logout(): Promise<void> {
  return httpClient.result<void>({
    path: apiPath('auth', '/logout'),
    method: 'POST',
  });
}
