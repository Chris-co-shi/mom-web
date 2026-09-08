import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { login as requestLogin, logout as requestLogout } from '../api/auth';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null);
  const tokenType = ref<string>('Bearer');
  const expiresAt = ref<string | null>(null);

  const isAuthenticated = computed(() => accessToken.value !== null);

  async function login(username: string, password: string) {
    const session = await requestLogin({ username, password });

    accessToken.value = session.accessToken;
    tokenType.value = session.tokenType;
    expiresAt.value = session.expiresAt;
  }

  async function logout() {
    const token = accessToken.value;

    try {
      if (token) {
        await requestLogout(token);
      }
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    accessToken.value = null;
    tokenType.value = 'Bearer';
    expiresAt.value = null;
  }

  return {
    accessToken,
    tokenType,
    expiresAt,
    isAuthenticated,
    login,
    logout,
    clearSession,
  };
});
