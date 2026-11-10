/** Kontrak hasil scan untuk Batch 7C. */

export interface ScanPage {
  id: string;
  /** Object URL gambar hasil pemrosesan (caller harus revoke). */
  previewUrl: string;
  /** Blob hasil akhir siap OCR. */
  blob: Blob;
  /** Filter yang diterapkan. */
  filter: 'original' | 'grayscale' | 'bw' | 'contrast' | 'bright';
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
}

export interface ScanSession {
  pages: ScanPage[];
  createdAt: number;
}
