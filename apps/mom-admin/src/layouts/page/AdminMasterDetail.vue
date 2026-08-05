<script setup lang="ts">
defineProps<{
  hasDetail: boolean;
}>();
</script>

<template>
  <div class="mom-admin-master-detail" :data-has-detail="hasDetail">
    <div class="mom-admin-master-detail__grid">
      <div class="mom-admin-master-detail__master">
        <slot name="master" />
      </div>
      <div v-if="hasDetail" class="mom-admin-master-detail__detail">
        <slot name="detail" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mom-admin-master-detail {
  min-width: 0;
  container-type: inline-size;
}

.mom-admin-master-detail__grid {
  display: grid;
  min-width: 0;
  gap: var(--mom-space-4);
  grid-template-columns: minmax(0, 1fr);
}

.mom-admin-master-detail__master,
.mom-admin-master-detail__detail {
  min-width: 0;
}

@container (width >= 72rem) {
  .mom-admin-master-detail[data-has-detail='true'] .mom-admin-master-detail__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
  }
}
</style>
