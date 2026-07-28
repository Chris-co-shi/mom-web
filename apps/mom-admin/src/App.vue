<script setup lang="ts">
import type { PermissionCode } from '@mom/access';
import { Page } from '@mom/common-ui';
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
import { preferences } from '@vben/preferences';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { $t } from './locales';
import { access, iamAdmin, runtimeState } from './runtime';
import {
  SECTION_DEFINITIONS,
  sectionFromRoute,
  type Section,
} from './section-navigation';

const route = useRoute();
const section = ref<Section>(sectionFromRoute(route.meta.section));
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
const sessionReason = ref($t('mom.defaults.sessionReason'));
const clientReason = ref($t('mom.defaults.clientReason'));
const temporaryPassword = ref('');

const createUserOpen = ref(false);
const editUserOpen = ref(false);
const createRoleOpen = ref(false);
const editRoleOpen = ref(false);
const createUserForm = reactive({ username: '', displayName: '', userType: 'INTERNAL' as IamUserType, initialPassword: '', partyType: 'SUPPLIER' as PartyType, partyId: '' });
const editUserName = ref('');
const createRoleForm = reactive({ code: '', name: '', applicableUserType: 'INTERNAL' as IamUserType, description: '' });
const editRoleForm = reactive({ name: '', description: '', status: 'ENABLED' as IamStatus, reason: '' });

