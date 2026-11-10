# Offline Feature Matrix (Batch 9)

| Fitur | Modul | Aset wajib | Internet pertama? | Offline setelah aset? | Batasan | Status verifikasi |
|---|---|---|---|---|---|---|
| PDF Reader | pdfjs | pdfjs-dist | Ya (unduh) | Ya | Worker | Kode ada |
| PDF Writer | pdf-lib | pdf-lib | Ya | Ya | — | Kode ada |
| Image to PDF | pdf-lib | — | Ya | Ya | — | Kode ada |
| Merge/Split PDF | pdf-lib | — | Ya | Ya | — | Kode ada |
| Excel Converter | SheetJS | xlsx | Ya | Ya | — | Kode ada |
| Word Converter | mammoth/docx | — | Ya | Ya | — | Kode ada |
| PowerPoint Reader/Viewer | jszip + parser | — | Ya | Ya | Bukan render penuh | Kode ada |
| PowerPoint Writer | pptxgenjs | — | Ya | Ya | Layout dasar | Kode ada |
| OCR | tesseract.js | worker+core+traineddata | Ya (model) | Ya jika model ada | Model tidak di-bundle | Kode ada |
| Document Scanner | Canvas | — | Ya | Ya | Kamera butuh izin | Kode ada |
| PDF to Excel | pdfjs + xlsx | — | Ya | Ya | Heuristik | Kode ada |
| Table Editor | — | — | Ya | Ya | — | Kode ada |
| Online Conversion 7D | provider | Endpoint publik | Ya | Tidak | CORS gagal | Unavailable |

Catatan: “Ya” berarti secara arsitektur dapat offline setelah aset ter-cache. Pengujian perangkat nyata NOT VERIFIED.
