# Pihak ketiga

Runtime: react, react-dom, qrcode, pdf-lib, @ffmpeg/ffmpeg, @ffmpeg/util (MIT). Core FFmpeg.wasm (@ffmpeg/core) didistribusikan terpisah (lihat lisensi FFmpeg / LGPL/GPL sesuai build). Dev: vite, @vitejs/plugin-react, vite-plugin-pwa, vitest, typescript (MIT / Apache-2.0 untuk TypeScript). Periksa lisensi versi terpasang lewat `npm ls` dan `node_modules/*/LICENSE`. MD5, diff, dan generator ditulis sendiri di `src/lib/dev.ts`.

## Phase 7 — kandidat (BELUM terpasang; versi/lisensi final dicatat saat install)
reamkit (MIT), pdfjs-dist (Apache-2.0), SheetJS CE 0.20.3 (Apache-2.0, tarball di-vendor), tesseract.js (Apache-2.0, perlu verifikasi), pptxgenjs (MIT, perlu verifikasi), docx (MIT, perlu verifikasi), @pdf-lib/fontkit (MIT, perlu verifikasi), fflate (MIT, perlu verifikasi). Font tertanam: catat nama, lisensi (mis. OFL/Apache-2.0), dan teks lisensi saat dipilih.

## Phase 7 Batch 5 — Word
- mammoth@1.13.0 — BSD-2-Clause — https://github.com/mwilliamson/mammoth.js — baca DOCX menjadi HTML/teks. Tidak merender tata letak Word secara utuh.
- docx@9.15.3 — MIT — https://github.com/dolanmiu/docx — menulis DOCX sederhana.

## pdfjs-dist
- Package terpasang setelah pembuatan ulang lockfile: pdfjs-dist@6.5.438 (range package.json tetap ^6.4.299; lockfile Batch 4 sempat mengunci 6.4.299 lewat mirror yang tidak dipakai lagi)
- License: Apache-2.0
- Source: https://github.com/mozilla/pdf.js
- Used for: PDF Reader (render, text extraction, search)



## AI Vocal Separator (Batch 22B)

### ONNX Runtime Web
- Package: onnxruntime-web (see package.json range)
- License: MIT (Microsoft) — verify at installed `node_modules/onnxruntime-web/LICENSE` after npm install
- Source: https://github.com/microsoft/onnxruntime
- Used for: local inference in Web Worker (vocal/instrumental separation)

### UVR / MDX model (UVR-MDX-NET-Inst_HQ_3)
- Model is downloaded on user action; never bundled in the app zip
- Claimed sources: GitHub `TRvlvr/model_repo` releases; mirror HuggingFace `notabilia/uvr5-models`
- Architecture credit: KUIELab-MDX-Net (Woosung Choi et al.)
- Community / tool credit: Ultimate Vocal Remover (Anjok07, KimberleyJSN, UVR community)
- License: NOT VERIFIED from primary legal text in-repo; do not redistribute the weights without checking upstream terms
- Integrity: SHA-256 checked at download; failed hashes are not stored

### Removed candidate (Path B)
- web-audio-separation was evaluated and removed; not a runtime dependency
