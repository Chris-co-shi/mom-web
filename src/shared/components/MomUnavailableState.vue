<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CircleAlert, RotateCw } from '@lucide/vue';
import { emergencyLocale, emergencyMessages } from '../i18n/emergency-messages';
import MomButton from '../ui/MomButton.vue';
import './mom-unavailable-state.css';

const props = defineProps<{
  mode: 'boot' | 'route';
  returnTo?: string;
}>();

const copy = computed(() => emergencyMessages[emergencyLocale(props.mode === 'route')]);
const reference = computed(() => props.mode === 'boot' ? 'BOOT-01' : 'ROUTE-01');
const heading = ref<HTMLElement | null>(null);

onMounted(() => heading.value?.focus({ preventScroll: true }));

function retry(): void {
  if (props.mode === 'boot') {
    window.location.reload();
    return;
  }
  const destination = props.returnTo?.startsWith('/') && !props.returnTo.startsWith('//')
    && !props.returnTo.startsWith('/offline') ? props.returnTo : '/';
  window.location.assign(destination);
}
</script>

<template>
  <main class="mom-unavailable">
    <div class="mom-unavailable__ambient" aria-hidden="true"></div>
    <section class="mom-unavailable__panel" aria-labelledby="mom-unavailable-title"
      aria-describedby="mom-unavailable-description">
      <div class="mom-unavailable__brand" aria-label="MOM">
        <span class="mom-unavailable__brand-mark" aria-hidden="true"></span>
        <span>MOM</span>
      </div>

      <div class="mom-unavailable__status">
        <CircleAlert :size="18" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ copy.eyebrow }}</span>
      </div>

      <h1 id="mom-unavailable-title" ref="heading" tabindex="-1">
        {{ mode === 'boot' ? copy.bootTitle : copy.routeTitle }}
      </h1>
      <p id="mom-unavailable-description">
        {{ mode === 'boot' ? copy.bootDescription : copy.routeDescription }}
      </p>

      <div class="mom-unavailable__actions">
        <MomButton theme="primary" size="large" class="mom-unavailable__retry" @click="retry">
          <RotateCw :size="17" :stroke-width="2" aria-hidden="true" />
          {{ copy.retry }}
        </MomButton>
      </div>

      <div class="mom-unavailable__reference">
        <span>{{ copy.reference }}</span>
        <code>{{ reference }}</code>
      </div>
    </section>
  </main>
</template>
