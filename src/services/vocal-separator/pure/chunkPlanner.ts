/**
 * Pure chunk planner for MDX-style segment processing.
 * No ORT / DOM imports — testable with Node --experimental-strip-types.
 *
 * Reference (ASSUMPTION until real session dims confirm):
 *   segmentSamples ≈ hopLength * (dimTFrames - 1)
 *   dimTFrames = 2^dimT (registry dimT=8 → 256)
 */

export interface ChunkPlanConfig {
  sampleCount: number;
  hopLength: number;
  dimT: number; // log2 of frames, e.g. 8 → 256
  nFft: number;
  overlap: number; // 0..0.5
}

export interface ChunkSpec {
  start: number;
  end: number; // exclusive
  padLeft: number;
  padRight: number;
}

export interface ChunkPlan {
  segmentSamples: number;
  hopSamples: number;
  totalChunks: number;
  chunks: ChunkSpec[];
  trim: number;
}

export function planChunks(cfg: ChunkPlanConfig): ChunkPlan {
  const frames = 2 ** cfg.dimT;
  const segmentSamples = cfg.hopLength * (frames - 1);
  const overlap = Math.max(0, Math.min(0.5, cfg.overlap));
  const hopSamples = Math.max(1, Math.floor(segmentSamples * (1 - overlap)));
  const trim = Math.floor(cfg.nFft / 2);

  const chunks: ChunkSpec[] = [];
  if (cfg.sampleCount <= 0) {
    return { segmentSamples, hopSamples, totalChunks: 0, chunks, trim };
  }

  let start = 0;
  while (start < cfg.sampleCount) {
    const end = Math.min(start + segmentSamples, cfg.sampleCount);
    const need = segmentSamples - (end - start);
    const padLeft = 0;
    const padRight = need > 0 ? need : 0;
    chunks.push({ start, end, padLeft, padRight });
    if (end >= cfg.sampleCount) break;
    start += hopSamples;
    // safety against infinite loop on bad config
    if (chunks.length > 100_000) break;
  }

  return {
    segmentSamples,
    hopSamples,
    totalChunks: chunks.length,
    chunks,
    trim,
  };
}

/** Samples of overlap between adjacent chunks. Local to the chunk, not an FFT window. */
export function chunkOverlapSamples(segmentSamples: number, hopSamples: number): number {
  return Math.max(0, segmentSamples - hopSamples);
}

/**
 * Raised-cosine weight for sample `localIndex` inside one chunk.
 * Indexed only by the local chunk position — never by the FFT window and never
 * by the global audio index.
 *
 * Adjacent chunks are complementary: fade-out(i) + fade-in(i) = 1, so a later
 * divide-by-accumulated-weight is a safety net rather than a 2× fix.
 * The first chunk must pass fadeIn=false; the last chunk fadeOut=false.
 */
export function chunkCrossfadeWeight(
  localIndex: number,
  validLength: number,
  overlapSamples: number,
  fadeIn: boolean,
  fadeOut: boolean,
): number {
  if (validLength <= 0 || localIndex < 0 || localIndex >= validLength) return 0;
  const ov = Math.max(0, Math.min(overlapSamples, validLength - 1));
  if (ov <= 0) return 1;
  let w = 1;
  if (fadeIn && localIndex < ov) {
    w = 0.5 - 0.5 * Math.cos((Math.PI * localIndex) / ov);
  }
  if (fadeOut && localIndex >= validLength - ov) {
    const j = localIndex - (validLength - ov);
    const fadeOutW = 0.5 + 0.5 * Math.cos((Math.PI * j) / ov);
    w = Math.min(w, fadeOutW);
  }
  return w;
}

/**
 * Add one already-reconstructed chunk into the full-length mix.
 * `chunk[i]` is sample `start + i`. The FFT window is not involved.
 */
export function accumulateChunk(
  out: Float32Array,
  weight: Float32Array,
  chunk: Float32Array,
  start: number,
  validLength: number,
  overlapSamples: number,
  fadeIn: boolean,
  fadeOut: boolean,
): void {
  const n = Math.min(validLength, chunk.length);
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= out.length) continue;
    const w = chunkCrossfadeWeight(i, n, overlapSamples, fadeIn, fadeOut);
    out[idx] += chunk[i] * w;
    weight[idx] += w;
  }
}

/** Divide by overlap weights. Returns how many samples had a ~zero weight. */
export function normalizeOverlap(out: Float32Array, weight: Float32Array): number {
  let holes = 0;
  const n = Math.min(out.length, weight.length);
  for (let i = 0; i < n; i++) {
    const w = weight[i];
    if (w > 1e-8) out[i] /= w;
    else holes++;
  }
  return holes;
}
