/** Gateway 对外暴露的 bounded context 路径。 */
export const API_PATHS = {
  auth: '/auth',
  system: '/system',
  mdm: '/mdm',
} as const;

export type ApiContext = keyof typeof API_PATHS;

const configuredBaseUrl = (import.meta.env.VITE_MOM_API_BASE_URL ?? '').trim();

/** 浏览器请求基地址；空值表示由当前站点同源代理到 Gateway。 */
export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '');

function readTimeout(): number {
  const configured = Number(import.meta.env.VITE_MOM_API_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
}

export const API_TIMEOUT_MS = readTimeout();

/**
 * 拼接 Gateway URL。调用方必须传绝对路径，避免模块绕过统一 context path。
 */
export function resolveApiUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError(`API path 必须是站内绝对路径且不能以 // 开头：${path}`);
  }
  return `${API_BASE_URL}${path}`;
}

/** 在已登记的 context path 下构造模块端点。 */
export function apiPath(context: ApiContext, path = ''): string {
  if (path && (!path.startsWith('/') || path.startsWith('//'))) {
    throw new TypeError(`模块 API path 必须以单个 / 开头：${path}`);
  }
  return `/api${API_PATHS[context]}${path}`;
}