const visibleSections = computed(() => SECTION_DEFINITIONS.filter((item) => can(item.permission)));
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
    message.success($t('mom.messages.commandSucceeded'));
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
    message.warning($t('mom.messages.reasonRequired'));
    return;
  }
  Modal.confirm({
    title,
    content: $t('mom.messages.highRiskContent', { reason: reason.trim() }),
    okText: $t('mom.actions.confirm'),
    okType: 'danger',
    cancelText: $t('mom.actions.cancel'),
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
  confirmHighRisk($t(status === 'ENABLED' ? 'mom.operations.enableUser' : 'mom.operations.disableUser', { user: user.username }), async () => {
    await command(() => iamAdmin.setUserStatus(user.id, { status, version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function unlockUser(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk($t('mom.operations.unlockUser', { user: user.username }), async () => {
    await command(() => iamAdmin.unlockUser(user.id, { version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function resetCredential(): void {
  const user = selectedUser.value;
  if (!user || !temporaryPassword.value) {
    message.warning($t('mom.messages.temporaryPasswordRequired'));
    return;
  }
  confirmHighRisk($t('mom.operations.resetCredential', { user: user.username }), async () => {
    await command(() => iamAdmin.resetCredential(user.id, { temporaryPassword: temporaryPassword.value, version: user.version, reason: authorizationDraft.reason }), replaceUserRow, loadUserAuthorization);
    temporaryPassword.value = '';
    await loadUserAuthorization();
  }, authorizationDraft.reason);
}

function deleteUser(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk($t('mom.operations.deleteUser', { user: user.username }), async () => {
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
  confirmHighRisk($t('mom.operations.replaceUserRoles'), () => command(() => iamAdmin.replaceUserRoles(user.id, {
    roleIds: authorizationDraft.roleIds, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function saveFactories(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk($t('mom.operations.replaceFactoryScope'), () => command(() => iamAdmin.replaceFactoryScopes(user.id, {
    factoryIds: authorizationDraft.factoryIds, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function saveMobileAccess(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk($t('mom.operations.changeMobileAccess'), () => command(() => iamAdmin.setMobileAccess(user.id, {
    enabled: authorizationDraft.mobileAccessEnabled, version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function savePartyBinding(): void {
  const user = selectedUser.value;
  const snapshot = userAuthorization.value;
  if (!user || !snapshot) return;
  confirmHighRisk($t('mom.operations.rebindParty'), () => command(() => iamAdmin.rebindParty(user.id, {
    partyType: authorizationDraft.partyType, partyId: authorizationDraft.partyId,
    version: snapshot.userVersion, reason: authorizationDraft.reason,
  }), applyUserAuthorization, loadUserAuthorization), authorizationDraft.reason);
}

function revokeAllUserSessions(): void {
  const user = selectedUser.value;
  if (!user) return;
  confirmHighRisk($t('mom.operations.revokeAllSessions', { user: user.username }), () => command(
    () => iamAdmin.revokeUserSessions(user.id, authorizationDraft.reason),
    (result) => { message.info($t('mom.messages.sessionsRevoked', { count: result.revoked })); },
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
  confirmHighRisk($t('mom.operations.replaceRolePermissions'), () => command(() => iamAdmin.replaceRolePermissions(role.id, {
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
  confirmHighRisk($t('mom.operations.revokeSession', { id: item.id }), () => command(
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
  confirmHighRisk($t(next === 'ENABLED' ? 'mom.operations.enableClient' : 'mom.operations.disableClient', { id: client.clientId }), () => command(
    () => iamAdmin.setClientStatus(client.clientId, { status: next, version: client.version, reason: clientReason.value }),
    (updated) => { clients.value = clients.value.map((item) => item.clientId === updated.clientId ? updated : item); },
    loadClients,
  ), clientReason.value);
}

function formatTime(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat(preferences.app.locale, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : '—';
}

watch(
  () => route.meta.section,
  (routeSection) => {
    section.value = sectionFromRoute(routeSection);
  },
);
watch(section, () => { notice.value = undefined; void loadCurrentSection(); });
onMounted(() => {
  void loadCurrentSection();
});
</script>

<template>
  <div class="iam-page">
        <a-alert v-if="notice" class="page-alert" show-icon :type="notice.kind === 'stale' ? 'warning' : 'error'" :message="notice.title">
          <template #description>
            {{ notice.message }}<span v-if="notice.correlationId"> Correlation ID：{{ notice.correlationId }}</span>
          </template>
        </a-alert>

        <Page v-if="section === 'users'">
          <a-card size="small" class="filter-card">
            <div class="user-command-bar">
              <a-space wrap>
                <a-select v-model:value="userFilters.userType" allow-clear :placeholder="$t('mom.fields.userType')" style="width: 150px"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select>
                <a-select v-model:value="userFilters.status" allow-clear :placeholder="$t('mom.fields.status')" style="width: 130px"><a-select-option value="ENABLED">ENABLED</a-select-option><a-select-option value="DISABLED">DISABLED</a-select-option></a-select>
                <a-button :loading="busy" @click="loadUsers">{{ $t('mom.actions.search') }}</a-button>
              </a-space>
              <a-button v-if="can('iam:user:create')" type="primary" @click="createUserOpen = true">{{ $t('mom.actions.createUser') }}</a-button>
            </div>
          </a-card>
          <div class="split-grid">
            <a-card :title="$t('mom.titles.userDirectory')" :bordered="false"><a-table :data-source="users" :loading="busy" row-key="id" size="small" :pagination="{ pageSize: 10 }">
              <a-table-column :title="$t('mom.fields.user')" data-index="username"><template #default="{ record }"><strong>{{ record.username }}</strong><div class="muted">{{ record.displayName }}</div></template></a-table-column>
              <a-table-column :title="$t('mom.fields.type')" data-index="userType" />
              <a-table-column :title="$t('mom.fields.status')"><template #default="{ record }"><a-badge :status="record.status === 'ENABLED' ? 'success' : 'default'" :text="record.status" /></template></a-table-column>
              <a-table-column title="Version" data-index="version" width="90" />
              <a-table-column title=""><template #default="{ record }"><a-button type="link" @click="selectUser(record)">{{ $t('mom.actions.manage') }}</a-button></template></a-table-column>
            </a-table></a-card>

            <a-card v-if="selectedUser" :title="$t('mom.titles.userDetails')" :bordered="false">
              <template #extra><a-tag v-if="isCurrentUser" color="orange">{{ $t('mom.messages.selfProtection') }}</a-tag></template>
              <a-descriptions size="small" :column="2" bordered>
                <a-descriptions-item :label="$t('mom.fields.username')">{{ selectedUser.username }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.userType')">{{ selectedUser.userType }}</a-descriptions-item>
                <a-descriptions-item :label="$t('mom.fields.displayName')">{{ selectedUser.displayName }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.status')">{{ selectedUser.status }}</a-descriptions-item>
                <a-descriptions-item :label="$t('mom.fields.failedLoginCount')">{{ selectedUser.failedLoginCount }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.lockedUntil')">{{ formatTime(selectedUser.lockedUntil) }}</a-descriptions-item>
                <a-descriptions-item :label="$t('mom.fields.passwordChangeRequired')">{{ selectedUser.passwordChangeRequired ? $t('mom.common.required') : $t('mom.common.no') }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.aggregateVersion')">{{ userAuthorization?.userVersion ?? selectedUser.version }}</a-descriptions-item>
              </a-descriptions>
              <a-divider orientation="left">{{ $t('mom.titles.controlledOperations') }}</a-divider>
              <a-space wrap>
                <a-button v-if="can('iam:user:update')" @click="editUserOpen = true">{{ $t('mom.actions.editDisplayName') }}</a-button>
                <a-button v-if="selectedUser.status === 'DISABLED' && can('iam:user:enable')" danger @click="changeUserStatus('ENABLED')">{{ $t('mom.actions.enable') }}</a-button>
                <a-button v-if="selectedUser.status === 'ENABLED' && can('iam:user:disable')" danger :disabled="isCurrentUser" @click="changeUserStatus('DISABLED')">{{ $t('mom.actions.disable') }}</a-button>
                <a-button v-if="can('iam:user:unlock')" danger @click="unlockUser">{{ $t('mom.actions.unlock') }}</a-button>
                <a-button v-if="can('iam:user:delete')" danger :disabled="isCurrentUser" @click="deleteUser">{{ $t('mom.actions.delete') }}</a-button>
                <a-button v-if="can('iam:session:revoke-all')" danger @click="revokeAllUserSessions">{{ $t('mom.actions.revokeAllSessions') }}</a-button>
              </a-space>
              <a-input v-model:value="authorizationDraft.reason" class="reason-input" :placeholder="$t('mom.placeholders.auditReasonRequired')" />
              <a-space v-if="can('iam:user:password-reset')" compact class="credential-row"><a-input-password v-model:value="temporaryPassword" :placeholder="$t('mom.placeholders.temporaryPassword')" /><a-button danger @click="resetCredential">{{ $t('mom.actions.resetCredential') }}</a-button></a-space>

              <template v-if="userAuthorization">
                <a-divider orientation="left">{{ $t('mom.titles.authorizationSnapshot', { version: userAuthorization.userVersion }) }}</a-divider>
                <div class="editor-block"><label>{{ $t('mom.fields.roles') }}</label><a-select v-model:value="authorizationDraft.roleIds" mode="multiple" style="width: 100%" :disabled="!can('iam:user:role-assign')"><a-select-option v-for="role in compatibleRoles" :key="role.id" :value="role.id">{{ role.code }} · {{ role.name }}</a-select-option></a-select><a-button v-if="can('iam:user:role-assign')" danger @click="saveRoles">{{ $t('mom.actions.replaceRoles') }}</a-button></div>
                <div class="editor-block"><label>Factory Scope</label><a-select v-model:value="authorizationDraft.factoryIds" mode="tags" token-separators="," style="width: 100%" :disabled="!can('iam:user:factory-scope-assign')" :placeholder="$t('mom.placeholders.factoryId')" /><a-button v-if="can('iam:user:factory-scope-assign')" danger @click="saveFactories">{{ $t('mom.actions.replaceScope') }}</a-button></div>
                <div v-if="selectedUser.userType === 'INTERNAL'" class="editor-block"><label>Mobile Access</label><a-switch v-model:checked="authorizationDraft.mobileAccessEnabled" :disabled="!can('iam:user:mobile-access-manage')" /><a-button v-if="can('iam:user:mobile-access-manage')" danger @click="saveMobileAccess">{{ $t('mom.actions.save') }}</a-button></div>
                <div v-else class="editor-block"><label>Party Binding</label><a-select v-model:value="authorizationDraft.partyType" style="width: 140px" :disabled="!can('iam:user:party-rebind')"><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select><a-input v-model:value="authorizationDraft.partyId" placeholder="Party ID" :disabled="!can('iam:user:party-rebind')" /><a-button v-if="can('iam:user:party-rebind')" danger @click="savePartyBinding">{{ $t('mom.actions.rebind') }}</a-button></div>
              </template>
            </a-card>
            <a-empty v-else :description="$t('mom.empty.selectUser')" />
          </div>
        </Page>

        <Page v-else-if="section === 'roles'">
          <div class="split-grid"><a-card :title="$t('mom.titles.roleDirectory')"><template #extra><a-button v-if="can('iam:role:create')" type="primary" @click="createRoleOpen = true">{{ $t('mom.actions.createRole') }}</a-button></template><a-table :data-source="roles" :loading="busy" row-key="id" size="small" :pagination="{ pageSize: 10 }"><a-table-column :title="$t('mom.fields.code')" data-index="code" /><a-table-column :title="$t('mom.fields.name')" data-index="name" /><a-table-column :title="$t('mom.fields.type')" data-index="applicableUserType" /><a-table-column :title="$t('mom.fields.status')" data-index="status" /><a-table-column title=""><template #default="{ record }"><a-button type="link" @click="selectRole(record)">{{ $t('mom.actions.manage') }}</a-button></template></a-table-column></a-table></a-card>
            <a-card v-if="selectedRole" :title="$t('mom.titles.roleDetails')"><template #extra><a-tag :color="selectedRole.builtIn ? 'orange' : 'blue'">{{ selectedRole.builtIn ? $t('mom.common.builtInReadOnly') : `v${rolePermissions?.roleVersion ?? selectedRole.version}` }}</a-tag></template>
              <a-descriptions bordered size="small" :column="2"><a-descriptions-item :label="$t('mom.fields.code')">{{ selectedRole.code }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.status')">{{ selectedRole.status }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.name')">{{ selectedRole.name }}</a-descriptions-item><a-descriptions-item :label="$t('mom.fields.type')">{{ selectedRole.applicableUserType }}</a-descriptions-item></a-descriptions>
              <a-button v-if="can('iam:role:update')" class="detail-action" :disabled="selectedRole.builtIn" @click="editRoleOpen = true">{{ $t('mom.actions.editCustomRole') }}</a-button>
              <a-divider orientation="left">Permission</a-divider>
              <a-select v-model:value="rolePermissionDraft.permissionIds" mode="multiple" show-search option-filter-prop="label" style="width: 100%" :disabled="selectedRole.builtIn || !can('iam:role:permission-manage')"><a-select-option v-for="item in activePermissions" :key="item.id" :value="item.id" :label="item.code">{{ item.code }} · {{ item.name }}</a-select-option></a-select>
              <a-input v-model:value="rolePermissionDraft.reason" class="reason-input" :placeholder="$t('mom.placeholders.permissionReason')" />
              <a-button v-if="can('iam:role:permission-manage')" danger :disabled="selectedRole.builtIn" @click="saveRolePermissions">{{ $t('mom.actions.replacePermissions') }}</a-button>
            </a-card><a-empty v-else :description="$t('mom.empty.selectRole')" /></div>
        </Page>

        <Page v-else-if="section === 'permissions'">
          <a-card :title="$t('mom.pages.permissions.title')"><template #extra><a-button :loading="busy" @click="loadPermissions">{{ $t('mom.actions.refresh') }}</a-button></template><a-table :data-source="permissions" row-key="id" size="small" :pagination="{ pageSize: 15 }"><a-table-column :title="$t('mom.fields.code')" data-index="code" /><a-table-column :title="$t('mom.fields.name')" data-index="name" /><a-table-column :title="$t('mom.fields.domain')" data-index="domainCode" /><a-table-column :title="$t('mom.fields.risk')"><template #default="{ record }"><a-tag :color="record.riskLevel === 'HIGH' ? 'red' : record.riskLevel === 'MEDIUM' ? 'orange' : 'green'">{{ record.riskLevel }}</a-tag></template></a-table-column><a-table-column :title="$t('mom.fields.status')" data-index="status" /></a-table></a-card>
        </Page>

        <Page v-else-if="section === 'sessions'">
          <a-card size="small" class="filter-card"><a-space wrap><a-input v-model:value="sessionFilters.userId" placeholder="User ID" /><a-input v-model:value="sessionFilters.status" :placeholder="$t('mom.fields.status')" /><a-input v-model:value="sessionReason" :placeholder="$t('mom.fields.revokeReason')" /><a-button @click="loadSessions">{{ $t('mom.actions.search') }}</a-button></a-space></a-card><a-card><a-table :data-source="sessions" row-key="id" size="small" :pagination="{ pageSize: 12 }"><a-table-column :title="$t('mom.fields.sessionUser')"><template #default="{ record }"><strong>{{ record.id }}</strong><div class="muted">{{ record.userId }}</div></template></a-table-column><a-table-column title="Client" data-index="clientId" /><a-table-column title="Channel" data-index="channel" /><a-table-column :title="$t('mom.fields.status')" data-index="status" /><a-table-column :title="$t('mom.fields.loginTime')"><template #default="{ record }">{{ formatTime(record.loginAt) }}</template></a-table-column><a-table-column :title="$t('mom.fields.absoluteExpiry')"><template #default="{ record }">{{ formatTime(record.absoluteExpiresAt) }}</template></a-table-column><a-table-column title=""><template #default="{ record }"><a-button v-if="can('iam:session:revoke')" type="link" danger :disabled="record.status !== 'ACTIVE'" @click="revokeSession(record)">{{ $t('mom.actions.revoke') }}</a-button></template></a-table-column></a-table></a-card>
        </Page>

        <Page v-else-if="section === 'audit'">
          <a-card size="small" class="filter-card"><a-space><a-input v-model:value="auditFilters.category" :placeholder="$t('mom.fields.eventCategory')" /><a-input v-model:value="auditFilters.targetId" placeholder="Target ID" /><a-button @click="loadAudit">{{ $t('mom.actions.search') }}</a-button></a-space></a-card><a-card><a-table :data-source="audits" row-key="id" size="small" :pagination="{ pageSize: 12 }"><a-table-column :title="$t('mom.fields.time')"><template #default="{ record }">{{ formatTime(record.occurredAt) }}</template></a-table-column><a-table-column :title="$t('mom.fields.event')" data-index="eventType" /><a-table-column :title="$t('mom.fields.risk')"><template #default="{ record }"><a-tag :color="record.riskLevel === 'HIGH' ? 'red' : 'blue'">{{ record.riskLevel }}</a-tag></template></a-table-column><a-table-column title="Actor"><template #default="{ record }">{{ record.actorUserId ?? record.actorClientId ?? record.actorType }}</template></a-table-column><a-table-column title="Target"><template #default="{ record }">{{ record.targetType }} · {{ record.targetId }}</template></a-table-column><a-table-column :title="$t('mom.fields.reason')" data-index="reasonCode" /><a-table-column title="Correlation ID" data-index="correlationId" /></a-table></a-card>
        </Page>

        <Page v-else-if="section === 'clients'">
          <a-card :title="$t('mom.titles.clientDirectory')" class="client-directory-card">
            <div class="client-command-bar">
              <label for="client-status-reason">{{ $t('mom.fields.clientStatusReason') }}</label>
              <a-input
                id="client-status-reason"
                v-model:value="clientReason"
                class="client-reason-input"
                :placeholder="$t('mom.fields.clientStatusReason')"
              />
              <span>{{ $t('mom.messages.clientStatusReasonHint') }}</span>
            </div>
            <a-table :data-source="clients" row-key="clientId" size="small" :pagination="false"><a-table-column title="Client"><template #default="{ record }"><strong>{{ record.clientName }}</strong><div class="muted">{{ record.clientId }}</div></template></a-table-column><a-table-column :title="$t('mom.fields.application')" data-index="applicationCode" /><a-table-column :title="$t('mom.fields.userType')" data-index="allowedUserType" /><a-table-column title="Channel" data-index="channel" /><a-table-column :title="$t('mom.fields.status')"><template #default="{ record }"><a-badge :status="record.status === 'ENABLED' ? 'success' : 'default'" :text="record.status" /></template></a-table-column><a-table-column title="Version" data-index="version" /><a-table-column title=""><template #default="{ record }"><a-button v-if="can(record.status === 'ENABLED' ? 'iam:client:disable' : 'iam:client:enable')" danger @click="changeClientStatus(record)">{{ $t(record.status === 'ENABLED' ? 'mom.actions.disable' : 'mom.actions.enable') }}</a-button></template></a-table-column></a-table>
          </a-card>
        </Page>

        <a-empty v-else-if="visibleSections.length === 0" :description="$t('mom.empty.noReadPermission')" />

    <a-modal v-model:open="createUserOpen" :title="$t('mom.actions.createUser')" :confirm-loading="busy" @ok="createUser"><a-form layout="vertical"><a-form-item :label="$t('mom.fields.username')"><a-input v-model:value="createUserForm.username" /></a-form-item><a-form-item :label="$t('mom.fields.displayName')"><a-input v-model:value="createUserForm.displayName" /></a-form-item><a-form-item :label="$t('mom.fields.userType')"><a-select v-model:value="createUserForm.userType"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item :label="$t('mom.fields.initialPassword')"><a-input-password v-model:value="createUserForm.initialPassword" /></a-form-item><template v-if="createUserForm.userType !== 'INTERNAL'"><a-form-item :label="$t('mom.fields.partyType')"><a-select v-model:value="createUserForm.partyType"><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item label="Party ID"><a-input v-model:value="createUserForm.partyId" /></a-form-item></template></a-form></a-modal>
    <a-modal v-model:open="editUserOpen" :title="$t('mom.actions.editDisplayName')" :confirm-loading="busy" @ok="updateUser"><a-input v-model:value="editUserName" /></a-modal>
    <a-modal v-model:open="createRoleOpen" :title="$t('mom.actions.createRole')" :confirm-loading="busy" @ok="createRole"><a-form layout="vertical"><a-form-item :label="$t('mom.fields.roleCode')"><a-input v-model:value="createRoleForm.code" /></a-form-item><a-form-item :label="$t('mom.fields.name')"><a-input v-model:value="createRoleForm.name" /></a-form-item><a-form-item :label="$t('mom.fields.applicableUserType')"><a-select v-model:value="createRoleForm.applicableUserType"><a-select-option value="INTERNAL">INTERNAL</a-select-option><a-select-option value="SUPPLIER">SUPPLIER</a-select-option><a-select-option value="CUSTOMER">CUSTOMER</a-select-option></a-select></a-form-item><a-form-item :label="$t('mom.fields.description')"><a-textarea v-model:value="createRoleForm.description" /></a-form-item></a-form></a-modal>
    <a-modal v-model:open="editRoleOpen" :title="$t('mom.actions.editCustomRole')" :confirm-loading="busy" @ok="updateRole"><a-form layout="vertical"><a-form-item :label="$t('mom.fields.name')"><a-input v-model:value="editRoleForm.name" /></a-form-item><a-form-item :label="$t('mom.fields.description')"><a-textarea v-model:value="editRoleForm.description" /></a-form-item><a-form-item :label="$t('mom.fields.status')"><a-select v-model:value="editRoleForm.status"><a-select-option value="ENABLED">ENABLED</a-select-option><a-select-option value="DISABLED">DISABLED</a-select-option></a-select></a-form-item><a-form-item :label="$t('mom.fields.auditReason')"><a-input v-model:value="editRoleForm.reason" /></a-form-item></a-form></a-modal>
  </div>
</template>
