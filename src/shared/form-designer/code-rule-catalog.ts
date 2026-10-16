import type { CodeSegmentCatalogEntry, CodeSegmentType } from './types';

export const localCodeSegmentCatalog: readonly CodeSegmentCatalogEntry[] = [
  { type: 'LITERAL', label: '固定字符', description: '写入固定前缀或分隔符', parameterSchema: { schemaVersion: 1, fields: [
    { id: 'literal_value', name: 'value', type: 'TEXT', label: '固定内容', required: true, defaultValue: 'P4' },
  ] } },
  { type: 'DATE', label: '日期', description: '按选定格式写入当前日期', parameterSchema: { schemaVersion: 1, fields: [
    { id: 'date_format', name: 'format', type: 'SELECT', label: '日期格式', required: true, defaultValue: 'YYYYMMDD', options: [
      { label: 'YYYYMMDD', value: 'YYYYMMDD' }, { label: 'YYMMDD', value: 'YYMMDD' }, { label: 'YYYYMM', value: 'YYYYMM' }, { label: 'YYMM', value: 'YYMM' },
    ] },
  ] } },
  { type: 'SEQUENCE', label: '流水号', description: '样例预览，不分配真实编号', parameterSchema: { schemaVersion: 1, fields: [
    { id: 'sequence_width', name: 'width', type: 'NUMBER', label: '位数', required: true, defaultValue: 4, min: 1, max: 18 },
    { id: 'sequence_step', name: 'step', type: 'NUMBER', label: '步长', required: true, defaultValue: 1, min: 1, max: 1, readonly: true },
  ] } },
];

export const defaultParams: Record<CodeSegmentType, Record<string, string | number>> = {
  LITERAL: { value: 'P4' }, DATE: { format: 'YYYYMMDD' }, SEQUENCE: { width: 4, step: 1 },
};
