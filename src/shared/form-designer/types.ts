import type { Component } from 'vue';

/** 动态表单字段类型标识。 */
export type FormFieldType = string;
export type FormValue = string | number | boolean | null;
export interface FormOption { label: string; value: string }
export interface FormField {
  id: string; name: string; type: FormFieldType; label: string; required?: boolean; defaultValue?: FormValue;
  readonly?: boolean; disabled?: boolean; minLength?: number; maxLength?: number; min?: number; max?: number; options?: FormOption[];
}
export interface FormSchema { schemaVersion: 1; fields: FormField[] }
export type FormData = Record<string, FormValue>;
export type FieldProperty = 'name' | 'label' | 'required' | 'readonly' | 'disabled' | 'defaultValue' | 'minLength' | 'maxLength' | 'min' | 'max';
export interface FieldPropertyDefinition { key: FieldProperty; label: string; editor: 'text' | 'number' | 'checkbox' }
export interface FieldRegistryEntry {
  type: FormFieldType; label: string; description: string; preview: string;
  control: Component; modelProp?: string; modelEvent?: string; valueKind: 'text' | 'number' | 'boolean' | 'select';
  properties: readonly FieldPropertyDefinition[]; create: (id: string, name: string) => FormField;
  validateConfig?: (field: FormField) => string[]; validateValue?: (field: FormField, value: FormValue) => string | undefined;
  normalize?: (value: unknown) => FormValue;
}
export type FieldRegistry = ReadonlyMap<FormFieldType, FieldRegistryEntry>;

export type CodeSegmentType = string;
export interface CodeRuleSegment { id: string; type: CodeSegmentType; params: Record<string, FormValue> }
export interface CodeRuleDefinition { schemaVersion: 1; segments: CodeRuleSegment[] }
export interface CodeSegmentCatalogEntry {
  type: CodeSegmentType; label: string; description: string; catalogVersion: 1; parameterSchema: FormSchema;
}
