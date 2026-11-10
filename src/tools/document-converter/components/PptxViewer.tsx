import { useEffect, useMemo, useState } from 'react';
import { parsePptx } from '../engine/powerpoint/parser';
import { extractMediaUrls, revokeMedia, type MediaBlob } from '../engine/powerpoint/media';
import type { PptxParseResult } from '../engine/powerpoint/types';

interface Props {
  file: File;
  onClose: () => void;
}

export function PptxViewer({ file, onClose }: Props) {
  const [parse, setParse] = useState<PptxParseResult | null>(null);
  const [media, setMedia] = useState<Map<string, MediaBlob>>(new Map());
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showThumbs, setShowThumbs] = useState(true);

  useEffect(() => {
    let dead = false;
    const mediaMap = new Map<string, MediaBlob>();
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const result = await parsePptx(buf, file.name, file.size);
        if (dead) return;
        if (result.status === 'failed') {
          setError(result.errors[0] || 'Gagal membaca PPTX.');
          setLoading(false);
          return;
        }
        setParse(result);
        const m = await extractMediaUrls(buf, result);
        if (dead) {
          revokeMedia(m);
          return;
        }
        mediaMap.clear();
        for (const [k, v] of m) mediaMap.set(k, v);
        setMedia(new Map(mediaMap));
        setIndex(0);
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
      revokeMedia(mediaMap);
    };
  }, [file]);

  const slide = parse?.slides[index] ?? null;
  const total = parse?.document.slideCount ?? 0;

  const slideImages = useMemo(() => {
    if (!slide) return [];
    return slide.mediaRefs
      .map((r) => media.get(r.target))
      .filter((m): m is MediaBlob => !!m && m.mime.startsWith('image/'));
  }, [slide, media]);

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function next() {
    setIndex((i) => Math.min(total - 1, i + 1));
  }

  if (loading) {
    return (
      <div className="pptx-viewer">
        <p className="muted">Membaca presentasi…</p>
      </div>
    );
  }
  if (error || !parse) {
    return (
      <div className="pptx-viewer">
        <div className="dc-queue-head">
          <h3>Gagal membuka PPTX</h3>
          <button type="button" className="btn" onClick={onClose}>Tutup</button>
        </div>
        <p className="error">{error || 'File tidak dapat dibaca.'}</p>
        <p className="muted">Pastikan file adalah PPTX yang valid. File rusak atau format lain ditolak.</p>
      </div>
    );
  }

  return (
    <div className="pptx-viewer">
      <div className="dc-queue-head">
        <div>
          <h3 style={{ margin: 0 }}>{parse.document.fileName}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {parse.document.slideCount} slide · {Math.max(1, Math.round(parse.document.fileSize / 1024))} KB
            {parse.warnings.length > 0 && ` · ${parse.warnings.length} peringatan`}
          </p>
        </div>
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>

      {parse.errors.length > 0 && (
        <p className="muted">Beberapa slide gagal diparsing: {parse.errors.join(' ')}</p>
      )}

      <div className="pptx-main">
        {showThumbs && total > 1 && (
          <aside className="pptx-thumbs" aria-label="Daftar slide">
            {parse.slides.map((s, i) => (
              <button
                key={s.number}
                type="button"
                className={i === index ? 'pptx-thumb on' : 'pptx-thumb'}
                onClick={() => setIndex(i)}
                aria-current={i === index}
              >
                <span className="pptx-thumb-num">{s.number}</span>
                <span className="pptx-thumb-text">{s.plainText.slice(0, 40) || '(kosong)'}</span>
              </button>
            ))}
          </aside>
        )}

        <div className="pptx-stage">
          <div className="pptx-slide" role="region" aria-label={`Slide ${slide?.number ?? 0}`}>
            {slide?.error && <p className="error">Slide ini gagal dibaca: {slide.error}</p>}
            {!slide?.plainText && slideImages.length === 0 && !slide?.error && (
              <p className="muted">(Slide tanpa teks atau gambar yang dapat ditampilkan)</p>
            )}
            {slideImages.map((img) => (
              <img key={img.path} src={img.url} alt="" className="pptx-img" />
            ))}
            {slide?.texts.map((t, i) => (
              <p key={i} className="pptx-text">{t}</p>
            ))}
          </div>

          <div className="pptx-nav">
            <button type="button" className="btn" onClick={prev} disabled={index <= 0} aria-label="Slide sebelumnya">
              ← Sebelumnya
            </button>
            <span className="pptx-counter">
              {slide?.number ?? 0} / {total}
            </span>
            <button type="button" className="btn" onClick={next} disabled={index >= total - 1} aria-label="Slide berikutnya">
              Berikutnya →
            </button>
          </div>

          <button
            type="button"
            className="btn"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setShowThumbs((v) => !v)}
          >
            {showThumbs ? 'Sembunyikan daftar' : 'Tampilkan daftar slide'}
          </button>
        </div>
      </div>

      <details className="pptx-info">
        <summary>Teks hasil ekstraksi (slide {slide?.number})</summary>
        <pre className="dc-preview-pre">{slide?.plainText || '(tidak ada teks)'}</pre>
      </details>

      <p className="muted" style={{ margin: 0 }}>
        Pratinjau menampilkan teks dan gambar yang berhasil diekstrak. Bukan tampilan identik Microsoft PowerPoint.
        Animasi, transisi, font khusus, tabel, SmartArt, dan chart tidak dirender.
      </p>
    </div>
  );
}
