import PptxGenJS from 'pptxgenjs';

export interface WriterSlide {
  id: string;
  title: string;
  body: string;
  /** Data URL atau null */
  imageDataUrl?: string | null;
}

export interface WriterState {
  slides: WriterSlide[];
  title: string;
}

let _id = 1;
export function newSlide(partial: Partial<WriterSlide> = {}): WriterSlide {
  return {
    id: `s${_id++}`,
    title: partial.title ?? '',
    body: partial.body ?? '',
    imageDataUrl: partial.imageDataUrl ?? null,
  };
}

/**
 * Buat file PPTX dari daftar slide sederhana.
 * Layout dasar: judul di atas, teks di bawah, gambar opsional di kanan/bawah.
 */
export async function buildPptx(state: WriterState): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.title = state.title || 'Presentasi';
  pptx.author = 'Toolbox Offline';
  pptx.subject = 'Dibuat secara lokal';

  for (const s of state.slides) {
    const slide = pptx.addSlide();
    if (s.title.trim()) {
      slide.addText(s.title.trim(), {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 28, bold: true, color: '1a1a1a',
      });
    }
    if (s.body.trim()) {
      slide.addText(s.body.trim(), {
        x: 0.5, y: s.title.trim() ? 1.3 : 0.5,
        w: s.imageDataUrl ? 5.5 : 9,
        h: 4,
        fontSize: 16, color: '333333', valign: 'top',
      });
    }
    if (s.imageDataUrl) {
      slide.addImage({
        data: s.imageDataUrl,
        x: 6.2, y: 1.3, w: 3.3, h: 3.3,
      });
    }
  }

  if (state.slides.length === 0) {
    const slide = pptx.addSlide();
    slide.addText('(Presentasi kosong)', { x: 0.5, y: 2, w: 9, h: 1, fontSize: 18, color: '888888' });
  }

  const buf = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
