/**
 * Batch 22D — STFT/iSTFT cepat harus setara dengan jalur referensi (stft.ts + mdxTensor.ts),
 * dan quality gate tidak boleh salah menilai input yang bufernya sudah di-transfer.
 */
import { describe, it, expect } from 'vitest';
import {
  hannWindow,
  stftChannel,
  istftChannel,
  sliceOneSided,
  expandConjugateMirror,
} from '../src/services/vocal-separator/pure/stft';
import {
  packMdxInput,
  readMdxOutput,
  zeroLowBins,
  checkMdxOutputLayout,
} from '../src/services/vocal-separator/pure/mdxTensor';
import { MixedFft, StereoMdxDsp, isFastFftSupported } from '../src/services/vocal-separator/pure/fastStft';
import { runQualityGate, snapshotInput } from '../src/services/vocal-separator/pure/qualityGate';

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

describe('MixedFft', () => {
  it('mendukung 2^k dan 3·2^k saja', () => {
    expect(isFastFftSupported(6144)).toBe(true);
    expect(isFastFftSupported(2048)).toBe(true);
    expect(isFastFftSupported(24)).toBe(true);
    expect(isFastFftSupported(5000)).toBe(false);
    expect(isFastFftSupported(6)).toBe(false);
    expect(isFastFftSupported(0)).toBe(false);
  });

  it('cocok dengan DFT naif', () => {
    for (const n of [8, 24, 96, 384]) {
      const f = new MixedFft(n);
      const r = rng(n);
      const xr = new Float64Array(n);
      const xi = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        xr[i] = r();
        xi[i] = r();
      }
      const or = new Float64Array(n);
      const oi = new Float64Array(n);
      f.transform(xr, xi, or, oi);
      let err = 0;
      for (let k = 0; k < n; k++) {
        let sr = 0;
        let si = 0;
        for (let t = 0; t < n; t++) {
          const a = (-2 * Math.PI * t * k) / n;
          sr += xr[t] * Math.cos(a) - xi[t] * Math.sin(a);
          si += xr[t] * Math.sin(a) + xi[t] * Math.cos(a);
        }
        err = Math.max(err, Math.abs(sr - or[k]), Math.abs(si - oi[k]));
      }
      expect(err).toBeLessThan(1e-9);
    }
  });
});

describe('StereoMdxDsp setara dengan jalur referensi', () => {
  const nFft = 6144;
  const hop = 1024;
  const dimF = 3072;
  const win = hannWindow(nFft);

  for (const frames of [64, 128]) {
    it(`forward (frames=${frames}) = stft + slice + zeroLowBins + pack`, () => {
      const seg = hop * (frames - 1);
      const r = rng(frames);
      const l = new Float32Array(seg);
      const rr = new Float32Array(seg);
      for (let i = 0; i < seg; i++) {
        l[i] = Math.sin(i * 0.01) * 0.5 + r() * 0.2;
        rr[i] = Math.sin(i * 0.017) * 0.4 + r() * 0.2;
      }
      const a = stftChannel(l, nFft, hop, win);
      const b = stftChannel(rr, nFft, hop, win);
      const parts = [
        sliceOneSided(a.re, a.frames, nFft, dimF),
        sliceOneSided(a.im, a.frames, nFft, dimF),
        sliceOneSided(b.re, b.frames, nFft, dimF),
        sliceOneSided(b.im, b.frames, nFft, dimF),
      ];
      for (const p of parts) zeroLowBins(p, a.frames, dimF);
      const ref = packMdxInput(parts[0], parts[1], parts[2], parts[3], a.frames, dimF);

      const dsp = new StereoMdxDsp(nFft, hop, dimF);
      const out = new Float32Array(4 * dimF * frames);
      out.fill(7); // buffer kotor sengaja: bin yang dinolkan harus tertimpa nol
      dsp.forward(l, rr, frames, out);
      let maxDiff = 0;
      let maxRef = 0;
      for (let i = 0; i < ref.length; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(ref[i] - out[i]));
        maxRef = Math.max(maxRef, Math.abs(ref[i]));
      }
      expect(maxDiff / maxRef).toBeLessThan(1e-5);
    });

    it(`inverse (frames=${frames}) = readMdxOutput + mirror + istft, termasuk DC imajiner`, () => {
      const seg = hop * (frames - 1);
      const r = rng(frames + 1);
      const model = new Float32Array(4 * dimF * frames);
      for (let i = 0; i < model.length; i++) model[i] = r() * 3;
      const p = readMdxOutput(model, [1, 4, dimF, frames], dimF, frames);
      if (!p.ok) throw new Error(p.message);
      const fl = expandConjugateMirror(p.channels.lRe, p.channels.lIm, frames, nFft, dimF);
      const fr = expandConjugateMirror(p.channels.rRe, p.channels.rIm, frames, nFft, dimF);
      const refL = istftChannel(fl.re, fl.im, frames, nFft, hop, win, seg);
      const refR = istftChannel(fr.re, fr.im, frames, nFft, hop, win, seg);

      const dsp = new StereoMdxDsp(nFft, hop, dimF);
      const oL = new Float32Array(seg);
      const oR = new Float32Array(seg);
      dsp.inverse(model, frames, seg, oL, oR);
      dsp.inverse(model, frames, seg, oL, oR); // pemakaian ulang buffer tidak boleh mengubah hasil
      let maxDiff = 0;
      let maxRef = 0;
      for (let i = 0; i < seg; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(refL[i] - oL[i]), Math.abs(refR[i] - oR[i]));
        maxRef = Math.max(maxRef, Math.abs(refL[i]), Math.abs(refR[i]));
      }
      expect(maxDiff / maxRef).toBeLessThan(1e-4);
    });
  }

  it('menolak jumlah frame yang tidak cocok dan buffer kecil', () => {
    const dsp = new StereoMdxDsp(nFft, hop, dimF);
    const l = new Float32Array(hop * 63);
    expect(() => dsp.forward(l, l, 32, new Float32Array(4 * dimF * 32))).toThrow();
    expect(() => dsp.forward(l, l, 64, new Float32Array(10))).toThrow();
  });
});

