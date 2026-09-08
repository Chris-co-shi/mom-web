<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';

import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const loggingOut = ref(false);

async function handleLogout() {
  loggingOut.value = true;

  try {
    await auth.logout();
  } catch {
    // 本地会话在 store finally 中清理；服务端失败语义后续单独设计。
  } finally {
    loggingOut.value = false;
    await router.replace('/login');
  }
}
</script>

<template>
  <div class="app-layout">
    <aside class="app-sidebar">
      <div class="app-brand">GEO Manufacturing</div>
      <nav class="app-nav">
        <RouterLink to="/users">用户管理</RouterLink>
      </nav>
    </aside>

    <div class="app-main">
      <header class="app-header">
        <span>GEO Manufacturing Platform</span>
        <button class="button button-secondary" type="button" :disabled="loggingOut" @click="handleLogout">
          {{ loggingOut ? '退出中…' : '退出登录' }}
        </button>
      </header>

      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
