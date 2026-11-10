# BATCH 22B-FIX — Laporan FFT, iSTFT, Overlap-Add

**Tanggal:** 2026-11-10  
**Input:** `Toolbox-Batch22.zip` (295 file, folder `toolbox/`)  
**Keputusan:** **CONDITIONAL**  
**Bukan klaim:** Vocal Remover tidak READY. Inference model asli **NOT VERIFIED**.

## 1. Executive summary

Jalur DSP MDX diperbaiki dan diuji secara numerik.

- FFT 6144 (bukan pangkat dua) benar terhadap bentuk tertutup dan DFT langsung.
- Round-trip STFT/iSTFT mempertahankan amplitudo (rasio RMS ≈ 1, bukan 0,5×).
- Overlap-add chunk tidak lagi memakai `window[min(i, nFft-1)]`.
- Identity bypass (STFT → potong bin one-sided → cermin konjugat → iSTFT) lulus.
- Model ONNX tidak dijalankan. Stem vokal/instrumental tetap **NOT VERIFIED**.

`npm run typecheck` dan `npm run build` **gagal** di lingkungan ini karena ZIP sumber tidak memuat `src/lib/*` dan sebagian mesin document-converter. File vocal-separator yang diubah tidak punya error TypeScript. Tes yang filenya ada: **92 lulus, 0 gagal**. 18 suite tidak bisa dimuat karena modul yang sama tidak ada di ZIP.

## 2. Kondisi source sebelum perbaikan

`pure/stft.ts`: FFT radix-2 saja (`len <<= 1` + bit reversal).  
`ort.worker.ts`: spektrum one-sided disalin ke buffer penuh tanpa cermin konjugat; overlap chunk memakai indeks window yang di-clamp.  
Padding STFT: nol, bukan reflect.  
Badge UI tetap **Experimental**. Tidak diubah.

## 3. Root cause F1

`fft()` hanya benar untuk panjang 2^k. `n_fft = 6144 = 3 × 2048` bukan pangkat dua. Memaksa 8192 akan mengubah definisi DFT. Perbaikan: panjang 2^k tetap radix-2 (Float64 internal); panjang lain, termasuk 6144, memakai **Bluestein** (konvolusi chirp lewat FFT 16384). Bukan zero-pad.

## 4. Root cause F2

Worker mengisi hanya bin `0 .. dimF-1` lalu membiarkan bin negatif nol sebelum iSTFT. Untuk sinyal real, separuh energi ada di cermin konjugat, jadi amplitudo jatuh mendekati 0,5×. DC dan Nyquist tidak boleh digandakan. Perbaikan: `expandConjugateMirror` — DC sekali, bin `1 .. Nyquist-1` dicerminkan, Nyquist tetap 0 (`freq_pad`, karena `dim_f = n_fft/2` membuang 1 bin dari `n_bins = n_fft/2+1`). iSTFT tetap membagi dengan jumlah `window²`. Tidak ada pengali 2 di akhir.

## 5. Root cause F3

```ts
window[Math.min(i, nFft - 1)]
```

di `ort.worker.ts`. `i` adalah indeks sampel dalam chunk (±261120), bukan indeks frame FFT. Setelah sampel ke-6144, window Hann periodik di indeks terakhir ≈ 0, jadi hampir seluruh chunk tertimbang nol. OLA di dalam `istftChannel` sudah memakai indeks lokal frame. Penggabung chunk sekarang crossfade raised-cosine pada indeks lokal chunk; bobot tetangga berjumlah 1; bagi dengan akumulasi bobot; `compensate` diterapkan setelah normalisasi.

## 6. File yang diubah

- `src/services/vocal-separator/pure/stft.ts`
- `src/services/vocal-separator/pure/chunkPlanner.ts`
- `src/services/vocal-separator/pure/mdxTensor.ts` (baru, tanpa dependency)
- `src/services/vocal-separator/ort.worker.ts`
- `src/services/vocal-separator/runtimeClient.ts` (re-export tipe yang sudah diimpor UI)
- `tsconfig.json` (`WebWorker`, agar tipe worker valid)
- `tests/vocal-separator-22b-fix.test.ts` (baru)
- `tests/vocal-separator-22b1.test.ts` (ambang overlap yang salah secara matematika dikoreksi, tes tidak dihapus)
- `scripts/selftest-vocal.ts`
- `BATCH22B_FIX_REPORT.md`, `NEXT_AI_HANDOFF.md`, `PHASE_STATUS.md`
- `package-lock.json` baru, registry resmi (tidak ada di ZIP masuk)

UI, model, dan dependency `package.json` tidak ditambah.

## 7. Implementasi

