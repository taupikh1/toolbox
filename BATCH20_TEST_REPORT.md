# BATCH 20 — Test Report

## Quality Gate Result

**NOT READY**

## Real Inference Evidence

| Item | Hasil |
|------|--------|
| Nama file ONNX | UVR-MDX-NET-Inst_HQ_3.onnx |
| SHA256 (di-hardcode dari sumber resmi) | 317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc |
| Input/output tensor shape aktual dari session | **NOT VERIFIED** (session tidak dijalankan) |
| Parameter preprocessing yang dipakai | n_fft=6144, hop=1024, dim_f=2048, dim_t=8 (referensi komunitas; belum diuji terhadap graph) |
| Runtime / execution provider | onnxruntime-web (direncanakan WASM); **belum diinstansiasi** |
| Waktu pemrosesan | — |
| Durasi & ukuran hasil | — |
| Bukti hasil non-kosong | **TIDAK ADA** |
| Bukti output ≠ input | **TIDAK ADA** |
| SDR / SI-SDR vs referensi | **TIDAK ADA** |

## Unit / Integration

- Model registry & manager: kode ditulis, belum dijalankan di browser.
- UI tombol terhubung ke fungsi nyata (download, delete, check, start).
- Start Separation memanggil engine yang **sengaja melempar** `INFERENCE_NOT_VERIFIED`.

## typecheck / test / build

Akan dilaporkan setelah dijalankan di sandbox (jika memungkinkan). Jika gagal karena dependency atau lingkungan, dicatat NOT VERIFIED.

## Kesimpulan

Sesuai Acceptance Criteria dan Quality Gate yang ditetapkan user:

> Inference gagal atau belum diimplementasikan → **NOT READY**

Tidak ada klaim kualitas, tidak ada audio palsu, tidak ada READY palsu.
