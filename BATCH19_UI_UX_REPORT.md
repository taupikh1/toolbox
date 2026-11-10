# Batch 19 — UI/UX report

Bukan ganti desain. Token warna yang sudah ada (`--bg`, `--card`, `--ac`, `--bd`) tetap dipakai. Tidak ada library UI baru.

## Yang berubah di tampilan

- Beranda: judul lebih pendek. Daftar semua tool memakai kartu ringkas (nama, tanpa deskripsi panjang) supaya tidak menumpuk di bawah kategori.
- Kartu tool: bayangan dihapus. Badge status tanpa bingkai berwarna. Di halaman kategori, label kategori pada kartu disembunyikan karena sudah ada di judul halaman.
- Sidebar: kelompok mengikuti fungsi (PDF, Dokumen, Gambar, Audio & Video, AI & Ringkasan, Teks & Developer, Kalkulator, Sistem). Tiga kelompok yang paling sering dicari punya submenu.
- Di lebar di bawah 420px, kata "Toolbox" di top bar disembunyikan secara visual (nama tetap di `aria-label`) agar kotak cari tidak terdesak. Logo emoji tetap.
- Target sentuh tombol kecil dan chip naik ke 44px hanya pada `pointer: coarse`.
- `min-width: 0` pada shell/main dan `max-width: 100%` pada gambar, video, canvas, dan blok `<pre>` untuk mengurangi scroll horizontal yang tidak sengaja.
- Pita kepercayaan converter tidak lagi berupa kotak putus-putus.

## Mobile

Ditinjau dari CSS dan breakpoint yang sudah ada (drawer di bawah 900px, search turun ke baris sendiri, `viewport-fit=cover`, area aman). Tidak dijalankan di iPhone Safari atau Android Chrome fisik. Jangan anggap lulus perangkat.

## Aksesibilitas

Yang sudah ada tidak dibuang: skip link, `aria-label` cari, `aria-current` menu, `aria-pressed` favorit, fokus `:focus-visible`, `role="status"` / `role="alert"` yang sudah terpasang di tool.

Tidak ada audit screen reader. Kontras tidak diukur dengan alat.

## Performa

Tidak ada optimasi spekulatif. Build tetap memperingatkan chunk ConverterPage ~1.2 MB dan pdf.js ~558 kB. Perilaku konversi tidak diubah untuk memecah chunk.
