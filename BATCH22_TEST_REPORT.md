# BATCH 22 — Test Report

## Quality table

| Item | Status | Bukti |
|------|--------|-------|
| ONNX Runtime Web installed | NOT VERIFIED | npm install timeout di sandbox |
| WASM initialization | NOT VERIFIED | — |
| Model checksum | Implemented | SHA256 di modelManager |
| ONNX session initialization | NOT VERIFIED | — |
| session.run() real | NOT VERIFIED | — |
| STFT / iSTFT MDX | Via library | NOT VERIFIED execution |
| Vocal / Instrumental output | NOT VERIFIED | Tidak ada file hasil |
| WAV export | Unit encodeWav | Test ditulis |
| Offline inference | NOT VERIFIED | — |
| Desktop / iPhone | NOT VERIFIED | — |
| Typecheck | NOT VERIFIED | — |
| Unit tests | Ditulis | Run memerlukan install |
| Production build | NOT VERIFIED | — |

## Real inference evidence

**TIDAK ADA** di Batch 22 sandbox.

Setelah user install + buka browser:

1. Download model (SHA256 verify)
2. Upload audio pendek
3. Start Separation
4. Periksa Network (offline setelah model+WASM cached)
5. Putar / unduh kedua stem
