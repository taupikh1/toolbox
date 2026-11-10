# BATCH 21 — AI Vocal Separator Report

## 1. Executive Summary

Batch 21 memperbarui parameter model yang benar (dim_f=3072, n_fft=6144) dan utilitas audio (decode/encode).  
**Real ONNX inference masih belum dijalankan.** Tidak ada stem Vocal/Instrumental yang dihasilkan di lingkungan ini.

**Status akhir: NOT READY**

## 2. Kondisi awal

Batch 20 menyediakan Model Manager, UI, registry entry, dan engine yang melempar `INFERENCE_NOT_VERIFIED`. Tidak ada dependency onnxruntime-web.

## 3. Feasibility model (diperbarui)

| Item | Nilai |
|------|--------|
| Model | UVR-MDX-NET-Inst_HQ_3.onnx |
| SHA256 | 317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc |
| Size | 66.759.214 bytes |
| Input/output shape (referensi) | [batch, 4, 3072, 256] |
| n_fft | 6144 |
| hop | 1024 |
| dim_t | 8 (256 frames) |
| compensate | 1.022 |
| primary_stem | Instrumental |
| Sumber param | web-audio-separation MODEL_REGISTRY (ONNX graph) |
| Runtime | onnxruntime-web WASM (belum ditambahkan ke package.json) |

## 4. Implementasi yang selesai

- Koreksi `modelRegistry` preprocessing params
- `audioUtils.ts`: decode (Web Audio), encode WAV 16-bit, validasi file
- Engine: decode path dipanggil; tetap menolak menghasilkan stem palsu
- Model Manager Batch 20 dipertahankan

## 5. File diubah / ditambah

- `src/services/vocal-separator/modelRegistry.ts` (params dikoreksi)
- `src/services/vocal-separator/audioUtils.ts` (baru)
- `src/services/vocal-separator/engine.ts` (update)
- `BATCH21_AI_VOCAL_SEPARATOR_REPORT.md`
- `BATCH21_TEST_REPORT.md`
- `docs/BATCH21_INFERENCE_VERIFICATION.md`
- `NEXT_AI_HANDOFF.md`, `PHASE_STATUS.md`

## 6. Dependency baru

**Tidak ada.** `onnxruntime-web` belum ditambahkan karena real pipeline belum siap diverifikasi di sandbox. Alasan teknis tertulis: menambahkan WASM runtime tanpa bukti session.run yang berhasil hanya menambah ukuran bundle tanpa memenuhi acceptance criteria.

## 7–12. Test & bukti

| Pemeriksaan | Status | Bukti |
|-------------|--------|--------|
| Typecheck | NOT VERIFIED | Tidak dijalankan penuh di sandbox |
| Unit test | NOT VERIFIED | — |
| Integration test | NOT VERIFIED | — |
| ONNX model loading | NOT VERIFIED | Model tidak di-load di sesi ini |
| Real inference | **NOT VERIFIED** | session.run tidak dijalankan |
| Vocal output | **NOT VERIFIED** | Tidak ada file hasil |
| Instrumental output | **NOT VERIFIED** | Tidak ada file hasil |
| WAV export util | Implemented (kode) | Belum dipakai pada hasil model |
| Offline inference | NOT VERIFIED | — |
| Desktop / iPhone | NOT VERIFIED | — |

## 13. Keterbatasan iPhone Safari

Model 66 MB + spectrogram 3072×256 + audio panjang → risiko OOM tinggi. WebGPU tidak tersedia. Belum diuji.

## 14. Known issues

1. Engine masih throw `INFERENCE_NOT_VERIFIED` — disengaja.
2. STFT/ISTFT MDX belum di-port.
3. Tidak ada bukti stem non-kosong.

## 15. Deployment Guardrails

- Lockfile: tidak diubah; `35.245` = 0 (dari Batch 19/20).
- Tidak ada `.github` di ZIP.
- Tidak ada `node_modules` / `dist` / model ONNX di ZIP.
- Node 22 tetap.

## 16. Status akhir

**NOT READY**

Alasan: acceptance criteria utama (dua stem nyata dari model ONNX) **tidak terpenuhi** dan tidak dapat diverifikasi di lingkungan kerja ini.
