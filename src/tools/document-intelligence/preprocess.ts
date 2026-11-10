export interface PreprocessOptions {
  grayscale: boolean;
  contrast: number; // 1 = normal
  brightness: number; // 0 = normal
}

export function preprocessCanvas(
  src: HTMLCanvasElement,
  opts: PreprocessOptions,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, out.width, out.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (opts.grayscale) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = y;
    }
    r = Math.max(0, Math.min(255, (r - 128) * opts.contrast + 128 + opts.brightness));
    g = Math.max(0, Math.min(255, (g - 128) * opts.contrast + 128 + opts.brightness));
    b = Math.max(0, Math.min(255, (b - 128) * opts.contrast + 128 + opts.brightness));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  return out;
}
