<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { Blocks, BookOpenText, Languages, KeyRound, LayoutDashboard, ListTree, PanelLeftClose, PanelLeftOpen, ShieldCheck, UsersRound } from '@lucide/vue';
import { hasAuthorities } from '../modules/auth/model/auth-permissions';
import { logout, useAuthSession } from '../modules/auth/model/auth-session';
import { mainNavigation } from '../router/route-registry';
import { ROUTE_NAMES, type MomRouteName } from '../router/route-names';
import LocaleSwitcher from '../shared/i18n/LocaleSwitcher.vue';
import { useLocale } from '../shared/i18n/locale';
import ThemeSwitcher from '../shared/theme/ThemeSwitcher.vue';
import MomButton from '../shared/ui/MomButton.vue';
import './layouts.css';

const route = useRoute();
const router = useRouter();
const navigationCollapsed = ref(false);
const loggingOut = ref(false);
const { t } = useLocale();
const { user, authorities } = useAuthSession();
const accountName = computed(() => user.value?.displayName.trim() || user.value?.username || t('account.currentUser'));
const navigationIcons = {
  [ROUTE_NAMES.iamUsers]: UsersRound,
  [ROUTE_NAMES.iamRoles]: ShieldCheck,
  [ROUTE_NAMES.iamPermissions]: KeyRound,
  [ROUTE_NAMES.foundationOverview]: LayoutDashboard,
  [ROUTE_NAMES.systemDictionaries]: ListTree,
  [ROUTE_NAMES.systemLocales]: Languages,
  [ROUTE_NAMES.systemMessages]: BookOpenText,
} satisfies Partial<Record<MomRouteName, typeof UsersRound>>;

const currentTitle = computed(() => t(route.meta.titleKey));
const visibleNavigation = computed(() => {
  // 读取 authorities 以建立 Vue 响应式依赖；最终权限仍由后端 Resource Server 判定。
  void authorities.value;
  return mainNavigation.filter((item) => hasAuthorities(item.permissions, item.permissionMode));
});
const navigationGroups = computed(() => [
  { id: 'iam', title: t('iam.navigation'), items: visibleNavigation.value.filter((item) => item.group === 'iam') },
  { id: 'system', title: t('system.navigation'), items: visibleNavigation.value.filter((item) => item.group === 'system') },
  { id: 'foundation', title: t('shell.foundationGroup'), items: visibleNavigation.value.filter((item) => item.group === 'foundation') },
].filter((group) => group.items.length > 0));

async function handleLogout(): Promise<void> {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await logout();
    await router.replace({ name: ROUTE_NAMES.login });
  } catch {
    await router.replace({ name: ROUTE_NAMES.login, query: { reason: 'logout-incomplete' } });
  } finally {
    loggingOut.value = false;
  }
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--collapsed': navigationCollapsed }">
    <a class="skip-link" href="#main-content">{{ t('shell.skipToContent') }}</a>

    <aside class="app-sidebar" :aria-label="t('shell.mainNavigation')">
      <div class="app-brand" aria-label="MOM">
        <span class="app-brand__mark" aria-hidden="true"><span></span></span>
        <span class="app-brand__copy">
          <strong>MOM</strong>
          <small>MANUFACTURING OS</small>
        </span>
      </div>

      <template v-for="group in navigationGroups" :key="group.id">
        <div class="app-nav__section-label">{{ group.title }}</div>
        <nav class="app-nav" :aria-label="group.title">
          <RouterLink
            v-for="item in group.items"
            :key="item.name"
            :to="{ name: item.name }"
            :title="navigationCollapsed ? t(item.titleKey) : undefined"
            class="app-nav__link"
            :aria-current="route.name === item.name ? 'page' : undefined"
          >
            <component :is="navigationIcons[item.name as keyof typeof navigationIcons] ?? Blocks" class="app-nav__icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
            <span class="app-nav__label">{{ t(item.titleKey) }}</span>
          </RouterLink>
        </nav>
      </template>

      <div class="app-sidebar__footer">
        <span class="app-status-dot" aria-hidden="true"></span>
        <span class="app-sidebar__footer-copy">
          <strong>FOUNDATION</strong>
          <small>LOCAL · READY</small>
        </span>
      </div>
    </aside>

    <section class="app-workspace">
      <header class="app-header">
        <div class="app-header__leading">
          <MomButton
            class="app-icon-button"
            variant="outline"
            size="icon"
            :aria-label="navigationCollapsed ? t('shell.expandNavigation') : t('shell.collapseNavigation')"
            :aria-expanded="!navigationCollapsed"
            @click="navigationCollapsed = !navigationCollapsed"
          >
            <PanelLeftOpen v-if="navigationCollapsed" :size="18" aria-hidden="true" />
            <PanelLeftClose v-else :size="18" aria-hidden="true" />
          </MomButton>
          <span class="app-header__divider" aria-hidden="true"></span>
          <div>
            <span class="app-header__eyebrow">PC WEB FOUNDATION</span>
            <strong>{{ currentTitle }}</strong>
          </div>
        </div>

        <div class="app-header__trailing">
          <div class="app-header__status" :aria-label="t('shell.currentRuntime')">
            <span class="app-status-dot" aria-hidden="true"></span>
            <span>{{ t('shell.routerOnline') }}</span>
          </div>
          <span class="app-header__divider" aria-hidden="true"></span>
          <LocaleSwitcher />
          <ThemeSwitcher />
          <RouterLink class="app-current-identity" :to="{ name: ROUTE_NAMES.account }" :title="t('account.title')">
            <small>{{ t('account.title') }}</small>
            <strong>{{ accountName }}</strong>
          </RouterLink>
          <MomButton class="app-session-button" variant="outline" :disabled="loggingOut" @click="handleLogout">
            {{ loggingOut ? t('auth.logout.submitting') : t('auth.logout.action') }}
          </MomButton>
        </div>
      </header>

      <main id="main-content" class="app-content" tabindex="-1">
        <RouterView />
      </main>
    </section>
  </div>
</template>
