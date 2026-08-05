<script setup lang="ts">
import { Button as AButton, Result as AResult } from 'ant-design-vue';

import { $t } from '../../locales';
import { runtimeState } from '../../runtime';

function reloadApplication(): void {
  window.location.reload();
}
</script>

<template>
  <div class="mom-result-page">
    <a-result
      status="500"
      :sub-title="runtimeState.error ?? $t('mom.fallback.runtimeErrorDescription')"
      :title="$t('mom.fallback.runtimeErrorTitle')"
    >
      <template #extra>
        <a-button type="primary" @click="reloadApplication">
          {{ $t('mom.common.reload') }}
        </a-button>
      </template>
    </a-result>
  </div>
</template>
