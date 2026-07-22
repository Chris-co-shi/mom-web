export type IamStatus = 'ENABLED' | 'DISABLED';
export type IamUserType = 'INTERNAL' | 'SUPPLIER' | 'CUSTOMER';
export type PartyType = 'SUPPLIER' | 'CUSTOMER';

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  userType: IamUserType;
  status: IamStatus;
  failedLoginCount: number;
  lockedUntil: string | null;
  passwordChangeRequired: boolean;
  lastLoginAt: string | null;
  version: number;
}

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  applicableUserType: IamUserType;
  status: IamStatus;
  builtIn: boolean;
  description: string | null;
  version: number;
}

export interface PermissionRow {
  id: string;
  code: string;
  name: string;
  domainCode: string;
  resourceCode: string;
  actionCode: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: IamStatus;
  description: string | null;
}

export interface PartyBindingView {
  id: string;
  partyType: PartyType;
  partyId: string;
  status: IamStatus;
  version: number;
}

export interface UserAuthorizationView {
  userId: string;
  userVersion: number;
  roleIds: string[];
  factoryIds: string[];
  mobileAccessEnabled: boolean;
  partyBinding: PartyBindingView | null;
}

export interface RolePermissionView {
  roleId: string;
  roleVersion: number;
  permissionIds: string[];
}

export interface SessionRow {
  id: string;
  userId: string;
  clientId: string;
  channel: string;
  status: string;
  loginAt: string;
  lastRefreshAt: string | null;
  absoluteExpiresAt: string;
  latestAccessTokenExpiresAt: string | null;
  deviceName: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface AuditRow {
  id: string;
  eventType: string;
  eventCategory: string;
  riskLevel: string;
  result: string;
  actorType: string;
  actorUserId: string | null;
  actorClientId: string | null;
  targetType: string | null;
  targetId: string | null;
  sessionId: string | null;
  reasonCode: string | null;
  reasonDetail: string | null;
  changeSummary: string;
  correlationId: string | null;
  occurredAt: string;
}

export interface ClientRow {
  clientId: string;
  applicationCode: string;
  channel: string;
  allowedUserType: IamUserType;
  mobileAccessRequired: boolean;
  status: IamStatus;
  description: string | null;
  version: number;
  clientName: string;
  redirectUris: string;
  postLogoutRedirectUris: string;
  scopes: string;
}

export interface ApiTransport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: Record<string, unknown>): Promise<T>;
  put<T>(path: string, body?: Record<string, unknown>): Promise<T>;
  delete<T>(path: string, options?: { body?: Record<string, unknown> }): Promise<T>;
}

export interface IamAdminClient {
  listUsers(filters?: { userType?: IamUserType; status?: IamStatus }): Promise<UserRow[]>;
  getUser(userId: string): Promise<UserRow>;
  getUserAuthorizations(userId: string): Promise<UserAuthorizationView>;
  createUser(command: Record<string, unknown>): Promise<UserRow>;
  updateUser(userId: string, command: { displayName: string; version: number }): Promise<UserRow>;
  setUserStatus(userId: string, command: { status: IamStatus; version: number; reason: string }): Promise<UserRow>;
  unlockUser(userId: string, command: { version: number; reason: string }): Promise<UserRow>;
  resetCredential(userId: string, command: { temporaryPassword: string; version: number; reason: string }): Promise<UserRow>;
  deleteUser(userId: string, command: { version: number; reason: string }): Promise<void>;
  replaceUserRoles(userId: string, command: { roleIds: string[]; version: number; reason: string }): Promise<UserAuthorizationView>;
  replaceFactoryScopes(userId: string, command: { factoryIds: string[]; version: number; reason: string }): Promise<UserAuthorizationView>;
  setMobileAccess(userId: string, command: { enabled: boolean; version: number; reason: string }): Promise<UserAuthorizationView>;
  rebindParty(userId: string, command: { partyType: PartyType; partyId: string; version: number; reason: string }): Promise<UserAuthorizationView>;
  listRoles(userType?: IamUserType): Promise<RoleRow[]>;
  getRolePermissions(roleId: string): Promise<RolePermissionView>;
  createRole(command: Record<string, unknown>): Promise<RoleRow>;
  updateRole(roleId: string, command: Record<string, unknown>): Promise<RoleRow>;
  replaceRolePermissions(roleId: string, command: { permissionIds: string[]; version: number; reason: string }): Promise<RolePermissionView>;
  listPermissions(domainCode?: string): Promise<PermissionRow[]>;
  listSessions(filters?: { userId?: string; status?: string }): Promise<SessionRow[]>;
  revokeSession(sessionId: string, reason: string): Promise<void>;
  revokeUserSessions(userId: string, reason: string): Promise<{ revoked: number }>;
  listAudit(filters?: { category?: string; targetId?: string }): Promise<AuditRow[]>;
  listClients(): Promise<ClientRow[]>;
  setClientStatus(clientId: string, command: { status: IamStatus; version: number; reason: string }): Promise<ClientRow>;
}

