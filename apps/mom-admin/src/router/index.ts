import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import { createRouterGuard } from './guard';
import { bindCatalogRouter } from './catalog';
import { routes } from './routes';

const useHash = import.meta.env.VITE_ROUTER_HISTORY === 'hash';
const router = createRouter({
  history: useHash ? createWebHashHistory('/') : createWebHistory('/'),
  routes,
  scrollBehavior: (_to, _from, savedPosition) =>
    savedPosition ?? { left: 0, top: 0 },
});

bindCatalogRouter(router);
createRouterGuard(router);

export { router };
