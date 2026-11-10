# BATCH 22B AUDIT

**Date:** 2026-11-10  
**Input zip:** Toolbox-Offline-batch22a-merged-full.zip  
**Status of this audit:** code + package metadata read; build/runtime NOT fully verified in this environment.

## 0.1 Completeness of zip

Imported by engine / VocalSeparator / ort.worker / runtimeClient / tests:

| File | Present |
|------|---------|
| modelRegistry.ts | YES |
| modelManager.ts | YES |
| audioUtils.ts | YES |
| workerMessages.ts | YES |
| ort.worker.ts | YES |
| runtimeClient.ts | YES |
| engine.ts | YES |
| VocalSeparator.tsx | YES |
| tsconfig.json | YES |
| index.html | YES |
| package-lock.json | YES (stale, clean registry, no ORT/WAS) |
| package.json | YES |

**Result:** complete. No stop.

## 0.1b Baseline

- Last proven: Batch 19 (PHASE_STATUS.md).
- Batches 20–22A: typecheck/test/build recorded NOT VERIFIED.
- This environment: `npm install` attempted; partial success then sandbox instability. Final baseline run after changes will be reported as-is or NOT VERIFIED.

## 0.2 web-audio-separation verification

| Check | Result | Evidence |
|-------|--------|----------|
| Exists on npm | YES | `npm view web-audio-separation version` → 0.3.1 (registry.npmjs.org) |
| In input lockfile | NO | `grep -c onnxruntime\|web-audio-separation package-lock.json` → 0 |
| License | MIT | package.json + LICENSE in tarball |
| Peer | onnxruntime-web >=1.29.0 | package.json peerDependencies |
| createSeparator | YES | dist/index.d.ts |
| Model key UVR-MDX-NET-Inst_HQ_3 | YES | present in dist/index.js MODEL_REGISTRY |
| Progress callback | NOT in public API | separate() returns Promise<string[]>; no onProgress in types |
| Cancel | NOT in public API | no AbortSignal / cancel method on separator |
| Worker safety | UNCERTAIN | uses CacheStorage, blob URLs; DOM/AudioContext assumptions not fully audited; separate takes URL string |
| Own ORT load | Peer dep | may share or conflict with project pin ^1.20.0 (too old for peer) |

**Conclusion for Path A:** package is real but lacks progress/cancel, requires newer ORT, and memory path (URL + library internal copies) conflicts with P2/P3/P4 goals.

## 0.3 Decision gate → **Path B**

**Decision:** Path B — custom pipeline in Worker using project `onnxruntime-web`.

**Reason:**  
- Control over per-chunk progress, cancellation, single buffer ownership, and memory release is required for iPhone Safari.  
- Library does not expose cancel or progress.  
- Input lockfile never contained the package; project ORT pin is < peer minimum.  
- Hard rule: do not bet on unproven package for the critical path.

**Rejected alternative (Path A):** use createSeparator inside Worker. Rejected because of missing cancel/progress and memory/URL lifecycle issues (P2).

**How to revert:** restore `"web-audio-separation": "^0.3.1"` in package.json and the previous engine.ts body that calls createSeparator; user regenerates lockfile.

**Action:** remove `web-audio-separation` from package.json. Do not ship stale or unclean lockfile.

## 0.4 Model metadata (from modelRegistry.ts)

| Param | Value | Status |
|-------|-------|--------|
| sampleRate | 44100 | ASSUMPTION until session confirms |
| nFft | 6144 | ASSUMPTION |
| hopLength | 1024 | ASSUMPTION |
| dimF | 3072 | ASSUMPTION |
| dimT | 8 → 256 frames | ASSUMPTION |
| compensate | 1.022 | ASSUMPTION |
| primaryStem | instrumental | ASSUMPTION (vocals = mix − primary) |
| sizeBytes | 66_759_214 | ASSUMPTION (not re-downloaded here) |
| sha256 | 317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc | ASSUMPTION (P19) |
| tensor names / layout | not in registry | must be derived at runtime from session.inputNames/outputNames and dims; mismatch → JOB_ERROR |

## 0.5 Runtime / worker build (P12)

- ort.worker.ts uses `await import('onnxruntime-web')`.
- vite.config.ts has no `worker: { format: 'es' }` → default iife may break dynamic import.
- Decision: set `worker: { format: 'es' }` and `new Worker(..., { type: 'module' })` (already used).
- ORT asset caching: exclude large WASM from precache via globIgnores + runtimeCaching CacheFirst for `ort-runtime-v1`.
- `env.wasm.simd` / wasmPaths: check installed typings after install; prefer wasmPaths from BASE_URL.

## 0.6 Risks

1. Real `session.run` on UVR-MDX-NET-Inst_HQ_3 never executed in this batch environment → CONDITIONAL at best.
2. Safari module Worker support (15+) ASSUMPTION.
3. Model SHA/URL provenance still circular (P19).
4. STFT/iSTFT pure implementation must match model training windowing; mismatch produces garbage stems (quality only judged manually).
5. npm install / typecheck / build may still be blocked by environment; report actual results only.

## Path decision summary

| Path | Chosen | Why |
|------|--------|-----|
| A (library) | No | no progress/cancel, peer ORT mismatch, memory/URL issues |
| B (own pipeline) | **Yes** | full control, testable pure modules, honest status |
