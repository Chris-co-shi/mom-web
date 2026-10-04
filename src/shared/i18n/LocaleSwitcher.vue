<script setup lang="ts">
import { useLocale, type SupportedLocale } from './locale';
import './locale-switcher.css';

const { locale, setLocale, t } = useLocale();

const options: ReadonlyArray<{
  value: SupportedLocale;
  labelKey: 'locale.zhCN' | 'locale.enUS';
  shortLabelKey: 'locale.zhCNShort' | 'locale.enUSShort';
}> = [
  { value: 'zh-CN', labelKey: 'locale.zhCN', shortLabelKey: 'locale.zhCNShort' },
  { value: 'en-US', labelKey: 'locale.enUS', shortLabelKey: 'locale.enUSShort' },
];
</script>

<template>
  <div class="locale-switcher" role="radiogroup" :aria-label="t('locale.mode')">
    <button
      v-for="option in options"
      :key="option.value"
      class="locale-switcher__option"
      type="button"
      role="radio"
      :aria-checked="locale === option.value"
      :aria-label="t(option.labelKey)"
      :title="t(option.labelKey)"
      @click="setLocale(option.value)"
    >
      {{ t(option.shortLabelKey) }}
    </button>
  </div>
</template>
