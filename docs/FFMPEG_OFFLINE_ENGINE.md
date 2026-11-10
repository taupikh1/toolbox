# FFmpeg Offline Engine

## Status aktual

- Manager ada di `src/services/ffmpeg/ffmpegManager.ts`.
- Core diunduh dari CDN (`cdn.jsdelivr.net`) saat pengguna menekan tombol di Media Tools.
- Tidak ada auto-download saat startup.
- Cache: Cache Storage `ffmpeg-core-v0.12.10`.
- Offline setelah core ter-cache: **belum diuji di perangkat**.

## Keterbatasan

- Core tidak di-bundle.
- Jika CDN gagal, fitur audio/video tidak tersedia.
- Tidak ada checksum verification di implementasi saat ini.
