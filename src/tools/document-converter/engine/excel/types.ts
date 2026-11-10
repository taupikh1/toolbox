/** Types for Excel conversion engine (Batch 2). */

export type CsvDelimiter = ',' | ';' | '\t' | '|';
export type QuoteChar = '"' | "'" | '';
export type JsonShape = 'array-of-objects' | 'array-of-arrays';
export type DataInterpretation = 'preserve-text' | 'detect-numbers';

export interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  colCount: number;
}

export interface WorkbookMeta {
  sheetNames: string[];
  sheets: SheetInfo[];
}

export interface XlsxToCsvOptions {
  sheetName?: string;
  sheetIndex?: number;
  delimiter?: CsvDelimiter;
  quote?: QuoteChar;
  includeBom?: boolean;
  protectFormulas?: boolean;
  previewRows?: number;
}

export interface XlsxToJsonOptions {
  sheetName?: string;
  sheetIndex?: number;
  shape?: JsonShape;
  pretty?: boolean;
  headerRow?: boolean;
  previewRows?: number;
}

export interface XlsxToHtmlOptions {
  sheetName?: string;
  sheetIndex?: number;
  includeHeader?: boolean;
  previewRows?: number;
}

export interface CsvToXlsxOptions {
  delimiter?: CsvDelimiter | 'auto';
  quote?: QuoteChar;
  hasHeader?: boolean;
  sheetName?: string;
  interpretation?: DataInterpretation;
  encoding?: string;
}

export interface JsonToXlsxOptions {
  sheetName?: string;
  shape?: JsonShape;
}

export interface HtmlTableToXlsxOptions {
  tableIndex?: number;
  hasHeader?: boolean;
  sheetName?: string;
}

export interface XlsxToPdfOptions {
  sheetName?: string;
  sheetIndex?: number;
  paperSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  scale?: number;
  showGrid?: boolean;
  showHeader?: boolean;
  maxRows?: number;
}

export interface PreviewTable {
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
}

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  losses?: string[];
  meta?: Record<string, unknown>;
}
