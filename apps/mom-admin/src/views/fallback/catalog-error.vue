<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button as AButton, Result as AResult } from 'ant-design-vue';

import { $t } from '../../locales';
import { defaultAuthorizedPath } from '../../router/access';
import { synchronizeCatalog } from '../../router/catalog';

const router = useRouter();
const retrying = ref(false);

async function retry(): Promise<void> {
  retrying.value = true;
  try {
    await synchronizeCatalog();
    await router.replace(defaultAuthorizedPath());
  }
  catch {
    // Catalog Runtime 已记录诊断并保持 RESTRICTED；用户可再次重试或退出登录。
  }
  finally {
    retrying.value = false;
  }
}
</script>

<template>
  <div class="mom-result-page">
    <a-result
      status="warning"
      :sub-title="$t('mom.fallback.catalogErrorDescription')"
      :title="$t('mom.fallback.catalogErrorTitle')"
    >
      <template #extra>
        <a-button :loading="retrying" type="primary" @click="retry">
          {{ $t('mom.common.back') }}
        </a-button>
      </template>
    </a-result>
  </div>
</template>
