# BATCH 22A — ONNX Runtime & Web Worker Foundation

## 1. Kondisi repository sebelum perubahan

Batch 20–22: modelManager, modelRegistry (params MDX), audioUtils, engine provisional,
UI Vocal Separator, package.json already listed `onnxruntime-web` + `web-audio-separation`.
Inference **belum** terbukti.

## 2. File dibuat / diubah

| File | Aksi |
|------|------|
| `src/services/vocal-separator/workerMessages.ts` | Baru — protokol pesan |
| `src/services/vocal-separator/ort.worker.ts` | Baru — Worker INIT/CAPS/CANCEL/DISPOSE |
| `src/services/vocal-separator/runtimeClient.ts` | Baru — client UI thread |
| `src/tools/ai-vocal-separator/VocalSeparator.tsx` | Runtime panel + status jujur |
| `src/tools/registry.ts` | Badge “Runtime foundation” |
| `src/services/vocal-separator/engine.ts` | Komentar batas 22A |
| `tests/ort-worker-protocol.test.ts` | Unit protokol |
| Docs / PHASE_STATUS / NEXT_AI_HANDOFF | Batch 22A |

## 3. Dependency

| Paket | Versi | Alasan |
|-------|-------|--------|
| onnxruntime-web | ^1.20.0 (sudah di package.json Batch 22) | Runtime ONNX di browser; di-load di Worker via dynamic import |
| web-audio-separation | ^0.3.1 | Tetap di package.json untuk batch berikutnya; **tidak** dipakai sebagai klaim inference di 22A |

Tidak menambah dependency baru di 22A.

## 4. Arsitektur Worker

```
UI ──postMessage──► ort.worker.ts
       INIT_RUNTIME | CHECK_CAPABILITIES | CANCEL | DISPOSE
UI ◄──postMessage── READY | CAPABILITIES | PROGRESS | ERROR | CANCELLED | DISPOSED
```

- `requestId` pada setiap pesan
- Payload invalid → ERROR `INVALID_MESSAGE`
- Vite: `new Worker(new URL('./ort.worker.ts', import.meta.url), { type: 'module' })`
- WASM threads = 1 (aman tanpa COOP/COEP ketat di GitHub Pages)
- **Tidak** membuat InferenceSession, **tidak** unduh model

## 5. Provider

Kode memilih:

- `webgpu` hanya jika `navigator.gpu` **dan** `crossOriginIsolated`
- selain itu `wasm`

Pengujian provider aktual di perangkat: **NOT VERIFIED** (sandbox headless).

## 6–10. typecheck / test / build / manual

| Item | Status |
|------|--------|
| typecheck | NOT VERIFIED (install timeout sebelumnya) |
| unit protocol tests | Ditulis |
| integration real ORT in worker | NOT VERIFIED |
| production build | NOT VERIFIED |
| Chrome / Safari iOS | NOT VERIFIED |

## 11. Risiko iOS

- WASM ORT di Safari perlu diuji manual
- SharedArrayBuffer / multi-thread sengaja tidak diandalkan
- Memory pressure saat nanti load model 66 MB

## 12. Belum dikerjakan (sengaja di luar 22A)

- Model download di worker
- InferenceSession.create(model)
- session.run
- STFT / iSTFT / stems

## 13. Status akhir

**CONDITIONAL** → siap dilanjutkan ke 22B **setelah** user:

1. `npm install --registry=https://registry.npmjs.org/`
2. Membuktikan di browser: Init Runtime → status READY + provider WASM/WebGPU

Tanpa bukti itu di browser nyata, fondasi runtime tetap **NOT VERIFIED**.

Tidak mengklaim: model loaded, session.run, stems, offline inference.
