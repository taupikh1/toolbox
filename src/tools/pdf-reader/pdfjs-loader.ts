/**
 * Lazy loader for pdf.js (pdfjs-dist legacy build).
 * Worker is bundled via Vite `?url` so no CDN is used at runtime.
 * Legacy build is required where Promise.try is missing (Node 22, some browsers).
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { importPdfJs } from '../../lib/pdfjs-runtime';

export type { PDFDocumentProxy, PDFPageProxy };

let loadPromise: ReturnType<typeof importPdfJs> | null = null;

export async function loadPdfJs() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const pdfjs = await importPdfJs();
      try {
        const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default as string;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch {
        // Node/Vitest may not resolve ?url. Callers that set disableWorker still work.
      }
      return pdfjs;
    })();
  }
  return loadPromise;
}

export async function openPdfDocument(
  data: ArrayBuffer | Uint8Array,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    isEvalSupported: false,
    disableAutoFetch: true,
    disableStream: false,
    useSystemFonts: false,
  } as never);
  if (onProgress) {
    loadingTask.onProgress = (p: { loaded: number; total: number }) => {
      onProgress(p.loaded, p.total || 0);
    };
  }
  return loadingTask.promise;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