export function createIamAdminClient(transport: ApiTransport): IamAdminClient {
  const base = '/api/iam/admin';
  const id = encodeURIComponent;
  return {
    listUsers: (filters = {}) => transport.get(`${base}/users${query(filters)}`),
    getUser: (userId) => transport.get(`${base}/users/${id(userId)}`),
    getUserAuthorizations: (userId) => transport.get(`${base}/users/${id(userId)}/authorizations`),
    createUser: (command) => transport.post(`${base}/users`, command),
    updateUser: (userId, command) => transport.put(`${base}/users/${id(userId)}`, command),
    setUserStatus: (userId, command) => transport.put(`${base}/users/${id(userId)}/status`, command),
    unlockUser: (userId, command) => transport.post(`${base}/users/${id(userId)}/unlock`, command),
    resetCredential: (userId, command) => transport.post(`${base}/users/${id(userId)}/credential-reset`, command),
    deleteUser: (userId, command) => transport.delete(`${base}/users/${id(userId)}`, { body: command }),
    replaceUserRoles: (userId, command) => transport.put(`${base}/users/${id(userId)}/roles`, command),
    replaceFactoryScopes: (userId, command) => transport.put(`${base}/users/${id(userId)}/factory-scopes`, command),
    setMobileAccess: (userId, command) => transport.put(`${base}/users/${id(userId)}/mobile-access`, command),
    rebindParty: (userId, command) => transport.put(`${base}/users/${id(userId)}/party-binding`, command),
    listRoles: (userType) => transport.get(`${base}/roles${query({ userType })}`),
    getRolePermissions: (roleId) => transport.get(`${base}/roles/${id(roleId)}/permissions`),
    createRole: (command) => transport.post(`${base}/roles`, command),
    updateRole: (roleId, command) => transport.put(`${base}/roles/${id(roleId)}`, command),
    replaceRolePermissions: (roleId, command) => transport.put(`${base}/roles/${id(roleId)}/permissions`, command),
    listPermissions: (domainCode) => transport.get(`${base}/permissions${query({ domainCode })}`),
    listSessions: (filters = {}) => transport.get(`${base}/sessions${query(filters)}`),
    revokeSession: (sessionId, reason) => transport.post(`${base}/sessions/${id(sessionId)}/revoke`, { reason }),
    revokeUserSessions: (userId, reason) => transport.post(`${base}/users/${id(userId)}/sessions/revoke`, { reason }),
    listAudit: (filters = {}) => transport.get(`${base}/security-audit${query(filters)}`),
    listClients: () => transport.get(`${base}/oauth-clients`),
    setClientStatus: (clientId, command) => transport.put(`${base}/oauth-clients/${id(clientId)}/status`, command),
  };
}

export interface AdminErrorView {
  kind: 'forbidden' | 'not_found' | 'stale' | 'unknown_result' | 'failure';
  title: string;
  message: string;
  correlationId?: string;
  reloadRequired: boolean;
}

export function describeAdminError(error: unknown): AdminErrorView {
  const value = error as { name?: string; status?: number; code?: string; message?: string; correlationId?: string };
  if (value?.status === 403) return view('forbidden', '无操作权限', '当前账号缺少执行该操作的 Permission。', value, false);
  if (value?.status === 404) return view('not_found', '对象不存在或不可访问', '无法确认对象是否存在于其他数据范围。', value, false);
  if (value?.status === 409 && value.code === 'stale_version') {
    return view('stale', '数据已被其他管理员修改', '已重新读取最新快照，请核对差异后再次确认；系统不会自动覆盖。', value, true);
  }
  if (value?.name === 'MomNetworkError') {
    return view('unknown_result', '命令结果未知', '网络中断后不会自动重试高风险命令，请先查询最终状态。', value, true);
  }
  return view('failure', '操作失败', value?.message || '服务暂时不可用，请稍后显式重试。', value, false);
}

function view(
  kind: AdminErrorView['kind'],
  title: string,
  message: string,
  value: { correlationId?: string },
  reloadRequired: boolean,
): AdminErrorView {
  return { kind, title, message, correlationId: value.correlationId, reloadRequired };
}

function query(values: Record<string, string | undefined>): string {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) parameters.set(key, value.trim());
  }
  const encoded = parameters.toString();
  return encoded ? `?${encoded}` : '';
}
