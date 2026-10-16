/** 动态表单字段类型。 */
export type FormFieldType = 'TEXT' | 'NUMBER' | 'SELECT';

/** 动态表单字段的值。 */
export type FormValue = string | number | null;

export interface FormOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  name: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  defaultValue?: FormValue;
  readonly?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: FormOption[];
}

export interface FormSchema {
  schemaVersion: 1;
  fields: FormField[];
}

export type FormData = Record<string, FormValue>;

export type CodeSegmentType = 'LITERAL' | 'DATE' | 'SEQUENCE';
export interface CodeRuleSegment {
  id: string;
  type: CodeSegmentType;
  params: Record<string, FormValue>;
}

export interface CodeRuleDefinition {
  schemaVersion: 1;
  segments: CodeRuleSegment[];
}

export interface CodeSegmentCatalogEntry {
  type: CodeSegmentType;
  label: string;
  description: string;
  parameterSchema: FormSchema;
}
