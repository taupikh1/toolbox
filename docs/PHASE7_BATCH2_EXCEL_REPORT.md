# Phase 7 Batch 2 — Excel Converter Report

## Status: READY WITH KNOWN LIMITATIONS

## Implemented conversions (all local, browser-only)

| ID | Name | Input → Output | Notes |
|----|------|----------------|-------|
| xlsx-to-csv | XLSX ke CSV | XLSX → CSV | Delimiter default `,`; formula protection ON |
| xlsx-to-json | XLSX ke JSON | XLSX → JSON | Array-of-objects (header row) |
| xlsx-to-html | XLSX ke HTML | XLSX → HTML | Escaped table, valid HTML doc |
| csv-to-xlsx | CSV ke XLSX | CSV → XLSX | Auto-detect delimiter; preserve-text default |
| json-to-xlsx | JSON ke XLSX | JSON → XLSX | Array of objects / arrays |
| html-table-to-xlsx | Tabel HTML ke XLSX | HTML → XLSX | First table by default; scripts stripped |
| xlsx-to-pdf | XLSX ke PDF | XLSX → PDF | Simple table renderer via pdf-lib |

## Not in scope (Batch 2)
- PDF → XLSX
- Full Excel layout fidelity
- Charts, images, pivot, macros, complex merges
- Advanced UI options panel (delimiter picker, sheet picker, etc.) — defaults used; engine supports options for future UI

## Engine
- SheetJS CE `xlsx@0.18.5` (Apache-2.0), lazy-loaded
- pdf-lib (already present) for PDF output

## Integration
- Handlers bound via `engine/excel/bind-handlers.ts` into `CONVERSION_DEFINITIONS`
- `conversionRegistry.isRunnable()` returns true for the seven IDs
- ConverterPage runs `execute`, shows progress, downloads result, lists losses
- Initial bundle unchanged; `xlsx` is a separate async chunk (~429 KB / 143 KB gzip)

## File size limits
- Office: 30 MB (existing)
- Text (CSV/JSON/HTML): 10 MB (existing)

## Verification performed
- `npm install` (public registry)
- `npm run typecheck` — PASS
- `npm test` — 107 tests PASS
- `npm run build` — PASS (xlsx in separate chunk)
