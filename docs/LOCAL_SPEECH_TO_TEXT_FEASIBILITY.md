# Local Speech-to-Text Feasibility

| Kandidat | Ukuran model | WASM/WebGPU | Offline | RAM | Mobile | Lisensi |
|---|---|---|---|---|---|---|
| Whisper tiny | ~75 MB | WASM possible | Ya | Tinggi | Tidak layak iPhone | MIT |
| whisper.cpp WASM | Besar | WASM | Ya | Tinggi | Tidak layak | MIT |
| ONNX Runtime Web | Bergantung model | WebGPU/WASM | Ya | Tinggi | Tidak layak | MIT |
| Web Speech API | — | Browser | Tidak | — | Sebagian | — |

## Keputusan

**UNAVAILABLE** untuk prototipe di Batch 14.

Alasan:
- Model terkecil masih terlalu besar untuk iPhone Safari.
- Risiko tab dihentikan sistem tinggi.
- Tidak ada engine yang sudah terintegrasi.
- Tidak mengunduh model diam-diam.

Rekomendasi: tunda sampai ada model <20 MB yang terbukti stabil di mobile, atau gunakan layanan eksternal dengan persetujuan eksplisit (di luar scope offline-first).
