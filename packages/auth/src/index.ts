export type WebClientId = 'mom-admin-web' | 'mom-supplier-web' | 'mom-customer-web';
export type WebUserType = 'INTERNAL' | 'SUPPLIER' | 'CUSTOMER';

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BrowserLocation {
  readonly href: string;
  readonly origin: string;
  assign(url: string): void;
}

export interface BrowserHistory {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token?: string;
  scope?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  tokenType: 'Bearer';
  expiresAt: number;
  scope: string[];
}

export interface OidcIdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nonce?: string;
  preferred_username?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthSnapshot {
  status: 'anonymous' | 'authorizing' | 'authenticated' | 'refreshing' | 'error';
  tokenExpiresAt?: number;
  subject?: string;
  error?: string;
}

export interface AuthCallbackResult {
  returnUrl: string;
  claims: OidcIdTokenClaims;
}

export type IdTokenVerifier = (
  idToken: string,
  expected: { issuer: string; clientId: string; nonce: string },
) => Promise<OidcIdTokenClaims>;

export interface AuthRuntimeConfig {
  issuer: string;
  clientId: WebClientId;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes?: string[];
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  endSessionEndpoint?: string;
  fetcher?: typeof fetch;
  transactionStorage?: BrowserStorage;
  location?: BrowserLocation;
  history?: BrowserHistory;
  now?: () => number;
  idTokenVerifier?: IdTokenVerifier;
}

interface PkceTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnUrl: string;
  createdAt: number;
}

interface JwtHeader { alg?: string; kid?: string; }
interface SigningJsonWebKey extends JsonWebKey { kid?: string; kty?: string; }
interface JsonWebKeySet { keys: SigningJsonWebKey[]; }

const AUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const TOKEN_EXPIRY_SKEW_MS = 30 * 1000;

export class AuthProtocolError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'AuthProtocolError';
  }
}

export interface AuthRuntime {
  snapshot(): Readonly<AuthSnapshot>;
  subscribe(listener: (snapshot: Readonly<AuthSnapshot>) => void): () => void;
  hasUsableAccessToken(): boolean;
  getAccessToken(): string | undefined;
  beginLogin(returnUrl?: string): Promise<void>;
  isAuthorizationCallback(url?: string): boolean;
  handleAuthorizationCallback(url?: string): Promise<AuthCallbackResult>;
  refresh(): Promise<string>;
  clear(): void;
  logout(): void;
}

