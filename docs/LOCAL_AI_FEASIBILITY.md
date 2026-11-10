# Local AI Feasibility (Batch 16)

| Kandidat | Ukuran model | Offline | Mobile | Keputusan |
|---|---|---|---|---|
| Transformers.js | 50–500 MB | Ya | Tidak layak iPhone | UNAVAILABLE |
| ONNX Runtime Web | Bergantung model | Ya | Tidak layak | UNAVAILABLE |
| WebLLM | 1–4 GB | Ya | Tidak layak | UNAVAILABLE |
| Tesseract.js | Sudah ada | Setelah model | Ya | Bukan generative AI |

## Keputusan

**Local AI: UNAVAILABLE**

Alasan:
- Model terkecil yang berguna masih terlalu besar untuk iPhone Safari.
- Tidak ada dependency yang sudah terpasang.
- Risiko tab crash tinggi.
- Tidak mengunduh model diam-diam.

Implementasi yang ada: pencarian teks + ekstraksi regex + ringkasan ekstraktif. Dilabeli **rule-based, bukan AI**.
