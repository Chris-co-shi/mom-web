import type { MomIconKey } from '@mom/common-ui';

export interface AdminShellNavigationItem {
  iconKey: MomIconKey;
  path: string;
  title: string;
}

export interface AdminShellNavigationGroup {
  iconKey: MomIconKey;
  key: string;
  tasks: readonly AdminShellNavigationItem[];
  title: string;
}

export interface AdminShellUser {
  avatar: string;
  displayName: string;
  userType: string;
  username: string;
}
