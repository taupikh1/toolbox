/** Kontrak data hasil parsing PPTX untuk Batch 6B dan seterusnya. */

export interface PptxMediaRef {
  rId: string;
  target: string; // path relatif dalam paket, sudah dinormalisasi (mis. ppt/media/image1.png)
  relationshipType?: string;
}

export interface PptxSlide {
  /** Nomor slide 1-based sesuai urutan presentasi. */
  number: number;
  /** id dari p:sldId jika ada. */
  slideId?: string;
  /** rId yang menunjuk ke file slide. */
  rId: string;
  /** Path file slide di dalam ZIP, mis. ppt/slides/slide1.xml */
  path: string;
  /** Paragraf / run teks yang ditemukan (urutan kemunculan). */
  texts: string[];
  /** Teks gabungan per slide. */
  plainText: string;
  mediaRefs: PptxMediaRef[];
  parseOk: boolean;
  error?: string;
}

export interface PptxParseResult {
  document: {
    fileName: string;
    fileSize: number;
    slideCount: number;
  };
  slides: PptxSlide[];
  /** Semua media yang terdeteksi di ppt/media/ (nama path). */
  media: string[];
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  warnings: string[];
}
