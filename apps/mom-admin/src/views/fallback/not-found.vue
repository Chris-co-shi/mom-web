<script setup lang="ts">
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { defaultAuthorizedPath } from '../../router/access';

const router = useRouter();
</script>

<template>
  <div class="mom-result-page">
    <a-result
      status="404"
      :sub-title="$t('mom.fallback.notFoundDescription')"
      :title="$t('mom.fallback.notFoundTitle')"
    >
      <template #extra>
        <a-button
          type="primary"
          @click="router.replace(defaultAuthorizedPath())"
        >
          {{ $t('mom.common.back') }}
        </a-button>
      </template>
    </a-result>
  </div>
</template>