export function createAuthRuntime(config: AuthRuntimeConfig): AuthRuntime {
  const issuer = trimTrailingSlash(config.issuer);
  const fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
  const location = config.location ?? globalThis.location;
  const history = config.history ?? globalThis.history;
  const storage = config.transactionStorage ?? globalThis.sessionStorage;
  const now = config.now ?? Date.now;
  const authorizationEndpoint = config.authorizationEndpoint ?? `${issuer}/oauth2/authorize`;
  const tokenEndpoint = config.tokenEndpoint ?? `${issuer}/oauth2/token`;
  const endSessionEndpoint = config.endSessionEndpoint ?? `${issuer}/connect/logout`;
  const scopes = unique(config.scopes ?? ['openid', 'profile']);
  if (!scopes.includes('openid')) scopes.unshift('openid');
  const verifier = config.idTokenVerifier ?? createDefaultIdTokenVerifier({
    fetcher,
    jwksUri: config.jwksUri ?? `${issuer}/oauth2/jwks`,
    now,
  });
  const transactionKey = `mom.auth.pkce.${config.clientId}`;
  let tokens: TokenSet | undefined;
  let claims: OidcIdTokenClaims | undefined;
  let state: AuthSnapshot = { status: 'anonymous' };
  let refreshFlight: Promise<string> | undefined;
  const listeners = new Set<(snapshot: Readonly<AuthSnapshot>) => void>();

  const publish = (next: AuthSnapshot): void => {
    state = Object.freeze({ ...next });
    for (const listener of listeners) listener(state);
  };
  const clearMemory = (): void => { tokens = undefined; claims = undefined; };

  async function beginLogin(returnUrl = currentRelativeUrl(location)): Promise<void> {
    const transaction: PkceTransaction = {
      state: randomBase64Url(32),
      nonce: randomBase64Url(32),
      codeVerifier: randomBase64Url(64),
      returnUrl: safeReturnUrl(returnUrl, location.origin),
      createdAt: now(),
    };
    storage.setItem(transactionKey, JSON.stringify(transaction));
    const challenge = base64Url(await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(transaction.codeVerifier),
    ));
    const url = new URL(authorizationEndpoint);
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopes.join(' '),
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    };
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    publish({ status: 'authorizing' });
    location.assign(url.toString());
  }

  function isAuthorizationCallback(url = location.href): boolean {
    const parsed = new URL(url, location.origin);
    return ['code', 'error', 'state'].some((name) => parsed.searchParams.has(name));
  }

  async function handleAuthorizationCallback(url = location.href): Promise<AuthCallbackResult> {
    publish({ status: 'authorizing' });
    const parsed = new URL(url, location.origin);
    const transaction = readTransaction(storage, transactionKey, now());
    try {
      const returnedState = parsed.searchParams.get('state');
      if (!returnedState || !constantTimeEqual(returnedState, transaction.state)) {
        throw new AuthProtocolError('Authorization state mismatch', 'state_mismatch');
      }
      const callbackError = parsed.searchParams.get('error');
      if (callbackError) {
        throw new AuthProtocolError(
          parsed.searchParams.get('error_description') ?? callbackError,
          callbackError,
        );
      }
      const code = parsed.searchParams.get('code');
      if (!code) throw new AuthProtocolError('Authorization code is missing', 'missing_code');
      const response = await postToken(fetcher, tokenEndpoint, {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: transaction.codeVerifier,
      });
      if (!response.id_token) {
        throw new AuthProtocolError('OIDC ID Token is missing', 'missing_id_token');
      }
      claims = await verifier(response.id_token, {
        issuer,
        clientId: config.clientId,
        nonce: transaction.nonce,
      });
      tokens = toTokenSet(response, now());
      publish({ status: 'authenticated', tokenExpiresAt: tokens.expiresAt, subject: claims.sub });
      history.replaceState(null, '', callbackAddressWithoutProtocolParameters(parsed));
      return { returnUrl: transaction.returnUrl, claims };
    }
    catch (error) {
      clearMemory();
      const normalized = normalizeError(error);
      publish({ status: 'error', error: normalized.message });
      throw normalized;
    }
    finally {
      storage.removeItem(transactionKey);
    }
  }

  async function refresh(): Promise<string> {
    if (refreshFlight) return refreshFlight;
    if (!tokens?.refreshToken) {
      throw new AuthProtocolError('Refresh Token is unavailable', 'missing_refresh_token');
    }
    const refreshToken = tokens.refreshToken;
    refreshFlight = (async () => {
      publish({ status: 'refreshing', tokenExpiresAt: tokens?.expiresAt, subject: claims?.sub });
      try {
        const response = await postToken(fetcher, tokenEndpoint, {
          grant_type: 'refresh_token',
          client_id: config.clientId,
          refresh_token: refreshToken,
        });
        tokens = toTokenSet(response, now(), tokens?.idToken);
        publish({ status: 'authenticated', tokenExpiresAt: tokens.expiresAt, subject: claims?.sub });
        return tokens.accessToken;
      }
      catch (error) {
        clearMemory();
        const normalized = normalizeError(error);
        publish({ status: 'error', error: normalized.message });
        throw normalized;
      }
      finally {
        refreshFlight = undefined;
      }
    })();
    return refreshFlight;
  }

  function clear(): void {
    clearMemory();
    storage.removeItem(transactionKey);
    publish({ status: 'anonymous' });
  }

  function logout(): void {
    const idToken = tokens?.idToken;
    clear();
    const url = new URL(endSessionEndpoint);
    url.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri);
    if (idToken) url.searchParams.set('id_token_hint', idToken);
    location.assign(url.toString());
  }

  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    hasUsableAccessToken: () => Boolean(tokens && tokens.expiresAt - TOKEN_EXPIRY_SKEW_MS > now()),
    getAccessToken: () => tokens && tokens.expiresAt - TOKEN_EXPIRY_SKEW_MS > now()
      ? tokens.accessToken : undefined,
    beginLogin,
    isAuthorizationCallback,
    handleAuthorizationCallback,
    refresh,
    clear,
    logout,
  };
}

