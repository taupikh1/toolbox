# BATCH22B1_REPORT — Inference core in the Worker (stage 1 of 3)

**Date:** 2026-11-10  
**Final status: CONDITIONAL**

## 1. Path
**Path B** — custom STFT → `session.run` → iSTFT in Worker.

**Why:** `web-audio-separation` on npm but no progress/cancel, peer ORT ≥1.29, absent from input lockfile.  
**Revert:** restore dependency + old engine.

## 2. P1–P19 (22B-1 scope)

| # | Status |
|---|--------|
| P1 | FIXED — dependency removed |
| P2 | FIXED — no URL cache; transferable |
| P3 | FIXED — Worker inference |
| P4 | FIXED — Worker reads Cache Storage |
| P5 | FIXED — JOB_PROGRESS + Cancel button |
| P6 | FIXED — honest Experimental status / notes |
| P7 | FIXED — outputMode respected in encode |
| P8 | FIXED (design) — WebGPU not gated on COI only |
| P10 | PARTIAL — numThreads=1; simd not forced |
| P11 | FIXED — cheap checkCached + marker |
| P12 | FIXED (config) — worker.format es; build NOT VERIFIED here |
| P13 | ADDRESSED — lockfile user regenerates |
| P14 | FIXED — jobId routing + terminate reject |
| P15 | PARTIAL — decode reused; >2ch downmix not added |
| P19 | PARTIAL — try next mirror on SHA fail |
| P9,P16,P18 | DEFERRED to 22B-2 |
| P17 | DEFERRED (OOS) |
| device tier / Fast Mode | DEFERRED to 22C |

## 3. Files
**Created:** pure/{chunkPlanner,deviceTier,modelMarker,qualityGate,stft,config}.ts, tests/vocal-separator-22b1.test.ts, scripts/selftest-vocal.ts, docs/BATCH22B_AUDIT.md, BATCH22B1_REPORT.md  
**Changed:** package.json, workerMessages.ts, ort.worker.ts, runtimeClient.ts, engine.ts, modelManager.ts, vite.config.ts, VocalSeparator.tsx, registry.ts, NEXT_AI_HANDOFF.md

## 4. typecheck / test / build
- No-install pure selftest: **PASS** (`node --experimental-strip-types scripts/selftest-vocal.ts`)
- `npm install` / typecheck / vitest / build: **NOT VERIFIED** in this environment (user must run after lock regenerate)

## 5. Claims
| Claim | Status |
|-------|--------|
| Path B + protocol + pure modules | VERIFIED (code + selftest) |
| session.run on real UVR model | NOT VERIFIED |
| Acoustic stem quality | NOT VERIFIED |
| iPhone / 3 consecutive / cancel on device | NOT VERIFIED |

## 6. Risks & decision
- Tensor layout ASSUMPTION may not match ONNX graph → JOB_ERROR at runtime.
- ORT ^1.20 may be old for current WASM.
- **CONDITIONAL** — code path complete for 22B-1; device evidence required for READY / 22B-2 gate.

## 7. User steps
```bash
cp -r toolbox/. . && rm -rf toolbox
rm -rf node_modules package-lock.json
npm install --registry=https://registry.npmjs.org/
grep -c "35.245" package-lock.json
npm run typecheck && npm test && npm run build
```
Then: Init Runtime → download model → 30s song → fill manual table.
