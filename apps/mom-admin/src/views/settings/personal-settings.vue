<script setup lang="ts">
import { DataState, Page } from '@mom/common-ui';

import { $t } from '../../locales';
</script>

<template>
  <Page
    :description="$t('mom.settings.description')"
    :title="$t('mom.settings.title')"
  >
    <DataState
      kind="PARTIAL"
      :description="$t('mom.settings.unavailableDescription')"
      :title="$t('mom.settings.unavailableTitle')"
    />
  </Page>
</template>
