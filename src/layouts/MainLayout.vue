<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import {
  Blocks,
  BookOpenText,
  Boxes,
  Building2,
  ChevronDown,
  Factory,
  Gauge,
  KeyRound,
  Languages,
  LayoutDashboard,
  ListTree,
  MapPin,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  Settings2,
  ShieldCheck,
  Tags,
  UsersRound,
  Warehouse,
  Workflow,
  Wrench,
} from '@lucide/vue';
import { hasAuthorities } from '../modules/auth/model/auth-permissions';
import { logout, useAuthSession } from '../modules/auth/model/auth-session';
import AccountMenu from '../modules/auth/components/AccountMenu.vue';
import { mainNavigation, type NavigationItem } from '../router/route-registry';
import { ROUTE_NAMES, type MomRouteName } from '../router/route-names';
import LocaleSwitcher from '../shared/i18n/LocaleSwitcher.vue';
import { useLocale } from '../shared/i18n/locale';
import ThemeSwitcher from '../shared/theme/ThemeSwitcher.vue';
import MomButton from '../shared/ui/MomButton.vue';
import MomModal from '../shared/components/MomModal.vue';
import MomBrand from '../shared/components/MomBrand.vue';
import { readNavigationCollapsed, writeNavigationCollapsed } from './navigation-preference';
import './layouts.css';

const route = useRoute();
const router = useRouter();
const navigationCollapsed = ref(readNavigationCollapsed());
const { width } = useWindowSize();
const narrow = computed(() => width.value < 640);
const automaticRail = computed(() => width.value < 1120);
const rail = computed(() => navigationCollapsed.value || automaticRail.value);
const navigationOpen = ref(false);
watch(() => route.fullPath, () => { navigationOpen.value = false; });
watch(narrow, () => { navigationOpen.value = false; });
const expandedNavigationGroup = ref<string | null>(null);
const expandedNavigationSection = ref<string | null>(null);
const loggingOut = ref(false);
const { t } = useLocale();
const { user, authorities } = useAuthSession();
const accountName = computed(() => user.value?.displayName.trim() || user.value?.username || t('navigation.currentUser'));
const navigationIcons = {
  [ROUTE_NAMES.mdmPlants]: Factory,
  [ROUTE_NAMES.mdmWorkshops]: Building2,
  [ROUTE_NAMES.mdmProductionLines]: Workflow,
  [ROUTE_NAMES.mdmWorkstations]: Wrench,
  [ROUTE_NAMES.mdmWarehouses]: Warehouse,
  [ROUTE_NAMES.mdmWarehouseAreas]: Boxes,
  [ROUTE_NAMES.mdmLocationTypes]: Tags,
  [ROUTE_NAMES.mdmLocations]: MapPin,
  [ROUTE_NAMES.mdmUom]: Ruler,
  [ROUTE_NAMES.mdmCategories]: ListTree,
  [ROUTE_NAMES.mdmMaterials]: Package,
  [ROUTE_NAMES.iamUsers]: UsersRound,
  [ROUTE_NAMES.iamRoles]: ShieldCheck,
  [ROUTE_NAMES.iamPermissions]: KeyRound,
  [ROUTE_NAMES.foundationOverview]: LayoutDashboard,
  [ROUTE_NAMES.systemDictionaries]: ListTree,
  [ROUTE_NAMES.systemLocales]: Languages,
  [ROUTE_NAMES.systemMessages]: BookOpenText,
} satisfies Partial<Record<MomRouteName, typeof UsersRound>>;
const navigationGroupIcons = {
  iam: ShieldCheck,
  mdm: Boxes,
  system: Settings2,
  foundation: Gauge,
};

const currentTitle = computed(() => t(route.meta.titleKey));
const visibleNavigation = computed(() => {
  // 读取 authorities 以建立 Vue 响应式依赖；最终权限仍由后端 Resource Server 判定。
  void authorities.value;
  return mainNavigation.filter((item) => hasAuthorities(item.permissions, item.permissionMode));
});
interface NavigationSection {
  id: string;
  titleKey: NavigationItem['titleKey'];
  order: number;
  items: NavigationItem[];
}

function buildNavigationSections(items: NavigationItem[]): NavigationSection[] {
  const sections = new Map<string, NavigationSection>();
  for (const item of items) {
    if (!item.section || !item.sectionTitleKey || item.sectionOrder === undefined) continue;
    const section = sections.get(item.section) ?? {
      id: item.section,
      titleKey: item.sectionTitleKey,
      order: item.sectionOrder,
      items: [],
    };
    section.items.push(item);
    sections.set(item.section, section);
  }
  return [...sections.values()].sort((left, right) => left.order - right.order);
}

