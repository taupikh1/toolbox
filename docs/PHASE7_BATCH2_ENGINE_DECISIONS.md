# Phase 7 Batch 2 — Engine Decisions

## Library: SheetJS Community Edition (`xlsx`)

| Item | Value |
|------|-------|
| Package | `xlsx` |
| Version | 0.18.5 |
| License | Apache-2.0 |
| Purpose | Read/write XLSX, CSV, JSON, HTML tables |
| Load strategy | Dynamic `import('xlsx')` via `sheetjs-loader.ts` (lazy) |
| Bundle impact | Loaded only when an Excel conversion is requested |
| CDN | **Not used** — packaged locally |

### Why this version
- Community Edition is free and sufficient for the Batch 2 matrix.
- 0.18.5 is widely used, TypeScript-friendly, and works under Vite.
- Later CE versions (0.20+) have packaging changes; 0.18.5 is stable for browser bundling.

### Rejected alternatives
- LibreOffice-WASM — already rejected by project architecture.
- Commercial SheetJS Pro — not free, not offline-first friendly without license.
- Pure hand-rolled XLSX parser — high risk of corruption / incomplete OOXML support.

## PDF renderer: `pdf-lib` (already in project)

| Item | Value |
|------|-------|
| Package | `pdf-lib` ^1.17.1 |
| License | MIT |
| Usage | Simple table layout for XLSX → PDF |
| Limitations | No Excel layout fidelity, no charts, truncated long text, Helvetica only |

## Conversion matrix implemented

| Conversion | Status | Engine |
|------------|--------|--------|
| XLSX → CSV | available | SheetJS |
| XLSX → JSON | available | SheetJS |
| XLSX → HTML | available | SheetJS |
| CSV → XLSX | available | SheetJS |
| JSON → XLSX | available | SheetJS |
| HTML Table → XLSX | available | SheetJS |
| XLSX → PDF | available (limited) | SheetJS + pdf-lib |
| PDF → XLSX | not in Batch 2 | — |

## Security choices
- CSV formula-injection protection **on by default** (prefix `'` for cells starting with `= + - @`).
- HTML export escapes all cell content (`& < > " '`).
- HTML table import strips `<script>`, event handlers, `javascript:` URLs before parsing.
- No `eval`, no remote resources, no file persistence beyond the download blob.

## Data-preservation defaults
- CSV → XLSX defaults to **preserve-text** so leading zeros (NIK, phone, account numbers) stay intact.
- Optional conservative number detection available via options (not wired in UI yet; defaults safe).

## Architecture placement
```
src/tools/document-converter/engine/excel/
  types.ts
  sheetjs-loader.ts   # lazy import
  workbook.ts         # read / AoA / CSV helpers
  converters.ts       # seven conversion functions
  bind-handlers.ts    # mutates CONVERSION_DEFINITIONS
  index.ts
```

Handlers are bound at registry construction time so `conversionRegistry.isRunnable()` becomes true for the seven IDs above.
