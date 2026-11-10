/** Pemrosesan gambar dokumen di Canvas. Semua lokal. */

export type FilterId = 'original' | 'grayscale' | 'bw' | 'contrast' | 'bright';

export interface ProcessOptions {
  filter?: FilterId;
  rotation?: number; // derajat, kelipatan 90
  brightness?: number; // -100..100
  contrast?: number; // -100..100
}

function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    if (typeof src === 'string') img.src = src;
    else img.src = URL.createObjectURL(src);
  });
}

/**
 * Terapkan rotasi + filter sederhana. Mengembalikan Blob PNG.
 * Tidak merusak gambar asli (caller simpan original terpisah).
 */
export async function processImage(
  source: Blob | string,
  opts: ProcessOptions = {},
): Promise<{ blob: Blob; width: number; height: number; url: string }> {
  const img = await loadImage(source);
  const rot = ((opts.rotation ?? 0) % 360 + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const w = swap ? img.height : img.width;
  const h = swap ? img.width : img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia.');

  ctx.save();
  if (rot === 90) {
    ctx.translate(w, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rot === 180) {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
  } else if (rot === 270) {
    ctx.translate(0, h);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  const filter = opts.filter ?? 'original';
  if (filter !== 'original') {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const bright = (opts.brightness ?? 0) / 100;
    const contrast = (opts.contrast ?? (filter === 'contrast' ? 30 : 0)) / 100;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (filter === 'grayscale' || filter === 'bw') {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = y;
      }
      if (filter === 'bw') {
        const t = r > 140 ? 255 : 0;
        r = g = b = t;
      }
      if (filter === 'contrast' || filter === 'bright' || bright !== 0 || contrast !== 0) {
        r = factor * (r - 128) + 128 + bright * 255;
        g = factor * (g - 128) + 128 + bright * 255;
        b = factor * (b - 128) + 128 + bright * 255;
      }
      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal membuat gambar.'))), 'image/png'),
  );
  const url = URL.createObjectURL(blob);
  return { blob, width: w, height: h, url };
}

/** Crop sederhana (persegi). Koordinat dalam piksel gambar sumber. */
export async function cropImage(
  source: Blob | string,
  rect: { x: number; y: number; w: number; h: number },
): Promise<{ blob: Blob; width: number; height: number; url: string }> {
  const img = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, rect.w);
  canvas.height = Math.max(1, rect.h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia.');
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal crop.'))), 'image/png'),
  );
  const url = URL.createObjectURL(blob);
  return { blob, width: rect.w, height: rect.h, url };
}
