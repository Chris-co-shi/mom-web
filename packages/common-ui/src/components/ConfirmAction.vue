<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import { Alert, Button, Input, Modal } from 'ant-design-vue';

import type { ConfirmActionProps } from '../types';

defineOptions({
  name: 'MomConfirmAction',
});

const props = withDefaults(defineProps<ConfirmActionProps>(), {
  danger: false,
  reason: '',
  reasonError: '',
  reasonLabel: '审计原因',
  requireReason: false,
});

const emit = defineEmits<{
  cancel: [];
  confirm: [];
  'update:open': [value: boolean];
  'update:reason': [value: string];
}>();

const cancelButton = ref<{ $el?: HTMLElement }>();
const reasonInput = ref<{ focus: () => void }>();
let returnFocusTarget: HTMLElement | null = null;

watch(
  () => props.open,
  (open, previous) => {
    if (open && !previous && document.activeElement instanceof HTMLElement) {
      returnFocusTarget = document.activeElement;
    }
    if (!open && previous) {
      void nextTick(() => returnFocusTarget?.focus());
    }
  },
);

function close(): void {
  if (props.state === 'SUBMITTING') return;
  emit('cancel');
  emit('update:open', false);
}

function handleOpenChange(open: boolean): void {
  if (!open) return;
  void nextTick(() => {
    if (props.requireReason) reasonInput.value?.focus();
    else cancelButton.value?.$el?.focus();
  });
}
</script>

<template>
  <Modal
    :closable="state !== 'SUBMITTING'"
    :keyboard="state !== 'SUBMITTING'"
    :mask-closable="false"
    :open="open"
    :title="title"
    @after-open-change="handleOpenChange"
    @cancel="close"
  >
    <div class="mom-confirm-action">
      <p>{{ description }}</p>
      <label v-if="requireReason" class="mom-confirm-action__reason">
        <span>{{ reasonLabel }}</span>
        <Input.TextArea
          ref="reasonInput"
          :aria-invalid="Boolean(reasonError)"
          :disabled="state === 'SUBMITTING'"
          :status="reasonError ? 'error' : undefined"
          :value="reason"
          @update:value="emit('update:reason', $event)"
        />
        <span v-if="reasonError" class="mom-confirm-action__error" role="alert">
          {{ reasonError }}
        </span>
      </label>
      <Alert v-if="state === 'RESULT_UNKNOWN'" show-icon type="warning">
        <template #message>
          <slot name="resultUnknown" />
        </template>
      </Alert>
    </div>

    <template #footer>
      <Button
        ref="cancelButton"
        :disabled="state === 'SUBMITTING'"
        @click="close"
      >
        {{ cancelLabel }}
      </Button>
      <Button
        v-if="state !== 'RESULT_UNKNOWN'"
        :danger="danger"
        :loading="state === 'SUBMITTING'"
        type="primary"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </Button>
    </template>
  </Modal>
</template>
