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
</script>

<template>
  <table class="mom-data-table" :class="{ 'mom-data-table--compact': compact }" :style="{ minWidth: `${totalWidth}px` }">
    <TableHeader><TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
      <TableHead v-for="header in group.headers" :key="header.id" scope="col" :class="{ 'mom-data-table__pinned': columns.find(c => c.key === header.column.id)?.fixed === 'right' }"
        :style="{ width: `${header.getSize()}px`, minWidth: `${header.column.columnDef.minSize ?? 90}px` }" :title="String(header.column.columnDef.header ?? '')">
        <span>{{ header.column.columnDef.header }}</span>
        <span v-if="header.column.getCanResize()" class="mom-data-table__resizer" role="separator" aria-orientation="vertical"
          :aria-label="`${header.column.columnDef.header} column resize`" @mousedown="header.getResizeHandler()($event)" @touchstart="header.getResizeHandler()($event)"></span>
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
