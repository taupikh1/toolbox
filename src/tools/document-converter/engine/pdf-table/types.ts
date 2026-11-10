export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface TableCell {
  row: number;
  col: number;
  text: string;
  x: number;
  y: number;
}

export interface ExtractedTable {
  id: string;
  pageStart: number;
  pageEnd: number;
  rows: string[][];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  method: string;
}

export interface ExtractionResult {
  tables: ExtractedTable[];
  textItems: TextItem[];
  warnings: string[];
  status: 'success' | 'partial' | 'failed';
}
