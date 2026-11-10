import type { Availability, ConversionDefinition, ConverterPageId } from '../types/conversion';
import { CONVERSION_DEFINITIONS } from './conversion-definitions';
import { bindExcelHandlers } from '../engine/excel/bind-handlers';
import { bindWordHandlers } from '../engine/word/bind-handlers';
import { bindPptxHandlers } from '../engine/powerpoint/bind-handlers';
import { bindOcrHandlers } from '../engine/ocr/bind-handlers';
import { bindAdvancedHandlers } from '../engine/advanced/bind-handlers';

// Phase 7 Batch 2: Excel. Batch 5: Word. Handler dipasang sebelum registry dibangun.
bindExcelHandlers(CONVERSION_DEFINITIONS);
bindWordHandlers(CONVERSION_DEFINITIONS);
bindPptxHandlers(CONVERSION_DEFINITIONS);
bindOcrHandlers(CONVERSION_DEFINITIONS);
bindAdvancedHandlers(CONVERSION_DEFINITIONS);

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Tersedia',
  'in-development': 'Dalam pengembangan',
  'coming-soon': 'Segera hadir',
  unsupported: 'Tidak didukung',
};

export class ConversionRegistry {
  private readonly byId = new Map<string, ConversionDefinition>();

  constructor(defs: ConversionDefinition[] = CONVERSION_DEFINITIONS) {
    for (const def of defs) this.register(def);
  }

  register(def: ConversionDefinition): void {
    if (this.byId.has(def.id)) throw new Error(`Konversi ganda: ${def.id}`);
    // Tier C tidak boleh tampil sebagai fitur aktif.
    if (def.tier === 'C' && def.availability !== 'unsupported') {
      throw new Error(`Konversi tier C harus 'unsupported': ${def.id}`);
    }
    this.byId.set(def.id, def);
  }

  get(id: string): ConversionDefinition | undefined {
    return this.byId.get(id);
  }

  all(): ConversionDefinition[] {
    return [...this.byId.values()];
  }

  forPage(page: ConverterPageId): ConversionDefinition[] {
    return this.all().filter((d) => d.pages.includes(page));
  }

  /**
   * Bisa dijalankan HANYA jika punya fungsi execute nyata, berstatus READY, dan tersedia.
   * Fungsi ini menjaga agar tombol Konversi tidak aktif untuk handler yang belum ada.
   */
  isRunnable(def: ConversionDefinition): boolean {
    return def.status === 'READY' && def.availability === 'available' && typeof def.execute === 'function';
  }
}

export const conversionRegistry = new ConversionRegistry();
