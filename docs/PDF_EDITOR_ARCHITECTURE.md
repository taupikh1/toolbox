# PDF Editor Architecture (Batch 11)

## Modul

- `src/tools/pdf-editor/engine.ts` — load, page model, export via pdf-lib
- `src/tools/pdf-editor/PdfEditor.tsx` — UI

## Data model

- `EditorPage`: id, sourceIndex, rotation
- `EditorAnnotation`: id, pageId, type (text/rect/image), relative coords, text/imageData

## Export

`PDFDocument.copyPages` + `setRotation` + drawText/drawRectangle/drawImage. Hasil divalidasi signature %PDF-.

## Memory

History dibatasi 20 langkah. Object URL di-revoke setelah download.
