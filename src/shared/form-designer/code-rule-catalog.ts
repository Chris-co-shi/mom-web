import type { CodeSegmentCatalogEntry } from './types';

/**
 * 本地设计器使用的 V1 编码段目录。
 * SEQUENCE 仅用于样例预览，不能在浏览器端分配真实业务编号。
 */
export const localCodeSegmentCatalog: readonly CodeSegmentCatalogEntry[] = [
  { type: 'LITERAL', label: '固定字符', description: '写入固定前缀或分隔符', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [
    { id: 'literal_value', name: 'value', type: 'TEXT', label: '固定内容', required: true, defaultValue: 'P4' },
  ] } },
  { type: 'DATE', label: '日期', description: '按选定格式写入当前日期', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [
    { id: 'date_format', name: 'format', type: 'SELECT', label: '日期格式', required: true, defaultValue: 'YYYYMMDD', options: [
      { label: 'YYYYMMDD', value: 'YYYYMMDD' }, { label: 'YYMMDD', value: 'YYMMDD' }, { label: 'YYYYMM', value: 'YYYYMM' }, { label: 'YYMM', value: 'YYMM' },
    ] },
  ] } },
  { type: 'SEQUENCE', label: '流水号', description: '样例预览，不分配真实编号', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [
    { id: 'sequence_width', name: 'width', type: 'NUMBER', label: '位数', required: true, defaultValue: 4, min: 1, max: 18 },
    { id: 'sequence_step', name: 'step', type: 'NUMBER', label: '步长', required: true, defaultValue: 1, min: 1, max: 1, readonly: true },
  ] } },
];
