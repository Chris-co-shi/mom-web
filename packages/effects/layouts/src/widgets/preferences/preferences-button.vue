<script lang="ts" setup>
import { Settings } from '@vben/icons';
import { $t } from '@vben/locales';

import { VbenIconButton } from '@vben-core/shadcn-ui';

import Preferences from './preferences.vue';

const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}
</script>
<template>
  <Preferences
    v-slot="{ open }"
    @clear-preferences-and-logout="clearPreferencesAndLogout"
  >
    <VbenIconButton
      :aria-label="$t('preferences.title')"
      :tooltip="$t('preferences.title')"
      class="hover:animate-[shrink_0.3s_ease-in-out]"
      @click="open"
    >
      <Settings class="size-4 text-foreground" />
    </VbenIconButton>
  </Preferences>
</template>
