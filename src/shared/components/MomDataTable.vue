<script setup lang="ts" generic="TData extends object">
import { computed } from 'vue';
import { columnResizingFeature, columnSizingFeature, tableFeatures, useTable, type ColumnDef } from '@tanstack/vue-table';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import './mom-data-table.css';

export interface MomColumn {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  fixed?: 'right';
  resizable?: boolean;
}

const props = defineProps<{
  rows: TData[];
  columns: MomColumn[];
  compact?: boolean;
  emptyText: string;
}>();
const features = tableFeatures({ columnSizingFeature, columnResizingFeature });
defineSlots<{ [key: string]: (props: { row: TData; value: unknown }) => unknown }>();
const definitions = computed<ColumnDef<typeof features, TData>[]>(() => props.columns.map((column) => ({
  id: column.key,
  accessorFn: (row: TData) => (row as Record<string, unknown>)[column.key],
  header: column.title,
  size: column.width ?? column.minWidth ?? 180,
  minSize: column.minWidth ?? column.width ?? 90,
  enableResizing: column.resizable !== false && !column.fixed,
})));
const table = useTable({
  features,
  data: computed(() => props.rows),
  columns: definitions,
  getRowId: (row: TData, index: number) => String((row as { id?: string }).id ?? index),
  columnResizeMode: 'onChange',
});
const totalWidth = computed(() => table.getTotalSize());

/**
 * 为列宽分隔器提供键盘等价操作。
 *
 * 每次按键使用固定 8px 步长，并遵守列定义的最小/最大宽度；该交互只更新 TanStack Table
 * 的本地列宽状态，不持久化、不影响服务端数据，也不会改变鼠标和触摸拖拽语义。
 */
function resizeColumn(columnId: string, currentSize: number, minSize: number, maxSize: number | undefined, event: KeyboardEvent): void {
  const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (direction === 0) return;
  event.preventDefault();
  const nextSize = Math.min(maxSize ?? Number.MAX_SAFE_INTEGER, Math.max(minSize, currentSize + direction * 8));
  table.setColumnSizing((current) => ({ ...current, [columnId]: nextSize }));
}
</script>

<template>
  <table class="mom-data-table" :class="{ 'mom-data-table--compact': compact }" :style="{ minWidth: `${totalWidth}px` }">
    <TableHeader><TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
      <TableHead v-for="header in group.headers" :key="header.id" scope="col" :class="{ 'mom-data-table__pinned': columns.find(c => c.key === header.column.id)?.fixed === 'right' }"
        :style="{ width: `${header.getSize()}px`, minWidth: `${header.column.columnDef.minSize ?? 90}px` }" :title="String(header.column.columnDef.header ?? '')">
        <span>{{ header.column.columnDef.header }}</span>
        <span v-if="header.column.getCanResize()" class="mom-data-table__resizer" role="separator" tabindex="0" aria-orientation="vertical"
          :aria-label="String(header.column.columnDef.header ?? '')" :aria-valuemin="header.column.columnDef.minSize"
          :aria-valuemax="header.column.columnDef.maxSize" :aria-valuenow="header.getSize()"
          @keydown="resizeColumn(header.column.id, header.getSize(), header.column.columnDef.minSize ?? 20, header.column.columnDef.maxSize, $event)"
          @mousedown="header.getResizeHandler()($event)" @touchstart="header.getResizeHandler()($event)"></span>
      </TableHead>
    </TableRow></TableHeader>
    <TableBody>
      <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
        <TableCell v-for="cell in row.getAllCells()" :key="cell.id" :class="{ 'mom-data-table__pinned': columns.find(c => c.key === cell.column.id)?.fixed === 'right' }"
          :style="{ width: `${cell.column.getSize()}px`, minWidth: `${cell.column.columnDef.minSize ?? 90}px` }" :title="String(cell.getValue() ?? '')">
          <slot :name="`cell-${cell.column.id}`" :row="row.original" :value="cell.getValue()">{{ cell.getValue() ?? '—' }}</slot>
        </TableCell>
      </TableRow>
      <TableRow v-if="!table.getRowModel().rows.length"><TableCell class="mom-data-table__empty" :colspan="columns.length">{{ emptyText }}</TableCell></TableRow>
    </TableBody>
  </table>
</template>
