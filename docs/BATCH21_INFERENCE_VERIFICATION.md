# BATCH 21 — Inference Verification

## Target

session.run ONNX → Vocal Only + Instrumental Only non-kosong, durasi cocok, berbeda dari input.

## Hasil

**NOT VERIFIED**

Sandbox tidak menjalankan onnxruntime-web dengan model 66 MB. Tidak ada file WAV hasil yang dapat diperiksa.

## Parameter model yang digunakan (referensi)

- dim_f = 3072
- dim_t = 8 (256)
- n_fft = 6144
- hop = 1024
- compensate = 1.022
- primary = Instrumental
- secondary = mix − primary × compensate

Sumber: web-audio-separation registry + ONNX graph notes.

## Langkah berikutnya untuk AI / developer

1. Tambah `onnxruntime-web` (alasan: runtime ONNX di browser).
2. Port MDX STFT/ISTFT (referensi: web-audio-separation MDXSeparator / pffft).
3. Load model dari Cache Storage ArrayBuffer ke InferenceSession (WASM).
4. Chunk + overlap-add.
5. Uji dengan audio legal; buktikan stem non-kosong + berbeda.
6. Baru naikkan status dari NOT READY.
