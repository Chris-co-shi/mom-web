export interface RequestContext {
  accessToken?: string;
  correlationId?: string;
  factoryId?: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  getContext?: () => RequestContext;
}

export function createApiClient(options: ApiClientOptions) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const context = options.getContext?.() ?? {};
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Correlation-Id', context.correlationId ?? crypto.randomUUID());
    if (context.accessToken) headers.set('Authorization', `Bearer ${context.accessToken}`);
    if (context.factoryId) headers.set('X-Factory-Id', context.factoryId);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${options.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(`MOM API request failed: ${response.status}`);
    return response.json() as Promise<T>;
  };
}
