import type { ConversionDefinition } from '../types/conversion';
import type { ValidationResult } from '../types/file';
import { validateBlob } from '../validation/file-validator';

export interface CheckedFile {
  id: number;
  file: File;
  result: ValidationResult;
}

let uid = 0;

/**
 * Periksa file terhadap sebuah konversi. Hanya membaca byte awal untuk validasi.
 * File TIDAK disimpan ke penyimpanan apa pun dan isinya tidak dicatat ke console.
 */
export async function checkFiles(files: File[], def: ConversionDefinition): Promise<CheckedFile[]> {
  const out: CheckedFile[] = [];
  for (const file of files) {
    out.push({ id: ++uid, file, result: await validateBlob(file, def.inputFormats) });
  }
  return out;
}

/** Atribut accept untuk <input type=file> dari format masukan konversi. */
export function acceptFor(def: ConversionDefinition): string {
  const map: Record<string, string> = {
    pdf: '.pdf', docx: '.docx', xlsx: '.xlsx', pptx: '.pptx', txt: '.txt', csv: '.csv',
    json: '.json', html: '.html,.htm', svg: '.svg', jpg: '.jpg,.jpeg', png: '.png', webp: '.webp',
  };
  return def.inputFormats.map((f) => map[f]).join(',');
}
