/** Shared image loading / export helpers (browser only). */

import { toBlob } from '../utils';

export const IMAGE_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
export const IMAGE_ACCEPT_STR = IMAGE_ACCEPT.join(',');
export const MAX_IMAGE_BYTES = 40 * 1048576; // 40 MB soft warning
export const MAX_PIXELS = 16_000_000;

export async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/') && !IMAGE_ACCEPT.includes(file.type)) {
    throw new Error('File bukan gambar yang didukung (JPG, PNG, WebP, BMP, GIF).');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('File terlalu besar untuk diproses di perangkat ini (maks ~40 MB).');
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Gambar rusak atau tidak bisa dibaca.');
  }
}

export async function exportCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality = 0.92,
): Promise<Blob> {
  const blob = await toBlob(canvas, type, type === 'image/png' ? undefined : quality);
  if (!blob) throw new Error('Gagal mengekspor gambar. Coba format atau ukuran lain.');
  return blob;
}

export function clearCanvas(c: HTMLCanvasElement) {
  c.width = c.height = 0;
}

/** Draw bitmap onto new canvas at full resolution. */
export function bitmapToCanvas(bmp: ImageBitmap, bg?: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d')!;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(bmp, 0, 0);
  return c;
}

export function extForMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'img';
}
