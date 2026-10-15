<script setup lang="ts">
import { useTheme, type ThemePreference } from './theme';
import { useLocale } from '../i18n/locale';
import { Palette } from '@lucide/vue';
import MomButton from '../ui/MomButton.vue';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '../ui/dropdown-menu';
import './theme-switcher.css';

const { preference, setPreference } = useTheme();
const { t } = useLocale();
defineProps<{ compact?: boolean }>();

const options: ReadonlyArray<{
  value: ThemePreference;
  labelKey: 'theme.light' | 'theme.dark' | 'theme.system';
  shortLabelKey: 'theme.lightShort' | 'theme.darkShort' | 'theme.systemShort';
}> = [
  { value: 'light', labelKey: 'theme.light', shortLabelKey: 'theme.lightShort' },
  { value: 'dark', labelKey: 'theme.dark', shortLabelKey: 'theme.darkShort' },
  { value: 'system', labelKey: 'theme.system', shortLabelKey: 'theme.systemShort' },
];
</script>

<template>
  <DropdownMenu v-if="compact">
    <DropdownMenuTrigger as-child><MomButton variant="ghost" size="icon" :aria-label="t('theme.mode')" :title="t('theme.mode')"><Palette :size="18" aria-hidden="true" /></MomButton></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuRadioGroup :model-value="preference" @update:model-value="setPreference($event as ThemePreference)">
      <DropdownMenuRadioItem v-for="option in options" :key="option.value" :value="option.value">{{ t(option.labelKey) }}</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup></DropdownMenuContent>
  </DropdownMenu>
  <div v-else class="theme-switcher" role="radiogroup" :aria-label="t('theme.mode')">
    <button
      v-for="option in options"
      :key="option.value"
      class="theme-switcher__option"
      type="button"
      role="radio"
      :aria-checked="preference === option.value"
      :aria-label="t(option.labelKey)"
      :title="t(option.labelKey)"
      @click="setPreference(option.value)"
    >
      {{ t(option.shortLabelKey) }}
    </button>
  </div>
</template>
