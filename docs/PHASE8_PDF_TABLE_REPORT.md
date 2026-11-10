# Batch 8 — PDF to Excel + Table Editor

Tanggal: 2026-11-10

## Yang ditambahkan

Ekstraksi tabel heuristik dari text layer PDF.js, Table Editor interaktif, export XLSX/CSV/JSON/HTML.

## Keterbatasan

Deteksi berbasis koordinat, bukan garis. Tabel kompleks dan PDF scan belum akurat. Multi-halaman tidak digabung otomatis.

## Verifikasi

typecheck PASS, npm test 148 PASS, build PASS, lockfile bersih.
