<script setup lang="ts">
import { computed, ref } from 'vue';
import { emergencyText, useLocale } from './locale';
import './locale-switcher.css';

const { locale, supportedLocales, setLocale, t } = useLocale();
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
  <div class="locale-switcher" role="radiogroup" :aria-label="t('locale.mode')">
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
