<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { BasicLayout, UserDropdown } from '@vben/layouts';
import { $t } from '@vben/locales';
import { clearCache } from '@vben/preferences';

import { logout, runtimeState, selectFactory } from '../runtime';
import {
  defaultAuthorizedPath,
  resetGeneratedAccess,
} from '../router/access';

const router = useRouter();
const user = computed(() => runtimeState.user);
const avatar = computed(() =>
  user.value?.displayName.slice(0, 1).toUpperCase() ?? '',
);

async function handleLogout(clearPreferences = false): Promise<void> {
  if (clearPreferences) {
    await clearCache();
  }
  resetGeneratedAccess();
  await logout();
  await router.replace('/auth/login');
}

async function handleFactoryChange(value: unknown): Promise<void> {
  if (typeof value !== 'string') return;
  selectFactory(value);
  await router.replace(router.currentRoute.value.fullPath);
}

async function handleLogoClick(): Promise<void> {
  await router.push(defaultAuthorizedPath());
}
</script>

<template>
  <BasicLayout
    @clear-preferences-and-logout="handleLogout(true)"
    @click-logo="handleLogoClick"
  >
    <template #logo-text>
      <span class="font-semibold">MOM</span>
    </template>

    <template #header-right-10>
      <div
        v-if="user && user.factoryIds.length > 1"
        class="mr-2 hidden items-center gap-2 lg:flex"
      >
        <span class="text-xs text-muted-foreground">
          {{ $t('mom.common.factory') }}
        </span>
        <a-select
          :value="user.currentFactoryId ?? undefined"
          class="w-44"
          size="small"
          @change="handleFactoryChange"
        >
          <a-select-option
            v-for="factoryId in user.factoryIds"
            :key="factoryId"
            :value="factoryId"
          >
            {{ factoryId }}
          </a-select-option>
        </a-select>
      </div>
    </template>

    <template #user-dropdown>
      <UserDropdown
        :avatar="avatar"
        :description="user?.username"
        :tag-text="user?.userType"
        :text="user?.displayName"
        @clear-preferences-and-logout="handleLogout(true)"
        @logout="handleLogout(false)"
      />
    </template>
  </BasicLayout>
</template>
