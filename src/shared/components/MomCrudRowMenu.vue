<script setup lang="ts">
import { Ellipsis } from '@lucide/vue';
import { nextTick, ref, type ComponentPublicInstance } from 'vue';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import MomButton from '../ui/MomButton.vue';
import './mom-crud-controls.css';

export interface RowMenuAction { key: string; label: string; danger?: boolean }
const props = defineProps<{ label: string; actions: readonly RowMenuAction[]; disabled?: boolean }>();
const emit = defineEmits<{ select: [key: string] }>();
const trigger = ref<ComponentPublicInstance>();
let pendingAction: string | undefined;
function select(key: string): void { if (!props.disabled) pendingAction = key; }
function closeAutoFocus(event: Event): void {
  if (!pendingAction) return;
  // 先关闭菜单并回到持久触发器，再打开业务弹窗，避免记录即将卸载的菜单项。
  event.preventDefault();
  const key = pendingAction;
  pendingAction = undefined;
  (trigger.value?.$el as HTMLElement | undefined)?.focus();
  void nextTick(() => { if (!props.disabled) emit('select', key); });
}
</script>

<template>
  <DropdownMenu v-if="actions.length">
    <DropdownMenuTrigger as-child :disabled="disabled">
      <MomButton ref="trigger" class="mom-crud-row-menu__trigger" variant="ghost" size="icon" :aria-label="label" :disabled="disabled"><Ellipsis :size="17" aria-hidden="true" /></MomButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="mom-crud-row-menu" :side-offset="6" align="end" :aria-label="label" @close-auto-focus="closeAutoFocus">
      <DropdownMenuItem v-for="action in actions" :key="action.key" class="mom-crud-row-menu__item" :class="{ 'mom-crud-row-menu__danger': action.danger }" @select="select(action.key)">{{ action.label }}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
