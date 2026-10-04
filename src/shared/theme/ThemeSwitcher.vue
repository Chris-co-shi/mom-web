<script setup lang="ts">
import { useTheme, type ThemePreference } from './theme';
import { useLocale } from '../i18n/locale';
import './theme-switcher.css';

const { preference, setPreference } = useTheme();
const { t } = useLocale();

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
  <div class="theme-switcher" role="radiogroup" :aria-label="t('theme.mode')">
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
