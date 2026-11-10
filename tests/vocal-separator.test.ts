/**
 * Unit tests for vocal separator utilities (Batch 22).
 * Real ONNX inference is NOT covered here — requires browser + model download.
 */
import { describe, it, expect } from 'vitest';
import { encodeWav, validateAudioFile } from '../src/services/vocal-separator/audioUtils';
import { PRIMARY_MODEL } from '../src/services/vocal-separator/modelRegistry';

describe('vocal-separator model registry', () => {
  it('has correct MDX params for UVR-MDX-NET-Inst_HQ_3', () => {
    expect(PRIMARY_MODEL.preprocessing.dimF).toBe(3072);
    expect(PRIMARY_MODEL.preprocessing.nFft).toBe(6144);
    expect(PRIMARY_MODEL.preprocessing.hopLength).toBe(1024);
    expect(PRIMARY_MODEL.preprocessing.dimT).toBe(8);
    expect(PRIMARY_MODEL.preprocessing.compensate).toBe(1.022);
    expect(PRIMARY_MODEL.preprocessing.primaryStem).toBe('instrumental');
    expect(PRIMARY_MODEL.sha256).toBe(
      '317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc',
    );
    expect(PRIMARY_MODEL.sizeBytes).toBe(66_759_214);
  });
});

describe('validateAudioFile', () => {
  it('rejects empty-ish files', () => {
    const f = new File([new Uint8Array(10)], 'x.wav', { type: 'audio/wav' });
    expect(validateAudioFile(f)).toMatch(/kecil|kosong/i);
  });

  it('accepts reasonable wav name', () => {
    const data = new Uint8Array(5000);
    const f = new File([data], 'song.wav', { type: 'audio/wav' });
    expect(validateAudioFile(f)).toBeNull();
  });
});

describe('encodeWav', () => {
  it('produces valid RIFF header', () => {
    const left = new Float32Array(1000);
    const right = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) {
      left[i] = Math.sin(i / 10) * 0.5;
      right[i] = Math.cos(i / 10) * 0.5;
    }
    const blob = encodeWav(left, right, 44100);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 1000 * 2 * 2);
  });

  it('mono path works', async () => {
    const left = new Float32Array(100);
    const blob = encodeWav(left, null, 44100);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1); // mono
  });
});
