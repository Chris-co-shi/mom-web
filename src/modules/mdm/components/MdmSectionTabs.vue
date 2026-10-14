<script setup lang="ts">
import { computed } from 'vue';
import { MomButton } from '../../../shared/ui';
import { nextTabValue, type TabNavigationKey } from '../model/mdm-display';

export interface MdmSectionTabItem { value: string; label: string }
const props = defineProps<{ modelValue: string; items: readonly MdmSectionTabItem[]; label: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const activeIndex = computed(() => Math.max(0, props.items.findIndex(item => item.value === props.modelValue)));
const active = computed(() => props.items[activeIndex.value]);
const tabId = (value: string) => `mdm-section-tab-${value}`;
const panelId = (value: string) => `mdm-section-panel-${value}`;

function select(value: string): void { if (props.disabled) return; emit('update:modelValue', value); }
function navigate(event: KeyboardEvent): void {
  if (props.disabled) return;
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const values = props.items.map(item => item.value);
  const next = nextTabValue(values, props.modelValue, event.key as TabNavigationKey);
  select(next);
  const tabs = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs?.[values.indexOf(next)]?.focus();
}
</script>

<template>
  <div class="mdm-section-tabs">
    <div class="mdm-section-tabs__list" role="tablist" :aria-label="label">
      <MomButton v-for="item in items" :id="tabId(item.value)" :key="item.value" type="button"
        class="mdm-section-tabs__tab" variant="ghost" role="tab" :disabled="disabled"
        :tabindex="modelValue === item.value ? 0 : -1" :aria-selected="modelValue === item.value"
        :aria-controls="panelId(item.value)" @click="select(item.value)" @keydown="navigate">
        {{ item.label }}
      </MomButton>
    </div>
    <div v-if="active" :id="panelId(active.value)" class="mdm-section-tabs__panel" role="tabpanel"
      :aria-labelledby="tabId(active.value)" tabindex="0">
      <slot />
    </div>
  </div>
</template>
