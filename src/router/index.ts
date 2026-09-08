import { createRouter, createWebHistory } from 'vue-router';

import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import UserListView from '../views/UserListView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: LoginView,
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/users',
        },
        {
          path: 'users',
          component: UserListView,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/users',
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true);

  if (requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    };
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return '/users';
  }

  return true;
});

export default router;
