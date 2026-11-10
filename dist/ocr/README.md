# Aset OCR lokal

Agar OCR berjalan offline, letakkan file berikut di folder ini:

- `worker.min.js` (dari tesseract.js)
- `tesseract-core.wasm.js` + `.wasm` (dari tesseract.js-core)
- `eng.traineddata` dan/atau `ind.traineddata`

Ukuran perkiraan:
- core WASM: ~15–30 MB
- eng.traineddata: ~4 MB
- ind.traineddata: ~2–4 MB

Setelah file ada, aplikasi dapat memuatnya dari path relatif (kompatibel base path GitHub Pages).
Jangan bergantung pada CDN saat offline.