const navigationGroups = computed(() => [
  { id: 'iam', title: t('navigation.iam'), icon: navigationGroupIcons.iam, items: visibleNavigation.value.filter((item) => item.group === 'iam') },
  { id: 'mdm', title: t('navigation.mdm'), icon: navigationGroupIcons.mdm, items: visibleNavigation.value.filter((item) => item.group === 'mdm') },
  { id: 'system', title: t('system.navigation'), icon: navigationGroupIcons.system, items: visibleNavigation.value.filter((item) => item.group === 'system') },
  { id: 'foundation', title: t('shell.foundationGroup'), icon: navigationGroupIcons.foundation, items: visibleNavigation.value.filter((item) => item.group === 'foundation') },
].filter((group) => group.items.length > 0).map((group) => ({
  ...group,
  sections: buildNavigationSections(group.items),
})));
const activeNavigationItem = computed(() => visibleNavigation.value.find((item) => item.name === route.name));
const activeNavigationGroup = computed(() =>
  activeNavigationItem.value?.group ?? navigationGroups.value[0]?.id ?? null,
);

watch(activeNavigationGroup, (group) => {
  if (group) expandedNavigationGroup.value = group;
}, { immediate: true });
watch(activeNavigationItem, (item) => {
  if (item?.section) expandedNavigationSection.value = item.section;
}, { immediate: true });

function isNavigationGroupExpanded(group: string): boolean {
  return !rail.value && expandedNavigationGroup.value === group;
}

function toggleNavigationGroup(group: string): void {
  if (automaticRail.value) {
    expandedNavigationGroup.value = group;
    navigationOpen.value = true;
    return;
  }
  if (navigationCollapsed.value) {
    navigationCollapsed.value = false;
    writeNavigationCollapsed(false);
    expandedNavigationGroup.value = group;
    return;
  }
  expandedNavigationGroup.value = expandedNavigationGroup.value === group ? null : group;
}

function toggleNavigationSection(section: string): void {
  expandedNavigationSection.value = expandedNavigationSection.value === section ? null : section;
}

