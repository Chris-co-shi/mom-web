<script setup lang="ts">
import { MomIcon } from '@mom/common-ui';

import type { AdminShellNavigationGroup } from './types';

defineProps<{
  activePath: string;
  collapsed: boolean;
  groups: readonly AdminShellNavigationGroup[];
  logoSource: string;
  navigationLabel: string;
  productName: string;
}>();

defineEmits<{
  home: [];
  navigate: [path: string];
}>();
</script>

<template>
  <aside class="mom-admin-sidebar" :data-collapsed="collapsed">
    <button
      class="mom-admin-sidebar__brand"
      type="button"
      :aria-label="productName"
      @click="$emit('home')"
    >
      <img :src="logoSource" alt="" />
      <span v-if="!collapsed">MOM</span>
    </button>

    <nav class="mom-admin-sidebar__navigation" :aria-label="navigationLabel">
      <section
        v-for="group in groups"
        :key="group.key"
        class="mom-admin-sidebar__group"
        :aria-label="group.title"
      >
        <h2 v-if="!collapsed">
          {{ group.title }}
        </h2>
        <ul>
          <li v-for="task in group.tasks" :key="task.path">
            <a
              class="mom-admin-sidebar__task"
              :aria-current="activePath === task.path ? 'page' : undefined"
              :href="task.path"
              :title="collapsed ? task.title : undefined"
              @click.prevent="$emit('navigate', task.path)"
            >
              <MomIcon :icon-key="task.iconKey" />
              <span v-if="!collapsed">{{ task.title }}</span>
            </a>
          </li>
        </ul>
      </section>
    </nav>
  </aside>
</template>

<style scoped>
.mom-admin-sidebar {
  display: flex;
  width: var(--mom-channel-sidebar-width);
  min-width: var(--mom-channel-sidebar-width);
  height: 100vh;
  overflow: hidden;
  flex-direction: column;
  background: var(--mom-color-surface-navigation);
  border-right: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
  transition:
    width var(--mom-motion-standard) var(--mom-motion-easing-standard),
    min-width var(--mom-motion-standard) var(--mom-motion-easing-standard);
}

.mom-admin-sidebar[data-collapsed='true'] {
  width: var(--mom-channel-sidebar-rail-width);
  min-width: var(--mom-channel-sidebar-rail-width);
}

.mom-admin-sidebar__brand {
  display: flex;
  width: 100%;
  min-height: var(--mom-channel-header-height);
  padding: 0 var(--mom-space-4);
  align-items: center;
  gap: var(--mom-space-3);
  color: var(--mom-color-text-primary);
  background: transparent;
  border: 0;
  border-bottom: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
  cursor: pointer;
  font-size: var(--mom-font-size-20);
  font-weight: var(--mom-font-weight-bold);
  text-align: left;
}

.mom-admin-sidebar__brand:focus-visible {
  outline: var(--mom-component-control-focus-width) solid var(--mom-color-focus-ring);
  outline-offset: calc(var(--mom-component-control-focus-width) * -1);
}

.mom-admin-sidebar[data-collapsed='true'] .mom-admin-sidebar__brand {
  padding: 0;
  justify-content: center;
}

.mom-admin-sidebar__brand img {
  width: var(--mom-size-icon-lg);
  height: var(--mom-size-icon-lg);
  flex: 0 0 auto;
}

.mom-admin-sidebar__navigation {
  min-height: 0;
  padding: var(--mom-space-4) var(--mom-space-3);
  overflow-y: auto;
}

.mom-admin-sidebar__group + .mom-admin-sidebar__group {
  margin-top: var(--mom-space-5);
  padding-top: var(--mom-space-4);
  border-top: var(--mom-border-width) var(--mom-border-style) var(--mom-color-border-default);
}

.mom-admin-sidebar__group h2 {
  margin: 0 0 var(--mom-space-2);
  padding: 0 var(--mom-space-2);
  color: var(--mom-color-text-secondary);
  font-size: var(--mom-font-size-12);
  font-weight: var(--mom-font-weight-semibold);
  letter-spacing: var(--mom-font-letter-spacing-body);
}

.mom-admin-sidebar__group ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mom-admin-sidebar__group li + li {
  margin-top: var(--mom-space-1);
}

.mom-admin-sidebar__task {
  display: flex;
  min-height: var(--mom-channel-control-height);
  padding: 0 var(--mom-space-3);
  align-items: center;
  gap: var(--mom-space-3);
  color: var(--mom-color-text-secondary);
  border-radius: var(--mom-radius-control);
  font-weight: var(--mom-font-weight-medium);
  text-decoration: none;
}

.mom-admin-sidebar__task:focus-visible {
  outline: var(--mom-component-control-focus-width) solid var(--mom-color-focus-ring);
  outline-offset: calc(var(--mom-component-control-focus-width) * -1);
}

.mom-admin-sidebar__task:hover {
  color: var(--mom-color-text-primary);
  background: var(--mom-color-surface-subtle);
}

.mom-admin-sidebar__task[aria-current='page'] {
  color: var(--mom-color-action-primary);
  background: var(--mom-color-action-primary-soft);
}

.mom-admin-sidebar[data-collapsed='true'] .mom-admin-sidebar__navigation {
  padding-inline: var(--mom-space-2);
}

.mom-admin-sidebar[data-collapsed='true'] .mom-admin-sidebar__task {
  padding: 0;
  justify-content: center;
}

</style>
