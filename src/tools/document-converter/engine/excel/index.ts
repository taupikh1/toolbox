/**
 * Excel conversion engine public API (Phase 7 Batch 2).
 * Lazy-loads SheetJS only when a conversion is requested.
 */
export { loadSheetJS, isSheetJSLoaded } from './sheetjs-loader';
export {
  previewXlsx,
  convertXlsxToCsv,
  convertXlsxToJson,
  convertXlsxToHtml,
  convertCsvToXlsx,
  convertJsonToXlsx,
  convertHtmlTableToXlsx,
  convertXlsxToPdf,
} from './converters';
export type * from './types';
