# Advanced OCR Guide (Batch 15)

- OCR engine: Tesseract.js (existing).
- Model bahasa: tidak di-bundle. Letakkan di `public/ocr/` sesuai README di sana.
- Preprocessing: grayscale dan kontras di Document Intelligence.
- Layout: heuristik, bukan AI layout understanding.
- Searchable PDF: PLANNED.
- Confidence: hanya jika engine menyediakannya. Tidak ada angka palsu.
- Semua lokal. Tidak ada upload.
