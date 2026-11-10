# LICENSES — Audio / AI Vocal Separator

Status legend: VERIFIED (read from source) | NOT VERIFIED (reason).

## Application code (Toolbox Offline vocal-separator modules)
- License: same as project repository (see root LICENSE if present; otherwise treat as project default).
- Status: project-owned code written for this app.

## ONNX Runtime Web
- Package: `onnxruntime-web`
- Upstream license: MIT (Microsoft Corporation)
- Status: **ASSUMPTION / verify after install** — read `node_modules/onnxruntime-web/LICENSE` and npm package metadata after `npm install`.
- Source: https://github.com/microsoft/onnxruntime

## UVR-MDX-NET-Inst_HQ_3 model weights
- Download URLs (registry): GitHub TRvlvr/model_repo release asset; HuggingFace `notabilia/uvr5-models` (third-party account).
- sizeBytes / sha256 in `modelRegistry.ts`: **NOT VERIFIED** independently in this batch (no download executed here).
- License statement "MIT with required attribution": **NOT VERIFIED** from a primary LICENSE file in this environment.
- Attribution to record when using: Ultimate Vocal Remover developers (Anjok07 / DilanBoskan, KimberleyJSN, UVR community); architecture KUIELab-MDX-Net (Woosung Choi et al.).
- User verification commands:
  ```bash
  curl -L -o UVR-MDX-NET-Inst_HQ_3.onnx "https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx"
  wc -c UVR-MDX-NET-Inst_HQ_3.onnx
  shasum -a 256 UVR-MDX-NET-Inst_HQ_3.onnx
  ```
  Compare to `sizeBytes` and `sha256` in `modelRegistry.ts`.

## web-audio-separation (evaluated, not shipped)
- Version viewed: 0.3.1, MIT on npm
- Not a dependency in Path B builds

## Notes
- Do not claim multi-mirror SHA verification until the user has run the commands above on both URLs.
- HuggingFace mirror is third-party; integrity relies on SHA-256, not trust of the host alone.