function readTransaction(storage: BrowserStorage, key: string, now: number): PkceTransaction {
  const raw = storage.getItem(key);
  if (!raw) throw new AuthProtocolError('PKCE transaction is missing', 'missing_transaction');
  let value: Partial<PkceTransaction>;
  try { value = JSON.parse(raw) as Partial<PkceTransaction>; }
  catch { throw new AuthProtocolError('PKCE transaction is invalid', 'invalid_transaction'); }
  if (!value.state || !value.nonce || !value.codeVerifier || !value.returnUrl || !value.createdAt) {
    throw new AuthProtocolError('PKCE transaction is incomplete', 'invalid_transaction');
  }
  if (now - value.createdAt > AUTH_TRANSACTION_TTL_MS || value.createdAt > now + 30_000) {
    throw new AuthProtocolError('PKCE transaction has expired', 'expired_transaction');
  }
  return value as PkceTransaction;
}

async function postToken(
  fetcher: typeof fetch,
  endpoint: string,
  parameters: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(parameters),
    credentials: 'omit',
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new AuthProtocolError(
      stringField(payload, 'error_description') ?? 'Token request failed',
      stringField(payload, 'error') ?? `token_http_${response.status}`,
    );
  }
  const accessToken = stringField(payload, 'access_token');
  const refreshToken = stringField(payload, 'refresh_token');
  const tokenType = stringField(payload, 'token_type');
  const expiresIn = numberField(payload, 'expires_in');
  if (!accessToken || !refreshToken || tokenType?.toLowerCase() !== 'bearer' || !expiresIn) {
    throw new AuthProtocolError('Token response is incomplete', 'invalid_token_response');
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
    expires_in: expiresIn,
    id_token: stringField(payload, 'id_token'),
    scope: stringField(payload, 'scope'),
  };
}

function toTokenSet(response: TokenResponse, now: number, previousIdToken?: string): TokenSet {
  if (!Number.isFinite(response.expires_in) || response.expires_in <= 0) {
    throw new AuthProtocolError('Token expiry is invalid', 'invalid_token_expiry');
  }
  return Object.freeze({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    idToken: response.id_token ?? previousIdToken,
    tokenType: 'Bearer' as const,
    expiresAt: now + response.expires_in * 1000,
    scope: response.scope?.split(/\s+/).filter(Boolean) ?? [],
  });
}

function createDefaultIdTokenVerifier(options: {
  fetcher: typeof fetch;
  jwksUri: string;
  now: () => number;
}): IdTokenVerifier {
  let keysFlight: Promise<JsonWebKeySet> | undefined;
  return async (idToken, expected) => {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new AuthProtocolError('ID Token is malformed', 'invalid_id_token');
    const header = decodeJson<JwtHeader>(parts[0]!);
    const tokenClaims = decodeJson<OidcIdTokenClaims>(parts[1]!);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new AuthProtocolError('ID Token algorithm is not allowed', 'invalid_id_token_alg');
    }
    keysFlight ??= fetchJwks(options.fetcher, options.jwksUri).finally(() => { keysFlight = undefined; });
    const jwk = (await keysFlight).keys.find(
      (candidate) => candidate.kid === header.kid && candidate.kty === 'RSA',
    );
    if (!jwk) throw new AuthProtocolError('ID Token signing key is unknown', 'unknown_signing_key');
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlBytes(parts[2]!),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    if (!verified) {
      throw new AuthProtocolError('ID Token signature is invalid', 'invalid_id_token_signature');
    }
    validateIdTokenClaims(tokenClaims, expected, options.now());
    return tokenClaims;
  };
}

