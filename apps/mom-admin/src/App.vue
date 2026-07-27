<script setup lang="ts">
import type { PermissionCode } from '@mom/access';
import {
  describeAdminError,
  type AdminErrorView,
  type AuditRow,
  type ClientRow,
  type IamStatus,
  type IamUserType,
  type PartyType,
  type PermissionRow,
  type RolePermissionView,
  type RoleRow,
  type SessionRow,
  type UserAuthorizationView,
  type UserRow,
} from '@mom/iam-admin';
import { Modal, message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { access, iamAdmin, login, logout, runtimeState, selectFactory } from './runtime';

type Section = 'users' | 'roles' | 'permissions' | 'sessions' | 'audit' | 'clients';

const gatewayUrl = import.meta.env.VITE_MOM_GATEWAY_URL ?? '/api';
const section = ref<Section>('users');
const sidebarCollapsed = ref(false);
const busy = ref(false);
const notice = ref<AdminErrorView>();

const users = ref<UserRow[]>([]);
const roles = ref<RoleRow[]>([]);
const permissions = ref<PermissionRow[]>([]);
const sessions = ref<SessionRow[]>([]);
const audits = ref<AuditRow[]>([]);
const clients = ref<ClientRow[]>([]);
const selectedUser = ref<UserRow>();
const userAuthorization = ref<UserAuthorizationView>();
const selectedRole = ref<RoleRow>();
const rolePermissions = ref<RolePermissionView>();

const userFilters = reactive<{ userType?: IamUserType; status?: IamStatus }>({});
const sessionFilters = reactive({ userId: '', status: '' });
const auditFilters = reactive({ category: '', targetId: '' });
const authorizationDraft = reactive({ roleIds: [] as string[], factoryIds: [] as string[], mobileAccessEnabled: false, partyType: 'SUPPLIER' as PartyType, partyId: '', reason: '' });
const rolePermissionDraft = reactive({ permissionIds: [] as string[], reason: '' });
const sessionReason = ref('管理员主动撤销');
const clientReason = ref('管理员调整客户端状态');
const temporaryPassword = ref('');

const createUserOpen = ref(false);
const editUserOpen = ref(false);
const createRoleOpen = ref(false);
const editRoleOpen = ref(false);
const createUserForm = reactive({ username: '', displayName: '', userType: 'INTERNAL' as IamUserType, initialPassword: '', partyType: 'SUPPLIER' as PartyType, partyId: '' });
const editUserName = ref('');
const createRoleForm = reactive({ code: '', name: '', applicableUserType: 'INTERNAL' as IamUserType, description: '' });
const editRoleForm = reactive({ name: '', description: '', status: 'ENABLED' as IamStatus, reason: '' });

const sectionDefinitions: { key: Section; label: string; permission: PermissionCode }[] = [
  { key: 'users', label: '用户与授权', permission: 'iam:user:read' },
  { key: 'roles', label: '角色配置', permission: 'iam:role:read' },
  { key: 'permissions', label: 'Permission 目录', permission: 'iam:permission:read' },
  { key: 'sessions', label: 'Session 管理', permission: 'iam:session:read' },
  { key: 'audit', label: '安全审计', permission: 'iam:audit:read' },
  { key: 'clients', label: 'OAuth Client', permission: 'iam:client:read' },
];
const visibleSections = computed(() => sectionDefinitions.filter((item) => can(item.permission)));
const currentSectionLabel = computed(() => sectionDefinitions.find((item) => item.key === section.value)?.label ?? '工作台');
const compatibleRoles = computed(() => roles.value.filter((role) => role.status === 'ENABLED' && role.applicableUserType === selectedUser.value?.userType));
const activePermissions = computed(() => permissions.value.filter((permission) => permission.status === 'ENABLED'));
const isCurrentUser = computed(() => selectedUser.value?.id === runtimeState.user?.userId);

function can(permission: PermissionCode): boolean {
  return access.hasPermission(permission);
}

async function loadCurrentSection(): Promise<void> {
  if (section.value === 'users') await loadUsers();
  if (section.value === 'roles') await loadRoles();
  if (section.value === 'permissions') await loadPermissions();
  if (section.value === 'sessions') await loadSessions();
  if (section.value === 'audit') await loadAudit();
  if (section.value === 'clients') await loadClients();
}

async function query<T>(operation: () => Promise<T>, apply: (result: T) => void): Promise<void> {
  busy.value = true;
  notice.value = undefined;
  try {
    apply(await operation());
  }
  catch (error) {
    notice.value = describeAdminError(error);
  }
  finally {
    busy.value = false;
  }
}

async function command<T>(operation: () => Promise<T>, apply: (result: T) => void, reload?: () => Promise<void>): Promise<void> {
  busy.value = true;
  notice.value = undefined;
  try {
    apply(await operation());
    message.success('操作已提交并取得服务端最新状态');
  }
  catch (error) {
    const detail = describeAdminError(error);
    notice.value = detail;
    if (detail.reloadRequired && reload) await reload();
    throw error;
  }
  finally {
    busy.value = false;
  }
}

function confirmHighRisk(title: string, operation: () => Promise<void>, reason: string): void {
  if (!reason.trim()) {
    message.warning('高风险操作必须填写审计原因');
    return;
  }
  Modal.confirm({
    title,
    content: `审计原因：${reason.trim()}。服务端将执行最终安全校验。`,
    okText: '确认执行',
    okType: 'danger',
    cancelText: '取消',
    onOk: operation,
  });
}

async function loadUsers(): Promise<void> {
  await query(() => iamAdmin.listUsers(userFilters), (result) => { users.value = result; });
}

async function selectUser(user: UserRow): Promise<void> {
  selectedUser.value = user;
  editUserName.value = user.displayName;
  await Promise.all([loadUserAuthorization(), can('iam:role:read') ? loadRoles(false) : Promise.resolve()]);
}

async function loadUserAuthorization(): Promise<void> {
  const user = selectedUser.value;
  if (!user) return;
  await query(() => iamAdmin.getUserAuthorizations(user.id), applyUserAuthorization);
}

function applyUserAuthorization(snapshot: UserAuthorizationView): void {
  userAuthorization.value = snapshot;
  authorizationDraft.roleIds = [...snapshot.roleIds];
  authorizationDraft.factoryIds = [...snapshot.factoryIds];
  authorizationDraft.mobileAccessEnabled = snapshot.mobileAccessEnabled;
  authorizationDraft.partyType = snapshot.partyBinding?.partyType ?? (selectedUser.value?.userType === 'CUSTOMER' ? 'CUSTOMER' : 'SUPPLIER');
  authorizationDraft.partyId = snapshot.partyBinding?.partyId ?? '';
  if (selectedUser.value) selectedUser.value = { ...selectedUser.value, version: snapshot.userVersion };
}

async function createUser(): Promise<void> {
  const external = createUserForm.userType !== 'INTERNAL';
  await command(() => iamAdmin.createUser({
    username: createUserForm.username,
    displayName: createUserForm.displayName,
    userType: createUserForm.userType,
    initialPassword: createUserForm.initialPassword,
    partyType: external ? createUserForm.partyType : null,
    partyId: external ? createUserForm.partyId : null,
  }), (created) => {
    createUserOpen.value = false;
    users.value = [created, ...users.value];
    resetCreateUser();
  });
}

function resetCreateUser(): void {
  Object.assign(createUserForm, { username: '', displayName: '', userType: 'INTERNAL', initialPassword: '', partyType: 'SUPPLIER', partyId: '' });
}

async function updateUser(): Promise<void> {
  const user = selectedUser.value;
  if (!user) return;
  await command(() => iamAdmin.updateUser(user.id, { displayName: editUserName.value, version: user.version }), (updated) => {
    replaceUserRow(updated);
    editUserOpen.value = false;
  }, loadUserAuthorization);
  await loadUserAuthorization();
}

function replaceUserRow(updated: UserRow): void {
  users.value = users.value.map((user) => user.id === updated.id ? updated : user);
  selectedUser.value = updated;
}

function changeUserStatus(status: IamStatus): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk(`${status === 'ENABLED' ? '启用' : '禁用'}用户 ${user.username}`, async () => {
    await command(() => iamAdmin.setUserStatus(user.id, { status, version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function unlockUser(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk(`解锁用户 ${user.username}`, async () => {
    await command(() => iamAdmin.unlockUser(user.id, { version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function resetCredential(): void {
  const user = selectedUser.value;
  if (!user || !temporaryPassword.value) {
    message.warning('请输入临时密码');
    return;
  }
  confirmHighRisk(`重置用户 ${user.username} 的凭证`, async () => {
    await command(() => iamAdmin.resetCredential(user.id, { temporaryPassword: temporaryPassword.value, version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    temporaryPassword.value = '';
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function deleteUser(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk(`逻辑删除用户 ${user.username}`, async () => {
    await command(() => iamAdmin.deleteUser(user.id, { version: user.version, reason: authorizationDraft.reason }), () => {
      users.value = users.value.filter((item) => item.id !== user.id);
      selectedUser.value = undefined;
      userAuthorization.value = undefined;
    });
  }, authorizationDraft.reason);
}

function saveRoles(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk('替换用户角色', () => command(() => iamAdmin.replaceUserRoles(user.id, {
    roleIds: authorizationDraft.roleIds, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function saveFactories(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk('替换 Factory Scope', () => command(() => iamAdmin.replaceFactoryScopes(user.id, {
    factoryIds: authorizationDraft.factoryIds, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function saveMobileAccess(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk('变更 Mobile Access', () => command(() => iamAdmin.setMobileAccess(user.id, {
    enabled: authorizationDraft.mobileAccessEnabled, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function savePartyBinding(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk('重新绑定外部主体', () => command(() => iamAdmin.rebindParty(user.id, {
    partyType: authorizationDraft.partyType, partyId: authorizationDraft.partyId,
    version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function revokeAllUserSessions(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk(`撤销 ${user.username} 的全部 Session`, () => command(
    () => iamAdmin.revokeUserSessions(user.id, authorizationDraft.reason),
    (result) => { message.info(`已撤销 ${result.revoked} 个 Session`); },
  ), authorizationDraft.reason);
}

async function loadRoles(showBusy = true): Promise<void> {
  if (!can('iam:role:read')) return;
  if (showBusy) await query(() => iamAdmin.listRoles(), (result) => { roles.value = result; });
  else {
    try { roles.value = await iamAdmin.listRoles(); }
    catch (error) { notice.value = describeAdminError(error); }
  }
}

async function selectRole(role: RoleRow): Promise<void> {
  selectedRole.value = role;
  Object.assign(editRoleForm, { name: role.name, description: role.description ?? '', status: role.status, reason: '' });
  if (can('iam:role:read')) await loadRolePermissions();
  if (can('iam:permission:read') && permissions.value.length === 0) await loadPermissions();
}

async function loadRolePermissions(): Promise<void> {
  const role = selectedRole.value;
  if (!role) return;
  await query(() => iamAdmin.getRolePermissions(role.id), applyRolePermissions);
}

function applyRolePermissions(snapshot: RolePermissionView): void {
  rolePermissions.value = snapshot;
  rolePermissionDraft.permissionIds = [...snapshot.permissionIds];
  if (selectedRole.value) selectedRole.value = { ...selectedRole.value, version: snapshot.roleVersion };
}

async function createRole(): Promise<void> {
  await command(() => iamAdmin.createRole({ ...createRoleForm }), (created) => {
    roles.value = [created, ...roles.value];
    createRoleOpen.value = false;
    Object.assign(createRoleForm, { code: '', name: '', applicableUserType: 'INTERNAL', description: '' });
  });
}

async function updateRole(): Promise<void> {
  const role = selectedRole.value;
  if (!role) return;
  await command(() => iamAdmin.updateRole(role.id, {
    name: editRoleForm.name, description: editRoleForm.description, status: editRoleForm.status,
    version: role.version, reason: editRoleForm.reason,
  }), (updated) => {
    roles.value = roles.value.map((item) => item.id === updated.id ? updated : item);
    selectedRole.value = updated;
    editRoleOpen.value = false;
  }, loadRolePermissions);
  await loadRolePermissions();
}

function saveRolePermissions(): void {
  const role = selectedRole.value;
  const snapshot = rolePermissions.value;
  if (!role || !snapshot) return;
  confirmHighRisk('替换角色 Permission', () => command(() => iamAdmin.replaceRolePermissions(role.id, {
    permissionIds: rolePermissionDraft.permissionIds, version: snapshot.roleVersion, reason: rolePermissionDraft.reason,
  }), applyRolePermissions, loadRolePermissions), rolePermissionDraft.reason);
}

async function loadPermissions(): Promise<void> {
  await query(() => iamAdmin.listPermissions(), (result) => { permissions.value = result; });
}

async function loadSessions(): Promise<void> {
  await query(() => iamAdmin.listSessions({ userId: sessionFilters.userId || undefined, status: sessionFilters.status || undefined }), (result) => { sessions.value = result; });
}

function revokeSession(item: SessionRow): void {
  confirmHighRisk(`撤销 Session ${item.id}`, () => command(
    () => iamAdmin.revokeSession(item.id, sessionReason.value),
    () => { sessions.value = sessions.value.map((session) => session.id === item.id ? { ...session, status: 'REVOKED' } : session); },
    loadSessions,
  ), sessionReason.value);
}

async function loadAudit(): Promise<void> {
  await query(() => iamAdmin.listAudit({ category: auditFilters.category || undefined, targetId: auditFilters.targetId || undefined }), (result) => { audits.value = result; });
}

async function loadClients(): Promise<void> {
  await query(() => iamAdmin.listClients(), (result) => { clients.value = result; });
}

function changeClientStatus(client: ClientRow): void {
  const next: IamStatus = client.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
  confirmHighRisk(`${next === 'ENABLED' ? '启用' : '禁用'} Client ${client.clientId}`, () => command(
    () => iamAdmin.setClientStatus(client.clientId, { status: next, version: client.version, reason: clientReason.value }),
    (updated) => { clients.value = clients.value.map((item) => item.clientId === updated.clientId ? updated : item); },
    loadClients,
  ), clientReason.value);
}

function formatTime(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : '—';
}

watch(section, () => { notice.value = undefined; void loadCurrentSection(); });
onMounted(() => {
  if (!visibleSections.value.some((item) => item.key === section.value)) section.value = visibleSections.value[0]?.key ?? 'users';
  void loadCurrentSection();
});
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-header class="app-header">
      <div class="app-brand">
        <strong>MOM</strong>
        <span>制造运营管理平台</span>
      </div>
      <div class="app-header-actions">
        <span class="environment-badge">Gateway · {{ gatewayUrl }}</span>
        <button class="language-trigger" type="button" aria-label="当前语言：简体中文">
          <span aria-hidden="true">◎</span>
          <span>简体中文</span>
          <span aria-hidden="true">⌄</span>
        </button>
        <template v-if="runtimeState.user">
          <a-select v-if="runtimeState.user.factoryIds.length > 1" :value="runtimeState.user.currentFactoryId ?? undefined" placeholder="选择当前工厂" class="factory-selector" @change="selectFactory">
            <a-select-option v-for="factoryId in runtimeState.user.factoryIds" :key="factoryId" :value="factoryId">{{ factoryId }}</a-select-option>
          </a-select>
          <span class="user-avatar">{{ runtimeState.user.displayName.slice(0, 1).toUpperCase() }}</span>
          <a-button type="text" @click="logout">退出</a-button>
        </template>
      </div>
    </a-layout-header>

    <a-layout-content v-if="runtimeState.phase === 'error'" class="app-content">
      <a-alert type="error" show-icon :message="runtimeState.error" description="认证状态未持久化，请重新进入 IAM 登录流程。">
        <template #action><a-button danger @click="login">重新登录</a-button></template>
      </a-alert>
    </a-layout-content>

    <a-layout v-else class="app-workspace">
      <a-layout-sider
        v-model:collapsed="sidebarCollapsed"
        :width="240"
        :collapsed-width="64"
        theme="light"
        collapsible
        class="app-sider"
      >
        <div class="sider-caption">{{ sidebarCollapsed ? 'IAM' : '系统管理' }}</div>
        <a-menu mode="inline" :selected-keys="[section]" @click="({ key }: { key: string }) => { section = key as Section; }">
          <a-menu-item v-for="item in visibleSections" :key="item.key">
            <span class="menu-marker" aria-hidden="true"></span>
            <span>{{ item.label }}</span>
          </a-menu-item>
        </a-menu>
        <div v-if="!sidebarCollapsed" class="sider-note">菜单只改善操作体验，服务端继续执行最终授权。</div>
      </a-layout-sider>

      <a-layout class="workspace-main">
        <nav class="workspace-tabs" aria-label="已打开页面">
          <button type="button" class="workspace-tab">工作台</button>
          <button type="button" class="workspace-tab is-active">
            <span>{{ currentSectionLabel }}</span>
            <span class="tab-close" aria-hidden="true">×</span>
          </button>
        </nav>

        <a-layout-content class="app-content">
          <div class="page-context" aria-label="面包屑">
            <span>系统管理</span>
            <span aria-hidden="true">/</span>
            <strong>{{ currentSectionLabel }}</strong>
          </div>
        <a-alert v-if="notice" class="page-alert" show-icon :type="notice.kind === 'stale' ? 'warning' : 'error'" :message="notice.title">
          <template #description>
            {{ notice.message }}<span v-if="notice.correlationId"> Correlation ID：{{ notice.correlationId }}</span>
          </template>
        </a-alert>

        <section v-if="section === 'users'" class="management-page">
          <div class="page-heading"><div><h1>用户管理</h1><p>管理组织成员、账号状态与访问范围；授权聚合继续使用同一个 iam_user version。</p></div><a-button v-if="can('iam:user:create')" type="primary" @click="createUserOpen = true">新增用户</a-button></div>
          <a-card size="small" class="filter-card"><a-space wrap>
            <a-select v-model:value="userFilters.userType" allow-clear placeholder="用户类型" style="width: 150px"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select>
            <a-select v-model:value="userFilters.status" allow-clear placeholder="状态" style="width: 130px"><a-select-option value="ENABLED">ENABLED</a-select-option><a-select-option value="DISABLED">DISABLED</a-select-option></a-select>
            <a-button :loading="busy" @click="loadUsers">查询</a-button>
          </a-space></a-card>
          <div class="split-grid">
            <a-card title="用户目录" :bordered="false"><a-table :data-source="users" :loading="busy" row-key="id" size="small" :pagination="{ pageSize: 10 }">
              <a-table-column title="用户" data-index="username"><template #default="{ record }"><strong>{{ record.username }}</strong><div class="muted">{{ record.displayName }}</div></template></a-table-column>
              <a-table-column title="类型" data-index="userType" />
              <a-table-column title="状态"><template #default="{ record }"><a-badge :status="record.status === 'ENABLED' ? 'success' : 'default'" :text="record.status" /></template></a-table-column>
              <a-table-column title="Version" data-index="version" width="90" />
              <a-table-column title=""><template #default="{ record }"><a-button type="link" @click="selectUser(record)">管理</a-button></template></a-table-column>
            </a-table></a-card>

            <a-card v-if="selectedUser" title="用户详情" :bordered="false">
              <template #extra><a-tag v-if="isCurrentUser" color="orange">当前账号：禁止自我禁用/删除</a-tag></template>
              <a-descriptions size="small" :column="2" bordered>
                <a-descriptions-item label="用户名">{{ selectedUser.username }}</a-descriptions-item><a-descriptions-item label="用户类型">{{ selectedUser.userType }}</a-descriptions-item>
                <a-descriptions-item label="展示名">{{ selectedUser.displayName }}</a-descriptions-item><a-descriptions-item label="状态">{{ selectedUser.status }}</a-descriptions-item>
                <a-descriptions-item label="失败次数">{{ selectedUser.failedLoginCount }}</a-descriptions-item><a-descriptions-item label="锁定至">{{ formatTime(selectedUser.lockedUntil) }}</a-descriptions-item>
                <a-descriptions-item label="首次改密">{{ selectedUser.passwordChangeRequired ? '必须' : '否' }}</a-descriptions-item><a-descriptions-item label="聚合版本">{{ userAuthorization?.userVersion ?? selectedUser.version }}</a-descriptions-item>
              </a-descriptions>
              <a-divider orientation="left">受控操作</a-divider>
              <a-space wrap>
                <a-button v-if="can('iam:user:update')" @click="editUserOpen = true">修改展示名</a-button>
                <a-button v-if="selectedUser.status === 'DISABLED' && can('iam:user:enable')" danger @click="changeUserStatus('ENABLED')">启用</a-button>
                <a-button v-if="selectedUser.status === 'ENABLED' && can('iam:user:disable')" danger :disabled="isCurrentUser" @click="changeUserStatus('DISABLED')">禁用</a-button>
                <a-button v-if="can('iam:user:unlock')" danger @click="unlockUser">解锁</a-button>
                <a-button v-if="can('iam:user:delete')" danger :disabled="isCurrentUser" @click="deleteUser">删除</a-button>
                <a-button v-if="can('iam:session:revoke-all')" danger @click="revokeAllUserSessions">撤销全部 Session</a-button>
              </a-space>
              <a-input v-model:value="authorizationDraft.reason" class="reason-input" placeholder="高风险操作审计原因（必填）" />
              <a-space v-if="can('iam:user:password-reset')" compact class="credential-row"><a-input-password v-model:value="temporaryPassword" placeholder="12～200 位临时密码" /><a-button danger @click="resetCredential">重置凭证</a-button></a-space>

              <template v-if="userAuthorization">
                <a-divider orientation="left">授权快照 · v{{ userAuthorization.userVersion }}</a-divider>
                <div class="editor-block"><label>角色</label><a-select v-model:value="authorizationDraft.roleIds" mode="multiple" style="width: 100%" :disabled="!can('iam:user:role-assign')"><a-select-option v-for="role in compatibleRoles" :key="role.id" :value="role.id">{{ role.code }} · {{ role.name }}</a-select-option></a-select><a-button v-if="can('iam:user:role-assign')" danger @click="saveRoles">替换角色</a-button></div>
                <div class="editor-block"><label>Factory Scope</label><a-select v-model:value="authorizationDraft.factoryIds" mode="tags" token-separators="," style="width: 100%" :disabled="!can('iam:user:factory-scope-assign')" placeholder="输入 Factory ID" /><a-button v-if="can('iam:user:factory-scope-assign')" danger @click="saveFactories">替换范围</a-button></div>
                <div v-if="selectedUser.userType === 'INTERNAL'" class="editor-block"><label>Mobile Access</label><a-switch v-model:checked="authorizationDraft.mobileAccessEnabled" :disabled="!can('iam:user:mobile-access-manage')" /><a-button v-if="can('iam:user:mobile-access-manage')" danger @click="saveMobileAccess">保存</a-button></div>
                <div v-else class="editor-block"><label>Party Binding</label><a-select v-model:value="authorizationDraft.partyType" style="width: 140px" :disabled="!can('iam:user:party-rebind')"><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select><a-input v-model:value="authorizationDraft.partyId" placeholder="Party ID" :disabled="!can('iam:user:party-rebind')" /><a-button v-if="can('iam:user:party-rebind')" danger @click="savePartyBinding">重新绑定</a-button></div>
              </template>
            </a-card>
            <a-empty v-else description="选择用户后读取完整授权快照" />
          </div>
        </section>

        <section v-else-if="section === 'roles'" class="management-page">
          <div class="page-heading"><div><h1>角色配置</h1><p>内置角色只读；自定义角色 Permission 使用 iam_role version。</p></div><a-button v-if="can('iam:role:create')" type="primary" @click="createRoleOpen = true">创建角色</a-button></div>
          <div class="split-grid"><a-card title="角色目录"><a-table :data-source="roles" :loading="busy" row-key="id" size="small" :pagination="{ pageSize: 10 }"><a-table-column title="代码" data-index="code" /><a-table-column title="名称" data-index="name" /><a-table-column title="类型" data-index="applicableUserType" /><a-table-column title="状态" data-index="status" /><a-table-column title=""><template #default="{ record }"><a-button type="link" @click="selectRole(record)">管理</a-button></template></a-table-column></a-table></a-card>
            <a-card v-if="selectedRole" title="角色详情"><template #extra><a-tag :color="selectedRole.builtIn ? 'orange' : 'blue'">{{ selectedRole.builtIn ? '内置只读' : `v${rolePermissions?.roleVersion ?? selectedRole.version}` }}</a-tag></template>
              <a-descriptions bordered size="small" :column="2"><a-descriptions-item label="代码">{{ selectedRole.code }}</a-descriptions-item><a-descriptions-item label="状态">{{ selectedRole.status }}</a-descriptions-item><a-descriptions-item label="名称">{{ selectedRole.name }}</a-descriptions-item><a-descriptions-item label="类型">{{ selectedRole.applicableUserType }}</a-descriptions-item></a-descriptions>
              <a-button v-if="can('iam:role:update')" class="detail-action" :disabled="selectedRole.builtIn" @click="editRoleOpen = true">修改自定义角色</a-button>
              <a-divider orientation="left">Permission</a-divider>
              <a-select v-model:value="rolePermissionDraft.permissionIds" mode="multiple" show-search option-filter-prop="label" style="width: 100%" :disabled="selectedRole.builtIn || !can('iam:role:permission-manage')"><a-select-option v-for="item in activePermissions" :key="item.id" :value="item.id" :label="item.code">{{ item.code }} · {{ item.name }}</a-select-option></a-select>
              <a-input v-model:value="rolePermissionDraft.reason" class="reason-input" placeholder="Permission 变更审计原因（必填）" />
              <a-button v-if="can('iam:role:permission-manage')" danger :disabled="selectedRole.builtIn" @click="saveRolePermissions">替换 Permission</a-button>
            </a-card><a-empty v-else description="选择角色后读取 Permission 快照" /></div>
        </section>

        <section v-else-if="section === 'permissions'" class="management-page"><div class="page-heading"><div><h1>Permission 目录</h1><p>系统 Permission 只读，不在前端创建或修改。</p></div><a-button :loading="busy" @click="loadPermissions">刷新</a-button></div><a-card><a-table :data-source="permissions" row-key="id" size="small" :pagination="{ pageSize: 15 }"><a-table-column title="代码" data-index="code" /><a-table-column title="名称" data-index="name" /><a-table-column title="领域" data-index="domainCode" /><a-table-column title="风险"><template #default="{ record }"><a-tag :color="record.riskLevel === 'HIGH' ? 'red' : record.riskLevel === 'MEDIUM' ? 'orange' : 'green'">{{ record.riskLevel }}</a-tag></template></a-table-column><a-table-column title="状态" data-index="status" /></a-table></a-card></section>

        <section v-else-if="section === 'sessions'" class="management-page"><div class="page-heading"><div><h1>Session 管理</h1><p>撤销命令不会自动重试，网络失败后先查询最终状态。</p></div></div><a-card size="small" class="filter-card"><a-space wrap><a-input v-model:value="sessionFilters.userId" placeholder="User ID" /><a-input v-model:value="sessionFilters.status" placeholder="状态" /><a-input v-model:value="sessionReason" placeholder="撤销原因" /><a-button @click="loadSessions">查询</a-button></a-space></a-card><a-card><a-table :data-source="sessions" row-key="id" size="small" :pagination="{ pageSize: 12 }"><a-table-column title="Session / 用户"><template #default="{ record }"><strong>{{ record.id }}</strong><div class="muted">{{ record.userId }}</div></template></a-table-column><a-table-column title="Client" data-index="clientId" /><a-table-column title="Channel" data-index="channel" /><a-table-column title="状态" data-index="status" /><a-table-column title="登录时间"><template #default="{ record }">{{ formatTime(record.loginAt) }}</template></a-table-column><a-table-column title="绝对过期"><template #default="{ record }">{{ formatTime(record.absoluteExpiresAt) }}</template></a-table-column><a-table-column title=""><template #default="{ record }"><a-button v-if="can('iam:session:revoke')" type="link" danger :disabled="record.status !== 'ACTIVE'" @click="revokeSession(record)">撤销</a-button></template></a-table-column></a-table></a-card></section>

        <section v-else-if="section === 'audit'" class="management-page"><div class="page-heading"><div><h1>安全审计</h1><p>仅展示服务端安全事件的非敏感投影。</p></div></div><a-card size="small" class="filter-card"><a-space><a-input v-model:value="auditFilters.category" placeholder="事件分类" /><a-input v-model:value="auditFilters.targetId" placeholder="Target ID" /><a-button @click="loadAudit">查询</a-button></a-space></a-card><a-card><a-table :data-source="audits" row-key="id" size="small" :pagination="{ pageSize: 12 }"><a-table-column title="时间"><template #default="{ record }">{{ formatTime(record.occurredAt) }}</template></a-table-column><a-table-column title="事件" data-index="eventType" /><a-table-column title="风险"><template #default="{ record }"><a-tag :color="record.riskLevel === 'HIGH' ? 'red' : 'blue'">{{ record.riskLevel }}</a-tag></template></a-table-column><a-table-column title="Actor"><template #default="{ record }">{{ record.actorUserId ?? record.actorClientId ?? record.actorType }}</template></a-table-column><a-table-column title="Target"><template #default="{ record }">{{ record.targetType }} · {{ record.targetId }}</template></a-table-column><a-table-column title="原因" data-index="reasonCode" /><a-table-column title="Correlation ID" data-index="correlationId" /></a-table></a-card></section>

        <section v-else-if="section === 'clients'" class="management-page"><div class="page-heading"><div><h1>OAuth Client</h1><p>禁用 Client 会联动撤销相关 Session。</p></div></div><a-card size="small" class="filter-card"><a-input v-model:value="clientReason" placeholder="Client 状态变更原因" /></a-card><a-card><a-table :data-source="clients" row-key="clientId" size="small" :pagination="false"><a-table-column title="Client"><template #default="{ record }"><strong>{{ record.clientName }}</strong><div class="muted">{{ record.clientId }}</div></template></a-table-column><a-table-column title="应用" data-index="applicationCode" /><a-table-column title="用户类型" data-index="allowedUserType" /><a-table-column title="Channel" data-index="channel" /><a-table-column title="状态"><template #default="{ record }"><a-badge :status="record.status === 'ENABLED' ? 'success' : 'default'" :text="record.status" /></template></a-table-column><a-table-column title="Version" data-index="version" /><a-table-column title=""><template #default="{ record }"><a-button v-if="can(record.status === 'ENABLED' ? 'iam:client:disable' : 'iam:client:enable')" danger @click="changeClientStatus(record)">{{ record.status === 'ENABLED' ? '禁用' : '启用' }}</a-button></template></a-table-column></a-table></a-card></section>

        <a-empty v-else-if="visibleSections.length === 0" description="当前账号没有 IAM 管理读取权限" />
        </a-layout-content>
      </a-layout>
    </a-layout>

    <a-modal v-model:open="createUserOpen" title="创建用户" :confirm-loading="busy" @ok="createUser"><a-form layout="vertical"><a-form-item label="用户名"><a-input v-model:value="createUserForm.username" /></a-form-item><a-form-item label="展示名"><a-input v-model:value="createUserForm.displayName" /></a-form-item><a-form-item label="用户类型"><a-select v-model:value="createUserForm.userType"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item label="初始密码"><a-input-password v-model:value="createUserForm.initialPassword" /></a-form-item><template v-if="createUserForm.userType !== 'INTERNAL'"><a-form-item label="Party 类型"><a-select v-model:value="createUserForm.partyType"><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item label="Party ID"><a-input v-model:value="createUserForm.partyId" /></a-form-item></template></a-form></a-modal>
    <a-modal v-model:open="editUserOpen" title="修改用户展示名" :confirm-loading="busy" @ok="updateUser"><a-input v-model:value="editUserName" /></a-modal>
    <a-modal v-model:open="createRoleOpen" title="创建角色" :confirm-loading="busy" @ok="createRole"><a-form layout="vertical"><a-form-item label="角色代码"><a-input v-model:value="createRoleForm.code" /></a-form-item><a-form-item label="名称"><a-input v-model:value="createRoleForm.name" /></a-form-item><a-form-item label="适用用户类型"><a-select v-model:value="createRoleForm.applicableUserType"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item label="说明"><a-textarea v-model:value="createRoleForm.description" /></a-form-item></a-form></a-modal>
    <a-modal v-model:open="editRoleOpen" title="修改自定义角色" :confirm-loading="busy" @ok="updateRole"><a-form layout="vertical"><a-form-item label="名称"><a-input v-model:value="editRoleForm.name" /></a-form-item><a-form-item label="说明"><a-textarea v-model:value="editRoleForm.description" /></a-form-item><a-form-item label="状态"><a-select v-model:value="editRoleForm.status"><a-select-option value="ENABLED">ENABLED</a-select-option><a-select-option value="DISABLED">DISABLED</a-select-option></a-select></a-form-item><a-form-item label="审计原因"><a-input v-model:value="editRoleForm.reason" /></a-form-item></a-form></a-modal>
  </a-layout>
</template>