describe('checkMdxOutputLayout', () => {
  it('menerima layout benar dan menolak yang salah', () => {
    expect(checkMdxOutputLayout(4 * 8 * 4, [1, 4, 8, 4], 8, 4)).toBeNull();
    expect(checkMdxOutputLayout(4 * 8 * 4, [4, 8, 4], 8, 4)).toBeNull();
    expect(checkMdxOutputLayout(10, [1, 4, 8, 4], 8, 4)).toMatch(/length/);
    expect(checkMdxOutputLayout(4 * 8 * 4, [1, 2, 8, 4], 8, 4)).toMatch(/channels/);
    expect(checkMdxOutputLayout(4 * 8 * 4, [1, 4, 9, 4], 8, 4)).toMatch(/freq/);
    expect(checkMdxOutputLayout(4 * 8 * 4, [1, 4, 8, 5], 8, 4)).toMatch(/time/);
  });
});

describe('quality gate dengan snapshot input (buffer sudah di-transfer)', () => {
  it('tidak salah memperingatkan saat input asli sudah kosong', () => {
    const n = 44100;
    const mix = new Float32Array(n);
    const inst = new Float32Array(n);
    const voc = new Float32Array(n);
    const r = rng(3);
    for (let i = 0; i < n; i++) {
      inst[i] = Math.sin(i * 0.05) * 0.3;
      voc[i] = r() * 0.2;
      mix[i] = inst[i] + voc[i];
    }
    const snap = snapshotInput([mix, mix]);
    const detached = [new Float32Array(0), new Float32Array(0)]; // seperti buffer yang sudah di-transfer
    const broken = runQualityGate({ input: detached, vocals: [voc], instrumental: [inst] });
    expect(broken.warnings.length).toBeGreaterThan(0); // perilaku lama: peringatan palsu
    const fixed = runQualityGate({
      input: detached,
      inputSnapshot: snap,
      vocals: [voc],
      instrumental: [inst],
    });
    expect(fixed.ok).toBe(true);
    expect(fixed.warnings.length).toBe(0);
  });

  it('tetap mendeteksi model yang tidak memisahkan', () => {
    const n = 44100;
    const mix = new Float32Array(n);
    for (let i = 0; i < n; i++) mix[i] = Math.sin(i * 0.05) * 0.3;
    const snap = snapshotInput([mix]);
    const copy = mix.slice();
    const quiet = new Float32Array(n);
    quiet.fill(1e-5);
    const res = runQualityGate({
      input: [new Float32Array(0)],
      inputSnapshot: snap,
      vocals: [quiet],
      instrumental: [copy],
    });
    expect(res.warnings.join(' ')).toMatch(/tidak memisahkan/);
  });
});
