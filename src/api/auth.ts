import { bearerHeaders, request } from './http';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(token: string) {
  return request<null>('/auth/logout', {
    method: 'POST',
    headers: bearerHeaders(token),
  });
}
