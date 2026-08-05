import type { Component } from 'vue';

import {
  AppWindow,
  ChevronRight,
  CircleHelp,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-vue-next';

export type MomIconKey =
  | 'users'
  | 'shield-check'
  | 'key-round'
  | 'monitor-smartphone'
  | 'scroll-text'
  | 'app-window'
  | 'chevron-right'
  | 'log-out'
  | 'panel-left-close'
  | 'panel-left-open'
  | 'settings';

const icons: Record<MomIconKey, Component> = {
  'app-window': AppWindow,
  'chevron-right': ChevronRight,
  'key-round': KeyRound,
  'log-out': LogOut,
  'monitor-smartphone': MonitorSmartphone,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  'scroll-text': ScrollText,
  'settings': Settings,
  'shield-check': ShieldCheck,
  'users': Users,
};

export function resolveMomIcon(iconKey: string): {
  component: Component;
  known: boolean;
} {
  const component = icons[iconKey as MomIconKey];
  return component
    ? { component, known: true }
    : { component: CircleHelp, known: false };
}
