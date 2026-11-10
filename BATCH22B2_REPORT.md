# BATCH22B2_REPORT — Offline path, quality gate, licenses

**Date:** 2026-11-10  
**Final status: CONDITIONAL**

## Entry gate (Step 0.4)
**NOT MET.** Tidak ada tabel manual perangkat terisi; 22B-1 tetap CONDITIONAL.  
Offline *claim* tidak dibuat. Kode offline/runtimeCaching + gate + lisensi tetap ditambahkan agar user dapat memverifikasi.

## Path
Path B (dari 22B-1) tidak diubah.

## Items in scope

| Item | Status | Evidence |
|------|--------|----------|
| P9 ORT precache | FIXED (config) | `globIgnores` + `runtimeCaching` CacheFirst `ort-runtime-v1`; wasm removed from globPatterns |
| P16 Storage Manager | FIXED (UI warning only) | Warning in VocalSeparator; Storage Manager behavior unchanged |
| P18 THIRD_PARTY | FIXED | Entries UVR / ORT / model added |
| P19 provenance | FIXED (honesty) | Registry comments + LICENSES-AUDIO: NOT VERIFIED until user runs curl/sha |
| Q1 full quality gate | FIXED | not-separated / too-aggressive / correlation / clip% |
| Q2 offline proven | NOT VERIFIED | Requires user airplane-mode table |

## Files created/changed
- vite.config.ts (P9)
- pure/qualityGate.ts (full gate)
- storageHelpers.ts
- VocalSeparator.tsx (persist, warning, gate warnings UI)
- modelRegistry.ts (honest header)
- docs/LICENSES-AUDIO.md, docs/BATCH22B2_AUDIT.md
- THIRD_PARTY_NOTICES.md
- tests/vocal-separator-22b2.test.ts
- scripts/selftest-vocal.ts (extended)
- BATCH22B2_REPORT.md, NEXT_AI_HANDOFF.md

## typecheck / test / build
- No-install selftest: **PASS** (including 22B-2 extras)
- npm typecheck / vitest / build: **NOT VERIFIED** (user after lock regenerate)

## Claims
| Claim | Status |
|-------|--------|
| ORT not in precache (config) | VERIFIED (code) |
| Offline works in airplane mode | **NOT VERIFIED** |
| Model SHA multi-mirror | **NOT VERIFIED** |
| Licenses MIT etc. | partial ASSUMPTION / NOT VERIFIED |

## Decision
**CONDITIONAL.** 22B-2 code complete for config + gate + docs. READY only after device offline proof.

## User steps
```bash
cp -r toolbox/. . && rm -rf toolbox
rm -rf node_modules package-lock.json
npm install --registry=https://registry.npmjs.org/
grep -c "35.245" package-lock.json
npm run typecheck && npm test && npm run build
```
Manual: once online process 30s song; airplane mode process again; record Network/precache size; Storage Manager clear → model status honest.
