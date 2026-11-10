/**
 * pdfjs-dist 6.x memanggil Promise.try (ES2025).
 * Node 22 di lingkungan ini dan sebagian browser lama tidak memilikinya.
 * Build legacy juga menyertakan polyfill, tetapi worker palsu bisa
 * memanggil Promise.try sebelum modul selesai dievaluasi.
 */
export function ensurePromiseTry(): void {
  const P = Promise as unknown as {
    try?: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown>;
  };
  if (typeof P.try === 'function') return;
  P.try = function (fn: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args));
      } catch (err) {
        reject(err);
      }
    });
  };
}

type PdfJsModule = typeof import('pdfjs-dist');

let loadPromise: Promise<PdfJsModule> | null = null;

/** Muat build legacy (polyfill DOM/Promise) tanpa CDN. */
export function importPdfJs(): Promise<PdfJsModule> {
  ensurePromiseTry();
  if (!loadPromise) {
    loadPromise = import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<PdfJsModule>;
  }
  return loadPromise;
}
