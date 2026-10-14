<script setup lang="ts">
import { computed, ref } from 'vue';
import { emergencyText, useLocale } from './locale';
import { Languages } from '@lucide/vue';
import MomButton from '../ui/MomButton.vue';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../ui/dropdown-menu';
import './locale-switcher.css';

const { locale, supportedLocales, setLocale, t } = useLocale();
defineProps<{ compact?: boolean }>();
const switching = ref(false);
const failure = ref('');
const options = computed(() => supportedLocales.value.filter((item) => item.enabled)
  .sort((a, b) => a.sortOrder - b.sortOrder || a.localeCode.localeCompare(b.localeCode)));

async function select(nextLocale: string): Promise<void> {
  if (switching.value || nextLocale === locale.value) return;
  switching.value = true;
  failure.value = '';
  try { await setLocale(nextLocale); }
  catch { failure.value = emergencyText('switchingFailed'); }
  finally { switching.value = false; }
}
</script>

<template>
  <template v-if="compact">
    <DropdownMenu>
      <DropdownMenuTrigger as-child><MomButton variant="ghost" size="icon" :disabled="switching" :aria-label="t('locale.mode')" :title="t('locale.mode')"><Languages :size="18" aria-hidden="true" /></MomButton></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuRadioGroup :model-value="locale" @update:model-value="select(String($event))">
        <DropdownMenuRadioItem v-for="option in options" :key="option.localeCode" :value="option.localeCode" :disabled="switching">{{ option.nativeName }}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup></DropdownMenuContent>
    </DropdownMenu>
    <span v-if="failure" role="alert">{{ failure }}</span>
  </template>
  <div v-else class="locale-switcher" role="radiogroup" :aria-label="t('locale.mode')">
    <button
      v-for="option in options"
      :key="option.localeCode"
      class="locale-switcher__option"
      type="button"
      role="radio"
      :disabled="switching"
      :aria-checked="locale === option.localeCode"
      :aria-label="option.nativeName"
      :title="option.displayName"
      @click="select(option.localeCode)"
    >
      {{ option.nativeName }}
    </button>
    <span v-if="failure" role="alert">{{ failure }}</span>
  </div>
</template>
