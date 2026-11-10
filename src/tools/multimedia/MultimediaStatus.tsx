
const ITEMS = [
  { name: 'Image Converter', status: 'AVAILABLE', note: 'Sudah ada (Image Format)', href: '#/tool/image-format' },
  { name: 'Image Compressor', status: 'AVAILABLE', note: 'Sudah ada', href: '#/tool/image-compressor' },
  { name: 'Image Resizer', status: 'PARTIAL', note: 'Ada di Image Format / Crop', href: '#/tool/image-crop' },
  { name: 'Audio Converter', status: 'PARTIAL', note: 'FFmpeg.wasm (unduh sekali)', href: '#/tool/media-module' },
  { name: 'MP3 Extraction', status: 'PARTIAL', note: 'FFmpeg.wasm, butuh unduh core', href: '#/tool/media-module' },
  { name: 'Video Converter', status: 'PARTIAL', note: 'FFmpeg.wasm, terbatas codec', href: '#/tool/media-module' },
  { name: 'Video Compressor', status: 'PARTIAL', note: 'FFmpeg.wasm', href: '#/tool/media-module' },
  { name: 'Audio/Video Transcription', status: 'UNAVAILABLE', note: 'Tidak ada engine lokal', href: '' },
  { name: 'Extract Insights', status: 'PARTIAL', note: 'Rule-based, bukan AI', href: '#/tool/multimedia-insights' },
];

export default function MultimediaStatus() {
  return (
    <div className="mm-status">
      <h2>Multimedia Suite</h2>
      <p className="muted">Status kemampuan aktual. FFmpeg.wasm membutuhkan unduhan core sekali (CDN). Transkripsi lokal tidak tersedia.</p>
      <table className="mm-table">
        <thead><tr><th>Fitur</th><th>Status</th><th>Catatan</th></tr></thead>
        <tbody>
          {ITEMS.map((it) => (
            <tr key={it.name}>
              <td>{it.href ? <a href={it.href}>{it.name}</a> : it.name}</td>
              <td>{it.status}</td>
              <td className="muted">{it.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
