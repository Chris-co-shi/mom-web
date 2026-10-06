<script setup lang="ts">
import './mom-management.css';

defineProps<{ titleId: string; title: string; description: string }>();
</script>

<template>
  <header class="mom-management-header">
    <div class="mom-management-header__copy">
      <h1 :id="titleId">{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="mom-management-header__actions"><slot name="actions" /></div>
  </header>
</template>
