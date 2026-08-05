<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button as AButton,
  Result as AResult,
  Space as ASpace,
} from 'ant-design-vue';

import { $t } from '../../locales';
import {
  logout,
  retryAccessInitialization,
  runtimeState,
} from '../../runtime';
import {
  resetGeneratedAccess,
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from '../../router/access';

const route = useRoute();
const router = useRouter();
const retrying = ref(false);

async function retry(): Promise<void> {
  retrying.value = true;
  try {
    await retryAccessInitialization();
    await synchronizeAccess();
    await router.replace(resolveAuthorizedRedirect(route.query.redirect));
  }
  finally {
    retrying.value = false;
  }
}

async function signOut(): Promise<void> {
  resetGeneratedAccess();
  await logout();
  await router.replace('/auth/login');
}
</script>

<template>
  <div class="mom-result-page">
    <a-result
      status="500"
      :sub-title="runtimeState.error
        ?? $t('mom.fallback.menuErrorDescription')"
      :title="$t('mom.fallback.menuErrorTitle')"
    >
      <template #extra>
        <a-space>
          <a-button :loading="retrying" type="primary" @click="retry">
            {{ $t('mom.common.retry') }}
          </a-button>
          <a-button @click="signOut">
            {{ $t('mom.common.logout') }}
          </a-button>
        </a-space>
      </template>
    </a-result>
  </div>
</template>