function toggleNavigation(): void {
  navigationCollapsed.value = !navigationCollapsed.value;
  writeNavigationCollapsed(navigationCollapsed.value);
  if (!navigationCollapsed.value && !expandedNavigationGroup.value) {
    expandedNavigationGroup.value = activeNavigationGroup.value;
  }
}

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
  <div class="app-shell" :class="{ 'app-shell--collapsed': rail, 'app-shell--narrow': narrow }">
    <a class="skip-link" href="#main-content">{{ t('shell.skipToContent') }}</a>

    <aside v-if="!narrow" class="app-sidebar" :aria-label="t('shell.mainNavigation')">
      <div class="app-brand" aria-label="MOM">
        <MomBrand icon-only />
        <span class="app-brand__copy">
          <strong>MOM</strong>
        </span>
      </div>

      <div id="app-sidebar-navigation" class="app-sidebar__navigation">
        <section
          v-for="group in navigationGroups"
          :key="group.id"
          class="app-nav-group"
          :class="{ 'app-nav-group--current': activeNavigationGroup === group.id }"
        >
          <button
            type="button"
            class="app-nav-group__trigger"
            :aria-controls="`app-navigation-${group.id}`"
            :aria-expanded="isNavigationGroupExpanded(group.id)"
            :aria-label="rail ? group.title : undefined"
            :data-navigation-group="group.id"
            :title="rail ? group.title : undefined"
            @click="toggleNavigationGroup(group.id)"
          >
            <component :is="group.icon" class="app-nav-group__icon" :size="19" :stroke-width="1.8" aria-hidden="true" />
            <span class="app-nav-group__label">{{ group.title }}</span>
            <ChevronDown class="app-nav-group__chevron" :size="16" aria-hidden="true" />
          </button>
          <nav
            v-show="isNavigationGroupExpanded(group.id)"
            :id="`app-navigation-${group.id}`"
            class="app-nav"
            :aria-label="group.title"
          >
            <template v-if="group.sections.length > 0">
              <section v-for="section in group.sections" :key="section.id" class="app-nav-section">
                <button
                  type="button"
                  class="app-nav-section__trigger"
                  :aria-controls="`app-navigation-section-${section.id}`"
                  :aria-expanded="expandedNavigationSection === section.id"
                  :data-navigation-section="section.id"
                  @click="toggleNavigationSection(section.id)"
                >
                  <span>{{ t(section.titleKey) }}</span>
                  <ChevronDown :size="14" aria-hidden="true" />
                </button>
                <div v-show="expandedNavigationSection === section.id" :id="`app-navigation-section-${section.id}`" class="app-nav-section__items">
                  <RouterLink
                    v-for="item in section.items"
                    :key="item.name"
                    :to="{ name: item.name }"
                    class="app-nav__link"
                    :aria-current="route.name === item.name ? 'page' : undefined"
                  >
                    <component :is="navigationIcons[item.name as keyof typeof navigationIcons] ?? Blocks" class="app-nav__icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
                    <span class="app-nav__label">{{ t(item.titleKey) }}</span>
                  </RouterLink>
                </div>
              </section>
            </template>
            <template v-else>
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
            </template>
          </nav>
        </section>
      </div>

      <div v-if="!automaticRail" class="app-sidebar__footer">
        <MomButton
          data-testid="sidebar-toggle"
          class="app-sidebar__toggle"
          variant="ghost"
          :size="navigationCollapsed ? 'icon' : 'default'"
          :aria-label="navigationCollapsed ? t('shell.expandNavigation') : t('shell.collapseNavigation')"
          aria-controls="app-sidebar-navigation"
          :aria-expanded="!navigationCollapsed"
          :title="navigationCollapsed ? t('shell.expandNavigation') : undefined"
          @click="toggleNavigation"
        >
          <PanelLeftOpen v-if="navigationCollapsed" :size="18" aria-hidden="true" />
          <PanelLeftClose v-else :size="18" aria-hidden="true" />
          <span class="app-sidebar__toggle-label">{{ t('shell.collapseNavigation') }}</span>
        </MomButton>
      </div>
    </aside>

    <section class="app-workspace">
      <header class="app-header">
        <div class="app-header__leading">
          <MomButton v-if="narrow" data-testid="navigation-open" variant="ghost" size="icon"
            :aria-label="t('shell.mainNavigation')" :aria-expanded="navigationOpen" @click="navigationOpen = true">
            <PanelLeftOpen :size="20" aria-hidden="true" />
          </MomButton>
          <div>
            <strong>{{ currentTitle }}</strong>
          </div>
        </div>

        <div class="app-header__trailing">
          <LocaleSwitcher :compact="automaticRail" />
          <ThemeSwitcher :compact="automaticRail" />
          <AccountMenu
            :account-name="accountName"
            :account-label="t('navigation.account')"
            :password-label="t('account.password')"
            :logout-label="t(loggingOut ? 'auth.logout.submitting' : 'auth.logout.action')"
            :disabled="loggingOut"
            @logout="handleLogout"
          />
        </div>
      </header>

      <main id="main-content" class="app-content" tabindex="-1">
        <RouterView />
      </main>
    </section>
    <MomModal :open="navigationOpen" :title="t('shell.mainNavigation')" :close-label="t('shell.collapseNavigation')"
      placement="left" :width="320" @close="navigationOpen = false">
      <div class="app-drawer-navigation">
        <section v-for="group in navigationGroups" :key="group.id">
          <MomButton variant="ghost" :aria-expanded="expandedNavigationGroup === group.id" @click="expandedNavigationGroup = expandedNavigationGroup === group.id ? null : group.id">
            <component :is="group.icon" :size="18" aria-hidden="true" />{{ group.title }}<ChevronDown :size="16" aria-hidden="true" />
          </MomButton>
          <nav v-show="expandedNavigationGroup === group.id" :aria-label="group.title">
            <template v-if="group.sections.length > 0">
              <section v-for="section in group.sections" :key="section.id" class="app-nav-section">
                <MomButton variant="ghost" :aria-expanded="expandedNavigationSection === section.id" @click="toggleNavigationSection(section.id)">
                  {{ t(section.titleKey) }}<ChevronDown :size="14" aria-hidden="true" />
                </MomButton>
                <div v-show="expandedNavigationSection === section.id" class="app-nav-section__items">
                  <RouterLink v-for="item in section.items" :key="item.name" :to="{ name: item.name }" class="app-nav__link"
                    :aria-current="route.name === item.name ? 'page' : undefined" @click="navigationOpen = false">{{ t(item.titleKey) }}</RouterLink>
                </div>
              </section>
            </template>
            <template v-else>
              <RouterLink v-for="item in group.items" :key="item.name" :to="{ name: item.name }" class="app-nav__link"
                :aria-current="route.name === item.name ? 'page' : undefined" @click="navigationOpen = false">{{ t(item.titleKey) }}</RouterLink>
            </template>
          </nav>
        </section>
      </div>
    </MomModal>
  </div>
</template>
