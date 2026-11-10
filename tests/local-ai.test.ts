import { describe, expect, it } from 'vitest';
import { MODEL_REGISTRY, getAvailableModels } from '../src/tools/local-ai/models';

describe('Local AI Hub (Batch 17)', () => {
  it('semua model berstatus unavailable atau planned', () => {
    for (const m of MODEL_REGISTRY) {
      expect(['unavailable', 'planned']).toContain(m.status);
    }
  });

  it('tidak ada model dengan sumber yang belum diverifikasi', () => {
    const available = getAvailableModels();
    expect(available).toHaveLength(0);
  });

  it('setiap entry memiliki alasan', () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.reason.length).toBeGreaterThan(10);
    }
  });

  it('id unik', () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
