import { GOTENBERG_DEMO } from '../engine/online/providers';

export function OnlineConversionNotice() {
  const p = GOTENBERG_DEMO;
  return (
    <section className="dc-detail" style={{ marginTop: '1rem' }}>
      <h3 style={{ margin: '0 0 .5rem' }}>Konversi Online (Experimental)</h3>
      <p className="muted" style={{ margin: '0 0 .5rem' }}>
        Mode online mengirim dokumen ke server konversi pihak ketiga. Jangan unggah dokumen rahasia jika Anda tidak menyetujui pemrosesan tersebut.
      </p>
      <div className="dc-meta">
        <div>
          <dt>Provider</dt>
          <dd>{p.providerName}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Unavailable</dd>
        </div>
        <div>
          <dt>CORS dari browser</dt>
          <dd>{p.supportsBrowserCors ? 'Didukung' : 'Tidak didukung'}</dd>
        </div>
        <div>
          <dt>Batas ukuran</dt>
          <dd>{Math.round(p.maximumFileSize / 1048576)} MB</dd>
        </div>
      </div>
      <p className="muted" style={{ margin: '.5rem 0 0' }}>
        {p.notes}
      </p>
      <p className="er" role="status" style={{ margin: '.5rem 0 0' }}>
        PPTX → PDF / PNG / JPG online belum dapat diaktifkan. Endpoint publik Gotenberg demo tidak mengirim header CORS, sehingga browser di GitHub Pages tidak dapat memanggilnya. Tidak ada akun atau API key yang dibutuhkan, tetapi integrasi tanpa server sendiri belum terbukti.
      </p>
      <p className="muted" style={{ margin: '.3rem 0 0' }}>
        Fitur offline (Reader, Viewer, Writer) tetap berfungsi tanpa internet.
      </p>
    </section>
  );
}
