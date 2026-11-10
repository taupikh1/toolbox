/**
 * Lazy loader for SheetJS (xlsx). Keeps the heavy library out of the initial bundle.
 */

export type SheetJSModule = typeof import('xlsx');

let cached: SheetJSModule | null = null;
let loading: Promise<SheetJSModule> | null = null;

export async function loadSheetJS(): Promise<SheetJSModule> {
  if (cached) return cached;
  if (loading) return loading;
  loading = import('xlsx')
    .then((mod) => {
      cached = mod;
      loading = null;
      return mod;
    })
    .catch((err) => {
      loading = null;
      throw new Error(
        'Gagal memuat engine spreadsheet (SheetJS). ' +
          (err instanceof Error ? err.message : String(err)),
      );
    });
  return loading;
}

export function isSheetJSLoaded(): boolean {
  return cached !== null;
}
