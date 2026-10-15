<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import MomButton from '../ui/MomButton.vue';
import MomInput from '../ui/MomInput.vue';
import MomSelect from '../ui/MomSelect.vue';
import './mom-crud-controls.css';

const props = defineProps<{
  pageNo: number;
  pageSize: number;
  total: number;
  summary: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  jumpLabel: string;
  goLabel: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ page: [pageNo: number]; size: [pageSize: number] }>();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const jumpTo = ref(props.pageNo);
watch(() => props.pageNo, (pageNo) => { jumpTo.value = pageNo; });

function changeSize(value: unknown): void {
  const nextSize = Number(value);
  if ([10, 20, 50].includes(nextSize) && nextSize !== props.pageSize) emit('size', nextSize);
}

function jumpPage(): void {
  const nextPage = Math.trunc(Number(jumpTo.value));
  if (Number.isFinite(nextPage) && nextPage >= 1 && nextPage <= pageCount.value && nextPage !== props.pageNo) emit('page', nextPage);
}
</script>

<template>
  <div class="mom-crud-pagination">
    <span class="mom-crud-pagination__summary">{{ summary }}</span>
    <div class="mom-crud-pagination__controls">
      <label class="mom-crud-pagination__size">{{ pageSizeLabel }}
        <MomSelect :model-value="pageSize" :options="[{ label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 }]"
          :disabled="disabled" @change="changeSize($event.value)" />
      </label>
      <MomButton type="button" variant="outline" size="icon" :aria-label="previousLabel" :disabled="disabled || pageNo <= 1" @click="emit('page', pageNo - 1)"><ChevronLeft :size="16" aria-hidden="true" /></MomButton>
      <span class="mom-crud-pagination__number">{{ pageNo }} / {{ pageCount }}</span>
      <MomButton type="button" variant="outline" size="icon" :aria-label="nextLabel" :disabled="disabled || pageNo >= pageCount" @click="emit('page', pageNo + 1)"><ChevronRight :size="16" aria-hidden="true" /></MomButton>
      <form class="mom-crud-pagination__jump" @submit.prevent="jumpPage">
        <label>{{ jumpLabel }} <MomInput :model-value="String(jumpTo)" type="number" :min="1" :max="pageCount" :disabled="disabled" @update:model-value="jumpTo = Number($event)" /></label>
        <MomButton type="submit" variant="outline" :disabled="disabled">{{ goLabel }}</MomButton>
      </form>
    </div>
  </div>
</template>
