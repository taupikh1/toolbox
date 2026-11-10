/**
 * Audio helpers for vocal separator.
 * Decode via Web Audio API, encode 16-bit PCM WAV.
 */

export async function decodeAudioFile(
  file: File | Blob,
  targetSampleRate = 44100,
): Promise<{ left: Float32Array; right: Float32Array; sampleRate: number; durationSec: number }> {
  const ab = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, 1, targetSampleRate);
  const decoded = await ctx.decodeAudioData(ab.slice(0));

  const durationSec = decoded.duration;
  const length = Math.ceil(durationSec * targetSampleRate);
  const offline = new OfflineAudioContext(2, length, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();

  const left = rendered.getChannelData(0).slice();
  const right =
    rendered.numberOfChannels > 1
      ? rendered.getChannelData(1).slice()
      : left.slice();

  return { left, right, sampleRate: targetSampleRate, durationSec };
}

export function encodeWav(
  left: Float32Array,
  right: Float32Array | null,
  sampleRate: number,
): Blob {
  const numChannels = right ? 2 : 1;
  const length = left.length;
  const buffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(offset, (l * 0x7fff) | 0, true);
    offset += 2;
    if (right) {
      const r = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, (r * 0x7fff) | 0, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function validateAudioFile(file: File): string | null {
  const ok = /\.(mp3|wav|m4a|flac|ogg|aac)$/i.test(file.name) ||
    /^audio\//.test(file.type);
  if (!ok) return 'Format tidak didukung. Gunakan MP3, WAV, M4A, FLAC, atau OGG.';
  if (file.size > 100 * 1024 * 1024) return 'File terlalu besar (batas ~100 MB).';
  if (file.size < 1000) return 'File terlalu kecil atau kosong.';
  return null;
}
