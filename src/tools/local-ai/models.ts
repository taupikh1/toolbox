export interface ModelEntry {
  id: string;
  name: string;
  task: string;
  sizeMB: number | null;
  runtime: string;
  license: string | null;
  source: string | null;
  status: 'unavailable' | 'planned';
  reason: string;
}

export const MODEL_REGISTRY: ModelEntry[] = [
  {
    id: 'image-classification',
    name: 'Image Classification',
    task: 'classification',
    sizeMB: null,
    runtime: 'transformers.js / onnx',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Model terkecil (~20–50 MB) belum layak untuk iPhone Safari. Tidak ada runtime yang terpasang.',
  },
  {
    id: 'object-detection',
    name: 'Object Detection',
    task: 'detection',
    sizeMB: null,
    runtime: 'transformers.js / onnx',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Model lebih besar dan lebih berat. Tidak layak untuk mobile.',
  },
  {
    id: 'text-classification',
    name: 'Text Classification',
    task: 'classification',
    sizeMB: null,
    runtime: 'transformers.js',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Runtime tidak terpasang. Model masih terlalu besar untuk target mobile.',
  },
  {
    id: 'translation',
    name: 'Translation',
    task: 'translation',
    sizeMB: null,
    runtime: 'transformers.js',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Model NLLB/M2M masih besar. Tidak ada runtime.',
  },
  {
    id: 'speech-to-text',
    name: 'Speech-to-Text',
    task: 'asr',
    sizeMB: null,
    runtime: 'whisper.cpp / onnx',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Whisper tiny ~75 MB. Tidak layak iPhone. Tidak diunduh.',
  },
  {
    id: 'local-chat',
    name: 'Local Chatbot',
    task: 'generation',
    sizeMB: null,
    runtime: 'webllm',
    license: null,
    source: null,
    status: 'unavailable',
    reason: 'Model 1–4 GB. Tidak layak untuk browser mobile.',
  },
];

export function getAvailableModels(): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.status === 'unavailable' && m.source !== null);
}
