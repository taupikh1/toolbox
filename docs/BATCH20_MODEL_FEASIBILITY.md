# BATCH 20 — Model Feasibility Study

## Keputusan

**FEASIBLE WITH LIMITATIONS** untuk arsitektur & model manager.  
**NOT READY** untuk real inference (belum diimplementasikan & diverifikasi).

## Model yang dipilih

| Field | Value |
|-------|-------|
| Nama | UVR-MDX-NET-Inst_HQ_3 |
| Format | ONNX |
| Ukuran | 66.759.214 bytes (~66.8 MB) |
| SHA256 | `317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc` |
| Sumber resmi | https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx |
| Mirror | https://huggingface.co/notabilia/uvr5-models/resolve/main/UVR-MDX-NET-Inst_HQ_3.onnx |
| Stems | 2 (vocals / instrumental) |
| Sample rate | 44100 Hz |
| Lisensi bobot | MIT + **wajib atribusi** ke Ultimate Vocal Remover (Anjok07, KimberleyJSN, komunitas UVR) |
| Arsitektur | KUIELab-MDX-Net (TFC-TDF U-Net) — paper https://arxiv.org/abs/2111.12203 |
| Runtime target | onnxruntime-web (WASM wajib untuk Safari; WebGPU opsional di Chrome) |

## Parameter preprocessing (referensi UVR / HQ series)

- n_fft: 6144
- hop_length: 1024
- dim_f: 2048
- dim_t: 8 → 256 frames
- Tensor layout expected: complex spectrogram channels (real/imag L/R)
- Chunk + overlap-add wajib

**Peringatan:** Parameter di atas diambil dari dokumentasi komunitas UVR. Kecocokan 100% dengan graph ONNX model ini **belum** diverifikasi dengan real session.run() di browser.

## Kandidat yang ditolak untuk tahap ini

| Model | Alasan |
|-------|--------|
| HTDemucs / Demucs v4 (150–172 MB) | Ukuran + RAM terlalu besar untuk target iPhone Safari; bertentangan dengan keputusan Local AI sebelumnya |
| Model 4-stem | Scope Batch 20 dibatasi 2-stem |

## Runtime browser

onnxruntime-web mendukung WASM di Safari iOS / Chrome / Firefox. WebGPU hanya Chrome/Edge modern. Multi-thread WASM memerlukan COOP/COEP headers (belum diuji di PWA Toolbox).

## Risiko iPhone Safari

- Model 66 MB + buffer STFT + audio panjang → risiko tab crash / OOM.
- Tidak ada WebGPU.
- Batasi durasi input secara adaptif jika inference nanti diaktifkan.

## Status implementasi Batch 20

| Komponen | Status |
|----------|--------|
| Model registry + SHA256 | IMPLEMENTED |
| Model downloader + Cache Storage | IMPLEMENTED |
| Model integrity check | IMPLEMENTED |
| UI + registry integration | IMPLEMENTED |
| Real STFT / ONNX / iSTFT pipeline | **NOT IMPLEMENTED / NOT VERIFIED** |
| Evidence of non-empty different stems | **NOT VERIFIED** |
| Quality metrics (SDR) | **NOT VERIFIED** |
| Offline inference after model ready | **NOT VERIFIED** |
| Video path (FFmpeg) | DITUNDA sampai audio lulus gate |

## Release decision

**NOT READY**

Alasan: Real inference belum dijalankan. Sesuai Quality Gate Batch 20, fitur tidak boleh ditandai READY hanya karena Model Manager + UI tersedia.
