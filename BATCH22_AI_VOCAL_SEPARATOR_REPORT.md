# BATCH 22 — Real MDX Inference Engine

## 1. Executive Summary

Batch 22 mengintegrasikan jalur inference nyata:

- Dependency: `onnxruntime-web` + `web-audio-separation`
- Engine memanggil `createSeparator('UVR-MDX-NET-Inst_HQ_3')` → `loadModel()` → `separate()`
- Model tetap dari Model Manager (SHA256) via blob URL

**Real session.run() + stem WAV belum dieksekusi di sandbox ini.**  
Status: **NOT READY** (bukti stem di browser nyata belum ada).

## 2. Audit Batch 21

Fondasi: modelRegistry (params benar), modelManager, audioUtils, UI, registry entry. Engine sebelumnya throw INFERENCE_NOT_VERIFIED.

## 3. Feasibility runtime

| Item | Catatan |
|------|---------|
| onnxruntime-web | WASM EP untuk Safari/Chrome; dynamic import |
| web-audio-separation | MDX STFT/iSTFT sudah proven untuk model ini |
| Vite | optimizeDeps.exclude ort; workbox wasm; COOP/COEP di dev server |
| npm install di sandbox | **TIMEOUT / NOT VERIFIED** — lockfile lama tidak berisi ort |

## 4. Dependency (alasan teknis)

| Paket | Alasan |
|-------|--------|
| `onnxruntime-web` ^1.20.0 | Runtime ONNX di browser (WASM) |
| `web-audio-separation` ^0.3.1 | Pipeline MDX (STFT→run→iSTFT) untuk UVR-MDX-NET-Inst_HQ_3 tanpa menebak STFT |

Tidak menambah dependency lain.

## 5–10. Implementasi vs verifikasi

| Gate | Implemented | Executed / Verified |
|------|-------------|---------------------|
| A ONNX Runtime Web di package.json | Ya | Install NOT VERIFIED (timeout) |
| B Load model + session | Via library loadModel | NOT VERIFIED di sandbox |
| C STFT MDX | Via library | NOT VERIFIED |
| D session.run | Via library separate() | NOT VERIFIED |
| E iSTFT | Via library | NOT VERIFIED |
| F Dua stem | Engine mengharapkan kedua URL | NOT VERIFIED (tidak ada WAV) |
| G Chunking | Library segmentSize/overlap | NOT VERIFIED |
| H audioUtils | Ya (Batch 21) | Unit test ditulis |
| I Offline | Blob URL dari Cache Storage | NOT VERIFIED |
| J UI | Terhubung ke separate() | — |
| K Browser | — | NOT VERIFIED |

## 11–18. Test / build

| Item | Status |
|------|--------|
| Typecheck | NOT VERIFIED |
| Unit tests (registry, validate, encodeWav) | Ditulis; run NOT VERIFIED tanpa node_modules baru |
| Integration / real inference | NOT VERIFIED |
| Production build | NOT VERIFIED |
| Vocal / Instrumental WAV bukti | **TIDAK ADA** |
| Offline inference | NOT VERIFIED |
| iPhone Safari | NOT VERIFIED |

## 19. File berubah

- `package.json` — +onnxruntime-web, +web-audio-separation
- `vite.config.ts` — wasm / COOP / exclude ort
- `src/services/vocal-separator/engine.ts` — real separate path
- `src/tools/registry.ts` — badge text
- `src/tools/ai-vocal-separator/VocalSeparator.tsx` — status text
- `tests/vocal-separator.test.ts` — unit tests utils
- Docs Batch 22, NEXT_AI_HANDOFF, PHASE_STATUS

## 20. Known issues

1. `npm install` di sandbox timeout → lockfile **belum** memuat ort. User harus `npm install --registry=https://registry.npmjs.org/`.
2. API `web-audio-separation` (modelUrl override, return shape) perlu dikonfirmasi di browser.
3. Tidak ada bukti session.run berhasil di sesi ini.

## 21. Deployment Guardrails

- package-lock.json di ZIP: **versi lama** (tanpa ort). User wajib regenerate.
- Jangan sed URL lockfile.
- Tidak ada `.github` di ZIP.
- Model ONNX tidak di-bundle.

## 22. Status akhir

**NOT READY**

Alasan: acceptance criteria utama (session.run menghasilkan Vocal + Instrumental WAV yang valid) **belum terbukti**. Kode jalur inference sudah di-wire; verifikasi browser masih wajib.
