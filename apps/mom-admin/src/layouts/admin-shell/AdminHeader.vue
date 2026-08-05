<script setup lang="ts">
import { MomIcon } from '@mom/common-ui';
import {
  Button as AButton,
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Select as ASelect,
  SelectOption as ASelectOption,
} from 'ant-design-vue';

import type { AdminShellUser } from './types';

defineProps<{
  breadcrumbs: readonly string[];
  breadcrumbLabel: string;
  collapsed: boolean;
  currentFactoryId?: string;
  factories: readonly string[];
  factoryBusy: boolean;
  factoryLabel: string;
  logoutLabel: string;
  preferencesLabel: string;
  toggleLabel: string;
  user?: AdminShellUser;
}>();

defineEmits<{
  changeFactory: [value: unknown];
  logout: [];
  openPreferences: [];
  toggleSidebar: [];
}>();
</script>

<template>
  <header class="mom-admin-header">
    <div class="mom-admin-header__context">
      <a-button
        class="mom-admin-header__icon-button"
        type="text"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        @click="$emit('toggleSidebar')"
      >
        <MomIcon :icon-key="collapsed ? 'panel-left-open' : 'panel-left-close'" />
      </a-button>

      <nav class="mom-admin-header__breadcrumb" :aria-label="breadcrumbLabel">
        <ol>
          <li v-for="(item, index) in breadcrumbs" :key="`${item}-${index}`">
            <MomIcon v-if="index > 0" icon-key="chevron-right" size="sm" />
            <span :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined">
              {{ item }}
            </span>
          </li>
        </ol>
      </nav>
    </div>

    <div class="mom-admin-header__actions">
      <label v-if="factories.length > 1" class="mom-admin-header__factory">
        <span>{{ factoryLabel }}</span>
        <a-select
          class="mom-admin-header__factory-select"
          :value="currentFactoryId"
          :loading="factoryBusy"
          size="small"
          @change="$emit('changeFactory', $event)"
        >
          <a-select-option
            v-for="factoryId in factories"
            :key="factoryId"
            :value="factoryId"
          >
            {{ factoryId }}
          </a-select-option>
        </a-select>
      </label>

      <a-button
        class="mom-admin-header__icon-button"
        type="text"
        :aria-label="preferencesLabel"
        :title="preferencesLabel"
        @click="$emit('openPreferences')"
      >
        <MomIcon icon-key="settings" />
      </a-button>

      <a-dropdown v-if="user" :trigger="['click']">
        <a-button
          class="mom-admin-header__user"
          type="text"
          :aria-label="`${user.displayName} · ${user.username}`"
          :title="`${user.displayName} · ${user.username}`"
        >
          <span class="mom-admin-header__avatar" aria-hidden="true">{{ user.avatar }}</span>
          <span class="mom-admin-header__identity">
            <strong>{{ user.displayName }}</strong>
            <small>{{ user.username }} · {{ user.userType }}</small>
          </span>
        </a-button>
        <template #overlay>
          <a-menu>
            <a-menu-item key="logout" @click="$emit('logout')">
              <span class="mom-admin-header__menu-item">
                <MomIcon icon-key="log-out" />
                {{ logoutLabel }}
              </span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>
</template>

<style scoped>
.mom-admin-header {
  position: sticky;
  z-index: var(--mom-z-index-sticky);
  top: 0;
  display: flex;
  min-width: 0;
  min-height: var(--mom-channel-header-height);
  padding: var(--mom-space-2) var(--mom-channel-page-gutter);
  align-items: center;
  justify-content: space-between;
  gap: var(--mom-space-4);
  background: var(--mom-color-surface-container);
  border-bottom: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
}

.mom-admin-header__context,
.mom-admin-header__actions,
.mom-admin-header__factory,
.mom-admin-header__breadcrumb ol,
.mom-admin-header__breadcrumb li,
.mom-admin-header__user,
.mom-admin-header__menu-item {
  display: flex;
  min-width: 0;
  align-items: center;
}

.mom-admin-header__context {
  flex: 1;
  gap: var(--mom-space-3);
}

.mom-admin-header__actions {
  flex: 0 0 auto;
  gap: var(--mom-space-2);
}

.mom-admin-header__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mom-admin-header__breadcrumb {
  min-width: 0;
}

.mom-admin-header__breadcrumb ol {
  margin: 0;
  padding: 0;
  gap: var(--mom-space-2);
  list-style: none;
}

.mom-admin-header__breadcrumb li {
  gap: var(--mom-space-2);
  color: var(--mom-color-text-secondary);
  white-space: nowrap;
}

.mom-admin-header__breadcrumb [aria-current='page'] {
  color: var(--mom-color-text-primary);
  font-weight: var(--mom-font-weight-semibold);
}

.mom-admin-header__factory {
  gap: var(--mom-space-2);
  color: var(--mom-color-text-secondary);
  font-size: var(--mom-font-size-12);
}

.mom-admin-header__factory-select {
  width: var(--mom-size-field-sm);
}

.mom-admin-header__user {
  height: auto;
  gap: var(--mom-space-2);
}

.mom-admin-header__avatar {
  display: inline-flex;
  width: var(--mom-channel-control-height);
  height: var(--mom-channel-control-height);
  align-items: center;
  justify-content: center;
  color: var(--mom-color-action-primary);
  background: var(--mom-color-action-primary-soft);
  border-radius: var(--mom-radius-pill);
  font-weight: var(--mom-font-weight-semibold);
}

.mom-admin-header__identity {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  line-height: var(--mom-font-line-height-tight);
}

.mom-admin-header__identity strong {
  color: var(--mom-color-text-primary);
  font-size: var(--mom-font-size-13);
}

.mom-admin-header__identity small {
  color: var(--mom-color-text-secondary);
  font-size: var(--mom-font-size-12);
}

.mom-admin-header__menu-item {
  gap: var(--mom-space-2);
}

@media (width <= 1024px) {
  .mom-admin-header__breadcrumb li:not(:last-child),
  .mom-admin-header__factory > span,
  .mom-admin-header__identity {
    display: none;
  }

  .mom-admin-header__factory-select {
    width: var(--mom-size-field-sm);
  }
}
</style>
