<script setup lang="ts">
import { computed } from 'vue';
import { hasAuthorities, type AuthorityMatchMode } from '../model/auth-permissions';

const props = withDefaults(defineProps<{
  authorities: readonly string[];
  mode?: AuthorityMatchMode;
}>(), {
  mode: 'all',
});

const allowed = computed(() => hasAuthorities(props.authorities, props.mode));
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