async function fetchJwks(fetcher: typeof fetch, uri: string): Promise<JsonWebKeySet> {
  const response = await fetcher(uri, {
    headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store',
  });
  if (!response.ok) throw new AuthProtocolError('Unable to load IAM signing keys', 'jwks_unavailable');
  const payload = await readJson(response);
  const keys = Array.isArray(payload.keys) ? payload.keys as SigningJsonWebKey[] : undefined;
  if (!keys) throw new AuthProtocolError('IAM signing key response is invalid', 'invalid_jwks');
  return { keys };
}

function validateIdTokenClaims(
  tokenClaims: OidcIdTokenClaims,
  expected: { issuer: string; clientId: string; nonce: string },
  now: number,
): void {
  if (tokenClaims.iss !== expected.issuer) {
    throw new AuthProtocolError('ID Token issuer mismatch', 'issuer_mismatch');
  }
  const audience = Array.isArray(tokenClaims.aud) ? tokenClaims.aud : [tokenClaims.aud];
  if (!audience.includes(expected.clientId)) {
    throw new AuthProtocolError('ID Token audience mismatch', 'audience_mismatch');
  }
  if (!tokenClaims.sub || !Number.isFinite(tokenClaims.exp)
      || tokenClaims.exp * 1000 <= now - TOKEN_EXPIRY_SKEW_MS) {
    throw new AuthProtocolError('ID Token has expired or lacks a subject', 'invalid_id_token_claims');
  }
  if (!tokenClaims.nonce || !constantTimeEqual(tokenClaims.nonce, expected.nonce)) {
    throw new AuthProtocolError('ID Token nonce mismatch', 'nonce_mismatch');
  }
}

function callbackAddressWithoutProtocolParameters(url: URL): string {
  const cleaned = new URL(url.toString());
  for (const name of ['code', 'state', 'error', 'error_description', 'error_uri', 'iss', 'session_state']) {
    cleaned.searchParams.delete(name);
  }
  return `${cleaned.pathname}${cleaned.search}${cleaned.hash}`;
}

function safeReturnUrl(value: string, origin: string): string {
  const candidate = new URL(value, origin);
  return candidate.origin === origin
    ? `${candidate.pathname}${candidate.search}${candidate.hash}`
    : '/';
}

function currentRelativeUrl(location: BrowserLocation): string {
  const url = new URL(location.href, location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

function randomBase64Url(bytes: number): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

function base64Url(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  try { return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T; }
  catch { throw new AuthProtocolError('JWT JSON is invalid', 'invalid_jwt_json'); }
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try { return await response.json() as Record<string, unknown>; }
  catch { throw new AuthProtocolError('IAM returned invalid JSON', 'invalid_json'); }
}

function stringField(value: Record<string, unknown>, name: string): string | undefined {
  return typeof value[name] === 'string' ? value[name] : undefined;
}

function numberField(value: Record<string, unknown>, name: string): number | undefined {
  return typeof value[name] === 'number' ? value[name] : undefined;
}

function trimTrailingSlash(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, '');
  if (!normalized) throw new AuthProtocolError('IAM issuer is required', 'missing_issuer');
  return normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeError(error: unknown): AuthProtocolError {
  if (error instanceof AuthProtocolError) return error;
  return new AuthProtocolError(
    error instanceof Error ? error.message : 'Authentication failed',
    'auth_failed',
  );
}
