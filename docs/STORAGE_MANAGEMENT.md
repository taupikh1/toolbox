# Storage Management (Batch 9)

Halaman: tool “Penyimpanan & Offline”.

- Menampilkan estimasi usage/quota dari `navigator.storage.estimate()` jika ada.
- Jika API tidak tersedia: “Tidak diketahui”.
- Tombol hapus cache aplikasi (Cache Storage) dengan konfirmasi.
- Tidak menghapus localStorage (pengaturan/riwayat).
- Status online/offline ditampilkan.

Object URL: komponen converter memanggil `URL.revokeObjectURL` setelah download atau unmount.
