# BATCH22C_REPORT — Device tier, quality, A/B, Fast Mode

**Date:** 2026-11-10  
**Final status: CONDITIONAL**

## Entry gate
**NOT MET** (no airplane-mode / device tables). Code implemented; claims stay limited.

## Path
Path B + Fast Mode (no AI) fallback.

## R1–R5
| Item | Status |
|------|--------|
| R1 device tier limits | FIXED — pure getDeviceTier + TIER_LIMITS replaces flat MAX_DURATION_SEC usage in engine |
| R2 quality + estimate | FIXED — Economy/Balanced/Good + estimateProcessingTime + memory notes |
| R3 A/B player | FIXED — UI + mapPositionOnSourceSwitch |
| R4 iOS download fallback | FIXED (code) — Share / open tab; device NOT VERIFIED |
| R5 Fast Mode | FIXED — pure DSP + UI label "tanpa AI"; Worker path still AI; Fast runs on main (short DSP) |

## Files
- pure/deviceTier.ts (expanded), pure/fastMode.ts, pure/abPlayer.ts
- engine.ts, VocalSeparator.tsx
- tests/vocal-separator-22c.test.ts, selftest extended
- docs/BATCH22C_AUDIT.md, BATCH22C_REPORT.md, NEXT_AI_HANDOFF.md

## Verification
- No-install selftest: PASS (22B-1/2/C extras)
- npm typecheck/test/build: NOT VERIFIED

## Decision
**CONDITIONAL.** Badge remains Experimental until device evidence.

## User steps
```bash
cp -r toolbox/. . && rm -rf toolbox
rm -rf node_modules package-lock.json
npm install --registry=https://registry.npmjs.org/
grep -c "35.245" package-lock.json
npm run typecheck && npm test && npm run build
```
