# BATCH 22 — Inference Verification

## Target

INPUT → ONNX UVR-MDX-NET-Inst_HQ_3 → session.run → Vocal WAV + Instrumental WAV

## Hasil di lingkungan AI

**NOT VERIFIED**

## Jalur kode

`engine.separate()` → dynamic `import('web-audio-separation')` →  
`createSeparator('UVR-MDX-NET-Inst_HQ_3')` → `loadModel()` → `separate(audioUrl)`  

Model weights: blob URL dari Cache Storage (SHA256 verified).

## Parameter (registry library)

dim_f=3072, dim_t=8, n_fft=6144, hop=1024, compensate=1.022, primary=Instrumental

## Prosedur manual verifikasi

1. `npm install --registry=https://registry.npmjs.org/`
2. `npm run build && npm run preview`
3. Buka AI Vocal Separator → Download Model
4. Upload audio legal pendek
5. Start Separation → pastikan dua player terisi
6. Offline (airplane) → proses ulang
7. Catat error console jika gagal
