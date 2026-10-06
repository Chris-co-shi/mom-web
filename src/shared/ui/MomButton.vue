<script setup lang="ts">
import { computed } from 'vue';
import { Button } from './button';

const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  theme?: 'primary';
  mode?: 'text';
  size?: 'default' | 'large' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  round?: boolean;
}>(), { type: 'button', variant: 'default', size: 'default' });

const appearance = computed(() => props.mode === 'text' ? 'ghost' : props.theme === 'primary' ? 'default' : props.variant);
const librarySize = computed(() => props.size === 'large' ? 'lg' : props.size);
</script>

<template>
  <Button :type="type" :variant="appearance" :size="librarySize" class="mom-ui-button" :class="[`mom-ui-button--${appearance}`, `mom-ui-button--${size}`, { 'mom-ui-button--block': block }]"
    :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span v-if="loading" class="mom-ui-spinner" aria-hidden="true"></span><slot />
  </Button>
</template>
