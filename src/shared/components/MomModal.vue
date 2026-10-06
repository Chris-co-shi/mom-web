<script setup lang="ts">
import { X } from '@lucide/vue';
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import MomButton from '../ui/MomButton.vue';
import MomLoading from '../ui/MomLoading.vue';
import './mom-modal.css';

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  closeLabel: string;
  width?: number | string;
  busy?: boolean;
  busyText?: string;
}>(), { width: 640, busy: false, busyText: '' });
const emit = defineEmits<{ close: [] }>();
function requestClose(): void { if (!props.busy) emit('close'); }
</script>

<template>
  <DialogRoot :open="open" @update:open="value => { if (!value) requestClose(); }">
    <DialogPortal>
      <DialogOverlay class="mom-modal__overlay" />
      <DialogContent class="mom-modal" :style="{ '--mom-modal-width': typeof width === 'number' ? `${width}px` : width }"
        :aria-busy="busy" @escape-key-down="event => { if (busy) event.preventDefault(); }"
        @interact-outside="event => event.preventDefault()">
        <header class="mom-modal__header">
          <DialogTitle class="mom-modal__title">{{ title }}</DialogTitle>
          <MomButton class="mom-modal__close" variant="outline" size="icon" :aria-label="closeLabel" :disabled="busy" @click="requestClose"><X :size="18" aria-hidden="true" /></MomButton>
        </header>
        <div class="mom-modal__content"><slot /><MomLoading class="mom-modal__loading" :model-value="busy" :text="busyText" /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
