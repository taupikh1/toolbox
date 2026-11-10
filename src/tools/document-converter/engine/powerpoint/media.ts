import JSZip from 'jszip';
import type { PptxParseResult } from './types';

export interface MediaBlob {
  path: string;
  blob: Blob;
  mime: string;
  url: string; // object URL — caller must revoke
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

function mimeOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/**
 * Ekstrak file media yang direferensikan slide menjadi Blob + object URL.
 * Hanya gambar yang didukung untuk preview. Caller wajib revokeObjectURL.
 */
export async function extractMediaUrls(
  data: ArrayBuffer | Uint8Array,
  result: PptxParseResult,
): Promise<Map<string, MediaBlob>> {
  const map = new Map<string, MediaBlob>();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const zip = await JSZip.loadAsync(bytes);
  const needed = new Set<string>();
  for (const s of result.slides) {
    for (const m of s.mediaRefs) {
      if (mimeOf(m.target).startsWith('image/')) needed.add(m.target);
    }
  }
  for (const path of needed) {
    const file = zip.file(path);
    if (!file) continue;
    try {
      const ab = await file.async('arraybuffer');
      const mime = mimeOf(path);
      const blob = new Blob([ab], { type: mime });
      const url = URL.createObjectURL(blob);
      map.set(path, { path, blob, mime, url });
    } catch {
      // skip corrupt media
    }
  }
  return map;
}

export function revokeMedia(map: Map<string, MediaBlob>): void {
  for (const m of map.values()) {
    try { URL.revokeObjectURL(m.url); } catch { /* ignore */ }
  }
  map.clear();
}
