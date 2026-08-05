<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import momLogo from '../assets/mom-logo.svg';
import { $t } from '../locales';
import {
  defaultAuthorizedPath,
  resetGeneratedAccess,
  synchronizeAccess,
} from '../router/access';
import {
  isCatalogRouteActive,
  synchronizeCatalog,
} from '../router/catalog';
import {
  accessibleTaskNavigation,
  ADMIN_TASK_DOMAINS,
  findAdminTask,
} from '../router/registry';
import {
  catalogRuntimeState,
  logout,
  runtimeState,
  selectFactory,
} from '../runtime';
import AdminHeader from './admin-shell/AdminHeader.vue';
import AdminSidebar from './admin-shell/AdminSidebar.vue';
import type {
  AdminShellNavigationGroup,
  AdminShellUser,
} from './admin-shell/types';

const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const desktopCollapsed = ref(false);
const factoryBusy = ref(false);
let compactViewport: MediaQueryList | undefined;

const user = computed<AdminShellUser | undefined>(() => {
  const current = runtimeState.user;
  if (!current) return undefined;
  return {
    avatar: current.displayName.slice(0, 1).toUpperCase(),
    displayName: current.displayName,
    userType: current.userType,
    username: current.username,
  };
});

const navigation = computed<readonly AdminShellNavigationGroup[]>(() =>
  accessibleTaskNavigation(
    (permission) => runtimeState.user?.permissions.includes(permission) ?? false,
    (routeKey) => {
      void catalogRuntimeState.value;
      return isCatalogRouteActive(routeKey);
    },
  )
    .map(({ domain, tasks }) => ({
      iconKey: domain.iconKey,
      key: domain.key,
      tasks: tasks.map((task) => ({
        iconKey: task.iconKey,
        path: task.path,
        title: $t(task.titleKey),
      })),
      title: $t(domain.titleKey),
    })),
);

const breadcrumbs = computed(() => {
  const values = [$t('mom.navigation.platformGovernance')];
  const task = findAdminTask({ name: route.name, path: route.path });
  if (task) {
    const domain = ADMIN_TASK_DOMAINS.find((item) => item.key === task.domain);
    if (domain) values.push($t(domain.titleKey));
    values.push($t(task.titleKey));
  }
  else if (route.meta.title) {
    values.push($t(String(route.meta.title)));
  }
  return values;
});

function handleViewportChange(event: MediaQueryListEvent | MediaQueryList): void {
  collapsed.value = event.matches ? true : desktopCollapsed.value;
}

function handleSidebarToggle(): void {
  collapsed.value = !collapsed.value;
  if (!compactViewport?.matches) desktopCollapsed.value = collapsed.value;
}

async function handleFactoryChange(value: unknown): Promise<void> {
  if (typeof value !== 'string' || factoryBusy.value) return;
  if (value === runtimeState.user?.currentFactoryId) return;
  const destination = route.fullPath;
  factoryBusy.value = true;
  try {
    selectFactory(value);
    await synchronizeAccess({ reloadContext: true });
  }
  catch {
    await router.replace({
      path: '/menu-error',
      query: { redirect: encodeURIComponent(destination) },
    });
    factoryBusy.value = false;
    return;
  }
  try {
    await synchronizeCatalog();
    await router.replace(destination);
  }
  catch {
    await router.replace({
      path: '/catalog-error',
      query: { redirect: encodeURIComponent(destination) },
    });
  }
  finally {
    factoryBusy.value = false;
  }
}

async function handleLogout(): Promise<void> {
  resetGeneratedAccess();
  await logout();
  await router.replace('/auth/login');
}

onMounted(() => {
  compactViewport = window.matchMedia('(max-width: 1279px)');
  handleViewportChange(compactViewport);
  compactViewport.addEventListener('change', handleViewportChange);
});

onBeforeUnmount(() => {
  compactViewport?.removeEventListener('change', handleViewportChange);
});
</script>

<template>
  <div class="mom-admin-shell" :data-sidebar-collapsed="collapsed">
    <AdminSidebar
      :active-path="route.path"
      :collapsed="collapsed"
      :groups="navigation"
      :logo-source="momLogo"
      :navigation-label="$t('mom.navigation.primary')"
      :product-name="$t('mom.appName')"
      @home="router.push(defaultAuthorizedPath())"
      @navigate="router.push($event)"
    />

    <div class="mom-admin-shell__workspace">
      <AdminHeader
        :breadcrumbs="breadcrumbs"
        :breadcrumb-label="$t('mom.navigation.breadcrumb')"
        :collapsed="collapsed"
        :current-factory-id="runtimeState.user?.currentFactoryId ?? undefined"
        :factories="runtimeState.user?.factoryIds ?? []"
        :factory-busy="factoryBusy"
        :factory-label="$t('mom.common.factory')"
        :logout-label="$t('mom.common.logout')"
        :preferences-label="$t('mom.settings.open')"
        :toggle-label="$t(collapsed ? 'mom.navigation.expand' : 'mom.navigation.collapse')"
        :user="user"
        @change-factory="handleFactoryChange"
        @logout="handleLogout"
        @open-preferences="router.push('/settings')"
        @toggle-sidebar="handleSidebarToggle"
      />

      <main class="mom-admin-shell__main">
        <div class="mom-admin-shell__content">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.mom-admin-shell {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  color: var(--mom-color-text-primary);
  background: var(--mom-color-surface-canvas);
}

.mom-admin-shell__workspace {
  display: flex;
  min-width: 0;
  min-height: 100vh;
  flex: 1;
  flex-direction: column;
}

.mom-admin-shell__main {
  min-width: 0;
  flex: 1;
  background: var(--mom-color-surface-canvas);
}

.mom-admin-shell__content {
  width: 100%;
  max-width: var(--mom-size-content-lg);
  min-height: calc(100vh - var(--mom-channel-header-height));
  margin: 0 auto;
  padding: var(--mom-channel-page-gutter);
  box-sizing: border-box;
}
</style>
