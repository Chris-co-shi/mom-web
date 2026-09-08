export interface ApiResult<T> {
  code: string;
  message: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const text = await response.text();
  let result: ApiResult<T> | null = null;

  if (text) {
    try {
      result = JSON.parse(text) as ApiResult<T>;
    } catch {
      throw new ApiError(response.status, 'INVALID_RESPONSE', '服务返回了无法识别的响应');
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      result?.code ?? 'HTTP_ERROR',
      result?.message ?? `请求失败（HTTP ${response.status}）`,
    );
  }

  if (!result) {
    throw new ApiError(response.status, 'EMPTY_RESPONSE', '服务没有返回响应数据');
  }

  if (result.code !== '0') {
    throw new ApiError(response.status, result.code, result.message);
  }

  return result.data;
}

export function bearerHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}
