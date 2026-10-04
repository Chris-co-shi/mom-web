import type { ApiFieldError } from './contracts';

export type ApiErrorKind =
  | 'cancelled'
  | 'network'
  | 'timeout'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'business'
  | 'protocol'
  | 'http';

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  code: string;
  status?: number;
  correlationId?: string;
  fieldErrors?: ApiFieldError[];
  retryable?: boolean;
  resultUnknown?: boolean;
  cause?: unknown;
}

/**
 * 页面可稳定判断的请求错误。原始响应体不会写入 message，避免意外暴露后端内部信息。
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly status?: number;
  readonly correlationId?: string;
  readonly fieldErrors: readonly ApiFieldError[];
  readonly retryable: boolean;
  readonly resultUnknown: boolean;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status;
    this.correlationId = options.correlationId;
    this.fieldErrors = options.fieldErrors ?? [];
    this.retryable = options.retryable ?? false;
    this.resultUnknown = options.resultUnknown ?? false;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
