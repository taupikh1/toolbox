# Security audit — Batch 18

Lingkup: alur pemrosesan file di source. Tidak ada uji unggah ke server luar. `npm audit` tidak dijalankan sampai selesai di sesi ini, jadi laporan ini **bukan** klaim bebas CVE.

## Privasi

Aplikasi tidak punya backend sendiri. Konversi memanggil library di browser. Tidak ditemukan API key di source. Online provider PPTX (Batch 7D) tetap UNAVAILABLE dan menampilkan pemberitahuan; tidak ada unggah diam-diam yang baru.

## Temuan

| ID | Severity | Bukti | Status |
|---|---|---|---|
| B18-002 | HIGH | `escapeHtml` mengganti karakter dengan dirinya sendiri. HTML DOCX dapat memuat `<` dari teks. Pratinjau memakai iframe sandbox, tetapi berkas unduhan tetap berbahaya jika dibuka. | Diperbaiki. Tes memastikan `<` dan `&`. |
| B18-004 | MEDIUM | `tableToHtml` sama-sama no-op. | Diperbaiki. Tes menolak `<script>` mentah. |
| B18-003 | MEDIUM | Entitas XML PPTX tidak didekode. Bukan XSS langsung, tetapi teks rusak dan mudah disalahartikan. | Diperbaiki. |
| PDF JS | MEDIUM | PDF dapat berisi JavaScript. | Jalur reader, ekstraksi teks, dan OCR PDF memakai `isEvalSupported: false`. |
| ZIP | sudah ada | `checkZipEntries` menolak path `..`, entri terlalu banyak, rasio mencurigakan, ukuran besar. | Tidak diubah. Tes lama masih lulus. |
| HTML masuk | sudah ada | `sanitizeHtml` membuang script, handler, dan URL javascript sebelum HTML→DOCX. | Tes lama masih lulus. Bukan DOMPurify. HTML aneh masih bisa lolos sebagian. |

## Yang tidak ditutup

- Sanitasi HTML regex bukan parser. Jangan menampilkan HTML sumber tanpa iframe sandbox.
- Tidak ada pemindaian malware.
- Service worker meng-cache shell aplikasi, bukan file pengguna.
- Object URL dibersihkan di sebagian besar alat dengan jeda atau unmount. PDF besar tetap bisa menekan memori sebelum revoke.
- Dependensi `xlsx@0.18.5` (SheetJS community) dikenal punya catatan keamanan historis. Tidak diganti di batch ini karena mengganti parser spreadsheet berisiko merusak konversi. Pengguna hanya memproses file yang mereka percaya, di perangkat mereka.
