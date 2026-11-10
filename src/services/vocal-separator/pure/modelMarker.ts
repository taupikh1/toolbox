/**
 * Cheap model integrity marker (size + X-SHA256 header claim).
 * Full cryptographic re-hash only on explicit VERIFY_MODEL.
 * Pure function — no Cache Storage dependency in tests.
 */

export interface ModelMarkerInput {
  expectedSize: number;
  actualSize: number;
  expectedSha256: string;
  headerSha256: string | null | undefined;
}

export type MarkerResult =
  | { ok: true }
  | { ok: false; reason: 'SIZE_MISMATCH' | 'SHA_MISMATCH' | 'MISSING_MARKER' };

export function validateModelMarker(input: ModelMarkerInput): MarkerResult {
  if (input.actualSize !== input.expectedSize) {
    return { ok: false, reason: 'SIZE_MISMATCH' };
  }
  if (!input.headerSha256) {
    return { ok: false, reason: 'MISSING_MARKER' };
  }
  if (input.headerSha256.toLowerCase() !== input.expectedSha256.toLowerCase()) {
    return { ok: false, reason: 'SHA_MISMATCH' };
  }
  return { ok: true };
}