Konvensi dicocokkan ke KUIELab `AbstractMDXNet.stft` / `istft`:

- Sumber: [kuielab/mdx-net mdxnet.py](https://github.com/kuielab/mdx-net/blob/main/src/models/mdxnet.py) — `torch.hann_window(periodic=True)`, `torch.stft(..., center=True)` (pad reflect), slice `[:, :, :dim_f]`, `freq_pad` nol sampai `n_bins = n_fft//2+1`, `torch.istft` dengan window yang sama.
- [seanghay/uvr-mdx-infer separate.py](https://github.com/seanghay/uvr-mdx-infer/blob/master/separate.py) — feed ONNX bernama `"input"`, `freq_pad` nol.
- [RVC-Boss/GPT-SoVITS tools/uvr5/mdxnet.py](https://github.com/RVC-Boss/GPT-SoVITS/blob/main/tools/uvr5/mdxnet.py) — pola STFT yang sama, `n_fft=6144`, `dim_f=3072`.

Fakta dari kode referensi (bukan dari menjalankan file ONNX proyek ini):

| Item | Keputusan | Status |
|---|---|---|
| Window | Hann periodik `0.5-0.5*cos(2πi/n)` | VERIFIED (sumber torch) |
| Center pad | reflect | VERIFIED (default torch.stft) |
| dim_f 3072 | buang Nyquist; `n_bins-dim_f = 1` | VERIFIED (rumus di sumber) |
| Layout | `[1, 4, dim_f, dim_t]`, real/imag × L/R | VERIFIED (reshape di sumber) |
| Nama input `"input"` | dipakai jika ada; jika banyak nama dan tidak cocok → error | kode siap; metadata file ONNX **NOT VERIFIED** |
| compensate 1.022 | dikali setelah iSTFT pada stem primer | nilai dari registry, **bukan** dibaca ulang dari metadata ONNX |
| Primary stem instrumental | registry | **NOT VERIFIED** terhadap metadata model |
| Provider yang benar-benar jalan | tidak lagi disamakan dengan `navigator.gpu` | runtime **NOT VERIFIED** |

## 8. Hasil tes FFT 6144

Pengukuran `node` (Float32 keluar, akumulator Float64):

| Kasus | Max abs error |
|---|---|
| Impuls → semua bin = 1 | 0 (im maks 2,2e-13) |
| Round-trip FFT/IFFT acak | 3,0e-8 |
| 11 bin vs DFT naif O(n²) | 2,4e-6 |
| Sinus bin 5, amplitudo N/2 | lulus `toBeCloseTo` 1 digit (toleransi tes) |
| DC dan Nyquist | lulus, komponen lain < 1e-2 pada skala N |
| Simetri konjugat | < 5e-4 pada bin yang diambil |

Vitest `tests/vocal-separator-22b-fix.test.ts` memaksa ambang itu dan juga n=96 penuh vs DFT naif, plus regresi 512 dan 1024 (round-trip < 1e-5).

## 9. Hasil tes STFT/iSTFT

Spektrum penuh (window dianalisis dan disintesis, bagi `Σ w²`), contoh sinus 1024/hop 256: mean abs ≈ 1,3e-8.

MDX 6144 / hop 1024 / 204800 sampel (ratusan frame): Vitest menuntut SNR > 80 dB, max abs < 1e-3, rasio RMS 0,99–1,01, lag 0, tanpa NaN. Pengukuran 1 detik (44100), jalur one-sided + cermin:

- max abs 3,3e-6
- SNR 109 dB
- rasio RMS 1,000000
- tidak ada blok 256 sampel yang jatuh di bawah 25% energi sumber

Sinyal acak broadband (Nyquist dibuang): SNR sekitar 47 dB, rasio RMS 0,9999, max abs ≈ 0,005. Ambang tes: SNR > 40 dB, max < 0,02. Ini bukan 0,5×.

## 10. Hasil tes overlap-add

- Envelope `Σ w²` untuk hop 1024, n_fft 6144, bagian dalam: min = max ≈ 2,25 (datar, tidak nol).
- Hann hop n/4: `Σ w² = 1,5`, jadi `|acc-1| ≈ 0,5`. Tes lama mengharapkan < 0,15. Angka itu salah untuk window ini; tes tetap ada, ambangnya dikoreksi. Rekonstruksi membagi envelope, itu yang mengembalikan amplitudo.
- Crossfade chunk: jumlah bobot tetangga = 1 (error 0).
- Mixer chunk pada panjang 100, 1000, 261120, 273465, 800000: 0 hole, max abs 0 terhadap sinyal sumber (tanpa STFT — ini uji indeks).
- Pola lama `window[min(i, nFft-1)]` pada 50000 sampel memberi energi << panjang chunk; bobot baru = panjang chunk.

## 11. F4–F6

| ID | Hasil |
|---|---|
| F4 | `resolveTensorName` menolak nama ganda yang tidak dikenal. `readMdxOutput` menolak rank/channel/freq/time yang salah sebelum diindeks. Metadata sesi nyata **NOT VERIFIED** (model tidak dimuat). |
| F5 | `INIT_RUNTIME` melaporkan provider `unknown`. Setelah `InferenceSession.create`, kode membaca hint internal; jika WebGPU diminta tetapi tidak terbukti, status `unknown`, bukan `webgpu`. Tidak ada sesi di sandbox ini → **NOT VERIFIED**. Fallback WASM tetap ada di daftar provider. |
| F6 | `wasmPaths` tidak lagi diarahkan ke `BASE_URL` root (itu meminta `/ort-wasm-simd.wasm`, bukan asset Vite). Paket `onnxruntime-web@1.31.1` berisi 4 file `.wasm` di `node_modules/.../dist/`. Build gagal sebelum asset tersalin → URL hasil build **NOT VERIFIED**. |

## 12. Quality gate

Perintah dijalankan di folder sumber setelah `npm install --registry=https://registry.npmjs.org/`.

**Lockfile**

```
grep -c "35.245" package-lock.json
0
grep -o '"resolved": "http[^"]*' package-lock.json | cut -d/ -f1-3 | sort | uniq -c
553 "resolved": "https://registry.npmjs.org
```

**typecheck** `npx tsc --noEmit` → exit 2. 65 error. Semuanya `TS2307` modul hilang (`src/lib/search`, `src/lib/pdfjs-runtime`, `document-converter/...`, Sidebar, …) atau `any` turunan dari impor itu. **0 error** di `vocal-separator`, `stft`, `mdxTensor`, `chunkPlanner`. Modul itu tidak ada di ZIP (295 file). Bukan regresi edit batch ini.

**test** `npx vitest run` → exit 1.

- Test files: 14 passed, 18 failed to load
- Tests: **92 passed**, 0 failed, 0 skipped
- Duration: 11,07 s
- 18 suite gagal karena import yang sama tidak ada (mis. `../src/lib/loan`). Seluruh `vocal-separator-22b-fix` lulus, termasuk tes lama yang filenya ada.

**build** `npx vite build` → exit 1. `Could not resolve "./lib/pdfjs-runtime" from "src/main.tsx"`.

**selftest** `node --experimental-strip-types scripts/selftest-vocal.ts` → OK, termasuk impuls 6144 dan SNR identity > 60 dB. Ini tambahan, bukan pengganti Vitest.

## 13. Risiko yang tersisa

1. File ONNX tidak dibuka. Nama tensor, rank, dan `compensate` di dalam metadata model bisa berbeda dari registry.
2. Rekonstruksi one-sided membuang bin Nyquist. Untuk nada biasa efeknya di bawah 1e-5; untuk impuls broadband SNR turun ke ~45 dB. Itu sesuai `freq_pad`, bukan bug 0,5×.
3. Typecheck/build penuh butuh tree lengkap (file yang tidak ada di ZIP ini).
4. Provider WebGPU dan pemuatan WASM di GitHub Pages belum dijalankan di browser.
5. iPhone tidak diuji.

## 14. Status akhir

**CONDITIONAL.** Fondasi FFT/STFT/OLA lulus uji numerik. Quality gate proyek penuh gagal karena sumber ZIP tidak lengkap, bukan karena tes DSP gagal. Vocal Only / Instrumental Only / offline inference: **NOT VERIFIED**. Jangan lanjut ke fitur AI baru sebelum model asli dijalankan pada tree yang membangun.

## 15. Langkah berikutnya

1. Terapkan ZIP ini di atas repo lengkap (`cp -r toolbox/. .`), jangan mengganti file yang tidak ada di ZIP.
2. Bersihkan install sesuai handoff.
3. Batch berikutnya baru boleh `session.run` pada `UVR-MDX-NET-Inst_HQ_3.onnx` dan membandingkan WAV. Jangan klaim pemisahan sebelum ada audio nyata.

## Deployment Guardrails

- Lockfile di ZIP ini hanya `https://registry.npmjs.org` (`35.245` = 0, 553 resolved).
- `.github/workflows/deploy.yml` tidak diubah dan tidak dimasukkan ke ZIP.
- ZIP: satu folder `toolbox/`, tanpa `node_modules`, `dist`, `.git`.
- Tidak ada dependency baru di `package.json`.
