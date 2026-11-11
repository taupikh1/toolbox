/**
 * Model registry for AI Vocal Separator.
 * Model is NEVER bundled. User downloads on demand.
 *
 * Official source URL: TRvlvr/model_repo GitHub releases (UVR Download Center backend).
 * Mirror: HuggingFace third-party account `notabilia/uvr5-models` (not official UVR org).
 *
 * sizeBytes / sha256 / MDX params: values carried from prior batches.
 * Independent re-verification of size+SHA on both mirrors: NOT VERIFIED in-repo
 * (user should run: curl -L -o m.onnx <url> && wc -c m.onnx && shasum -a 256 m.onnx).
 * License claim "MIT + attribution": NOT VERIFIED from primary legal source in this batch;
 * see docs/LICENSES-AUDIO.md.
 *
 * Tensor names/layout are NOT in this registry — derived at runtime from the session.
 */

export type ModelStatus =
  | 'NOT_DOWNLOADED'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'READY'
  | 'CORRUPTED'
  | 'DOWNLOAD_FAILED'
  | 'STORAGE_FULL';

export interface VocalSeparatorModel {
  id: string;
  name: string;
  version: string;
  description: string;
  url: string;
  mirrorUrl: string;
  sizeBytes: number;
  sizeLabel: string;
  sha256: string;
  stems: ('vocals' | 'instrumental')[];
  sampleRate: number;
  /** MDX architecture params — must match ONNX graph */
  preprocessing: {
    nFft: number;
    hopLength: number;
    dimF: number;
    dimT: number; // frames = 2^dimT
    compensate: number;
    primaryStem: 'vocals' | 'instrumental';
    note: string;
  };
  license: string;
  attribution: string;
  architecture: string;
  paper: string;
}

export const PRIMARY_MODEL: VocalSeparatorModel = {
  id: 'inst-hq-3-dynt',
  name: 'UVR-MDX-NET-Inst_HQ_3',
  version: '1.0-dynt',
  description:
    'High-quality 2-stem separator (primary: Instrumental). Bobot asli UVR-MDX-NET-Inst_HQ_3; sumbu waktu input dibuat bebas (kelipatan 32 frame) agar bisa diproses per potongan kecil di perangkat ber-memori terbatas.',
  url: 'https://huggingface.co/uddompang/kamvox-voice-separator/resolve/main/inst-hq-3.onnx',
  mirrorUrl: 'https://huggingface.co/uddompang/kamvox-voice-separator/resolve/main/inst-hq-3.onnx?download=true',
  sizeBytes: 66_759_214,
  sizeLabel: '66.8 MB',
  sha256: '03ceedd8ce972685ae4b4905befa31637f25a90542562ce7367dd3555493c748',
  stems: ['vocals', 'instrumental'],
  sampleRate: 44100,
  preprocessing: {
    nFft: 6144,
    hopLength: 1024,
    dimF: 3072,
    dimT: 8, // 256 frames
    compensate: 1.022,
    primaryStem: 'instrumental',
    note:
      'Params from web-audio-separation registry (ONNX graph dim_f=3072, n_fft=6144). Real session.run() NOT VERIFIED in Batch 21 sandbox.',
  },
  license: 'MIT (with required credit to UVR developers)',
  attribution:
    'Ultimate Vocal Remover (Anjok07 / DilanBoskan, KimberleyJSN, UVR community). Architecture: KUIELab-MDX-Net (Woosung Choi et al.).',
  architecture: 'KUIELab-MDX-Net (TFC-TDF U-Net)',
  paper: 'https://arxiv.org/abs/2111.12203',
};

export const MODEL_CACHE_NAME = 'vocal-separator-models-v1';
