import type { Router } from 'vue-router';

import { ADMIN_TASKS, createAdminTaskRoute } from './registry';

export interface DynamicAdminTaskRoutes {
  activeRouteKeys(): ReadonlySet<string>;
  apply(routeKeys: ReadonlySet<string>): void;
  clear(): void;
  has(routeKey: string): boolean;
}

/**
 * 管理当前 Catalog 表示拥有的 Vue Router 撤销句柄。
 *
 * 未知 routeKey 会在修改 Router 前失败；任何添加异常都会撤销本次已添加记录，避免留下半激活导航。
 */
export function createDynamicAdminTaskRoutes(router: Router): DynamicAdminTaskRoutes {
  let active = new Set<string>();
  let removers: Array<() => void> = [];

  function clear(): void {
    for (const remove of removers.splice(0).reverse()) remove();
    active = new Set();
  }

  function apply(routeKeys: ReadonlySet<string>): void {
    const tasks = ADMIN_TASKS.filter((task) => routeKeys.has(task.routeKey));
    if (tasks.length !== routeKeys.size) {
      throw new TypeError('Catalog contains a routeKey outside the Admin static registry');
    }
    const next = new Set(tasks.map((task) => task.routeKey));
    if (setsEqual(active, next)) return;

    clear();
    const added: Array<() => void> = [];
    try {
      for (const task of tasks) {
        added.push(router.addRoute('Root', createAdminTaskRoute(task)));
      }
      removers = added;
      active = next;
    }
    catch (error) {
      for (const remove of added.reverse()) remove();
      throw error;
    }
  }

  return {
    activeRouteKeys: () => new Set(active),
    apply,
    clear,
    has: (routeKey) => active.has(routeKey),
  };
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}
