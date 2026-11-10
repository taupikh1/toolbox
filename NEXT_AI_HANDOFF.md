# NEXT_AI_HANDOFF — setelah Batch 22B-FIX

## Snapshot

- Fokus batch ini: FFT 6144, iSTFT, overlap-add, uji numerik.
- Keputusan: **CONDITIONAL**
- Terbukti: Vitest DSP (FFT 6144, round-trip, identity bypass, OLA). 92 tes lulus di file yang ada.
- Tidak terbukti: `session.run`, stem vokal/instrumental, provider aktual, WASM di hasil build, iPhone.
- Typecheck dan build di sandbox ini **FAIL** karena ZIP Batch 22 tidak berisi `src/lib/*` dan sebagian `document-converter`. Bukan error di file STFT.

## Jangan lakukan

- Jangan mulai Batch 22C baru atau fitur AI lain sebelum inference model asli diukur.
- Jangan menandai Vocal Remover READY.
- Jangan mengganti model (tetap `UVR-MDX-NET-Inst_HQ_3.onnx`).
- Jangan mengklaim WebGPU atau WASM offline tanpa bukti runtime/build.

## Yang sudah benar di kode

- `fft` / `ifft`: radix-2 untuk 2^k, Bluestein untuk 6144.
- STFT: Hann periodik, center **reflect**, OLA bagi `Σ window²`.
- One-sided `dim_f=3072`: cermin konjugat, Nyquist = 0, DC tidak digandakan.
- Chunk mix: crossfade lokal, bukan `window[min(i, nFft-1)]`.
- `compensate` setelah normalisasi.
- Nama tensor: lebih suka `input` / `output`; nama ganda yang tidak dikenal → `BAD_MODEL_IO`.

## Asumsi yang masih NOT VERIFIED

- Nama dan shape tensor pada file ONNX yang diunduh pengguna.
- `compensate = 1.022` dan `primaryStem = instrumental` terhadap metadata model.
- Provider yang menang setelah `InferenceSession.create`.
- URL WASM setelah `vite build` di GitHub Pages.

## Deployment Guardrails

1. Lockfile hanya boleh `https://registry.npmjs.org/`. ZIP ini: `grep -c "35.245"` = **0**; 553 `resolved` ke `registry.npmjs.org`.
2. Jangan timpa `.github/workflows/deploy.yml`. Node tetap **22** (bukan 20). Folder `.github` tidak ada di ZIP.
3. Jangan mengubah URL lockfile dengan sed.
4. Jangan menambah dependency tanpa alasan tertulis. Batch ini tidak menambah dependency.

## Langkah pengguna setelah ekstrak ZIP

1. `cp -r toolbox/. . && rm -rf toolbox`
2. `rm -rf node_modules package-lock.json && npm install --registry=https://registry.npmjs.org/`
3. `grep -c "35.245" package-lock.json` (harus 0)
4. `npm run typecheck && npm test && npm run build`
5. `git pull --rebase && git push`
6. Pantau tab Actions sampai hijau

Jika repo lokal sudah lengkap, langkah 1 hanya menimpa file yang ada di ZIP. File `src/lib` yang tidak ikut ZIP tidak boleh dihapus.

## Larangan klaim

Tidak READY. Tidak offline terbukti. Tidak stem bagus. Tidak iPhone OK. Identity bypass hanya membuktikan DSP, bukan pemisahan vokal.
