/**
 * Fast stereo STFT / iSTFT for the UVR MDX path (batch 22D, speed).
 * Pure: no ORT / DOM imports.
 *
 * Hasilnya setara dengan jalur lama di stft.ts + mdxTensor.ts:
 *   stftChannel -> sliceOneSided -> zeroLowBins -> packMdxInput          (forward)
 *   readMdxOutput -> expandConjugateMirror -> istftChannel               (inverse)
 * tetapi jauh lebih cepat karena:
 *   1. FFT mixed-radix (N = 2^k atau 3·2^k, mis. 6144 = 3·2048) dengan tabel
 *      twiddle, bukan Bluestein (yang butuh 3 FFT berukuran 16384 per transform).
 *   2. Kanal L dan R digabung dalam SATU FFT kompleks (trik pasangan real),
 *      jadi jumlah FFT separuhnya, baik di STFT maupun iSTFT.
 *   3. Menulis langsung ke layout tensor NCHW [1, 4, dimF, frames] dan membaca
 *      langsung dari output model, tanpa spektrum penuh perantara.
 *   4. Normalisasi window^2 di-cache per jumlah frame, buffer dipakai ulang.
 */

import { reflectIndex } from './stft';

const SQRT3_2 = Math.sqrt(3) / 2;

/** N harus 2^k (k>=2) atau 3·2^k (k>=2). */
export function isFastFftSupported(n: number): boolean {
  if (!Number.isInteger(n) || n < 4) return false;
  const m = n % 3 === 0 ? n / 3 : n;
  return m >= 4 && (m & (m - 1)) === 0;
}

/** Radix-2 DIT; data harus sudah dalam urutan bit-reversed. */
class Radix2 {
  readonly n: number;
  readonly rev: Int32Array;
  private readonly cosT: Float64Array;
  private readonly sinT: Float64Array; // -sin(2πk/n) (forward)

  constructor(n: number) {
    this.n = n;
    this.rev = new Int32Array(n);
    let bits = 0;
    while (1 << bits < n) bits++;
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
      this.rev[i] = r;
    }
    const half = n >> 1;
    this.cosT = new Float64Array(half);
    this.sinT = new Float64Array(half);
    for (let k = 0; k < half; k++) {
      const a = (2 * Math.PI * k) / n;
      this.cosT[k] = Math.cos(a);
      this.sinT[k] = -Math.sin(a);
    }
  }

  run(re: Float64Array, im: Float64Array): void {
    const n = this.n;
    const cosT = this.cosT;
    const sinT = this.sinT;
    // stage size 2 (w = 1)
    for (let i = 0; i < n; i += 2) {
      const ur = re[i];
      const ui = im[i];
      const vr = re[i + 1];
      const vi = im[i + 1];
      re[i] = ur + vr;
      im[i] = ui + vi;
      re[i + 1] = ur - vr;
      im[i + 1] = ui - vi;
    }
    // stage size 4 (w = 1, -i)
    for (let i = 0; i < n; i += 4) {
      let ur = re[i];
      let ui = im[i];
      let vr = re[i + 2];
      let vi = im[i + 2];
      re[i] = ur + vr;
      im[i] = ui + vi;
      re[i + 2] = ur - vr;
      im[i + 2] = ui - vi;
      ur = re[i + 1];
      ui = im[i + 1];
      vr = im[i + 3]; // v * (-i) = (v.im, -v.re)
      vi = -re[i + 3];
      re[i + 1] = ur + vr;
      im[i + 1] = ui + vi;
      re[i + 3] = ur - vr;
      im[i + 3] = ui - vi;
    }
    for (let size = 8; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = cosT[k];
          const wi = sinT[k];
          const a = i + j;
          const b = a + half;
          const xr = re[b];
          const xi = im[b];
          const vr = xr * wr - xi * wi;
          const vi = xr * wi + xi * wr;
          const ur = re[a];
          const ui = im[a];
          re[a] = ur + vr;
          im[a] = ui + vi;
          re[b] = ur - vr;
          im[b] = ui - vi;
        }
      }
    }
  }
}

/** Forward DFT (exponent negatif) untuk N = 2^k atau 3·2^k. Tidak in-place. */
export class MixedFft {
  readonly n: number;
  private readonly r: 1 | 3;
  private readonly m: number;
  private readonly core: Radix2;
  private readonly tw1Re: Float64Array;
  private readonly tw1Im: Float64Array;
  private readonly tw2Re: Float64Array;
  private readonly tw2Im: Float64Array;
  private readonly bRe: Float64Array[];
  private readonly bIm: Float64Array[];

  constructor(n: number) {
    if (!isFastFftSupported(n)) throw new Error(`MixedFft: panjang ${n} tidak didukung`);
    this.n = n;
    this.r = n % 3 === 0 ? 3 : 1;
    this.m = n / this.r;
    this.core = new Radix2(this.m);
    const m = this.m;
    if (this.r === 3) {
      this.tw1Re = new Float64Array(m);
      this.tw1Im = new Float64Array(m);
      this.tw2Re = new Float64Array(m);
      this.tw2Im = new Float64Array(m);
      for (let q = 0; q < m; q++) {
        const a1 = (2 * Math.PI * q) / n;
        const a2 = (2 * Math.PI * 2 * q) / n;
        this.tw1Re[q] = Math.cos(a1);
        this.tw1Im[q] = -Math.sin(a1);
        this.tw2Re[q] = Math.cos(a2);
        this.tw2Im[q] = -Math.sin(a2);
      }
      this.bRe = [new Float64Array(m), new Float64Array(m), new Float64Array(m)];
      this.bIm = [new Float64Array(m), new Float64Array(m), new Float64Array(m)];
    } else {
      this.tw1Re = this.tw1Im = this.tw2Re = this.tw2Im = new Float64Array(0);
      this.bRe = [];
      this.bIm = [];
    }
  }

  transform(inRe: Float64Array, inIm: Float64Array, outRe: Float64Array, outIm: Float64Array): void {
    const rev = this.core.rev;
    const m = this.m;
    if (this.r === 1) {
      for (let i = 0; i < m; i++) {
        const s = rev[i];
        outRe[i] = inRe[s];
        outIm[i] = inIm[s];
      }
      this.core.run(outRe, outIm);
      return;
    }
    const [r0, r1, r2] = this.bRe;
    const [i0, i1, i2] = this.bIm;
    for (let i = 0; i < m; i++) {
      const s = 3 * rev[i];
      r0[i] = inRe[s];
      i0[i] = inIm[s];
      r1[i] = inRe[s + 1];
      i1[i] = inIm[s + 1];
      r2[i] = inRe[s + 2];
      i2[i] = inIm[s + 2];
    }
    this.core.run(r0, i0);
    this.core.run(r1, i1);
    this.core.run(r2, i2);
    const t1r = this.tw1Re;
    const t1i = this.tw1Im;
    const t2r = this.tw2Re;
    const t2i = this.tw2Im;
    for (let q = 0; q < m; q++) {
      const a0r = r0[q];
      const a0i = i0[q];
      const y1r = r1[q];
      const y1i = i1[q];
      const y2r = r2[q];
      const y2i = i2[q];
      const a1r = y1r * t1r[q] - y1i * t1i[q];
      const a1i = y1r * t1i[q] + y1i * t1r[q];
      const a2r = y2r * t2r[q] - y2i * t2i[q];
      const a2i = y2r * t2i[q] + y2i * t2r[q];
      const sr = a1r + a2r;
      const si = a1i + a2i;
      const dr = a1r - a2r;
      const di = a1i - a2i;
      outRe[q] = a0r + sr;
      outIm[q] = a0i + si;
      const m1r = a0r - 0.5 * sr;
      const m1i = a0i - 0.5 * si;
      const tr = SQRT3_2 * dr;
      const ti = SQRT3_2 * di;
      outRe[q + m] = m1r + ti;
      outIm[q + m] = m1i - tr;
      outRe[q + 2 * m] = m1r - ti;
      outIm[q + 2 * m] = m1i + tr;
    }
  }
}

export interface StereoMdxDspOptions {
  /** Jumlah bin frekuensi paling bawah yang dinolkan pada input (UVR: 3). */
  zeroLowBins?: number;
}

/**
 * STFT/iSTFT stereo untuk satu potongan MDX. Instans menyimpan buffer kerja dan
 * tidak aman dipakai paralel; satu instans per worker sudah cukup.
 */
export class StereoMdxDsp {
  readonly nFft: number;
  readonly hop: number;
  readonly dimF: number;
  private readonly zeroBins: number;
  private readonly fft: MixedFft;
  private readonly win: Float64Array;
  private readonly zRe: Float64Array;
  private readonly zIm: Float64Array;
  private readonly oRe: Float64Array;
  private readonly oIm: Float64Array;
  private readonly normCache = new Map<string, Float64Array>();
  private accL = new Float64Array(0);
  private accR = new Float64Array(0);

  constructor(nFft: number, hop: number, dimF: number, opts: StereoMdxDspOptions = {}) {
    if (!isFastFftSupported(nFft)) throw new Error(`nFft ${nFft} tidak didukung FFT cepat`);
    if (hop < 1) throw new Error('hop tidak valid');
    if (dimF < 1 || dimF > (nFft >> 1) + 1) throw new Error(`dimF ${dimF} di luar 1..${(nFft >> 1) + 1}`);
    this.nFft = nFft;
    this.hop = hop;
    this.dimF = dimF;
    this.zeroBins = Math.min(opts.zeroLowBins ?? 3, dimF);
    this.fft = new MixedFft(nFft);
    this.win = new Float64Array(nFft);
    for (let i = 0; i < nFft; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nFft);
    this.zRe = new Float64Array(nFft);
    this.zIm = new Float64Array(nFft);
    this.oRe = new Float64Array(nFft);
    this.oIm = new Float64Array(nFft);
  }

  /** Jumlah frame STFT (center=True) untuk panjang sinyal tertentu. */
  framesFor(length: number): number {
    const pad = this.nFft >> 1;
    return Math.max(1, Math.floor((length + 2 * pad - this.nFft) / this.hop) + 1);
  }

  /**
   * L/R (panjang sama) -> `out` berlayout NCHW [4, dimF, frames]:
   * kanal 0..3 = L.re, L.im, R.re, R.im. Bin 0..zeroLowBins-1 dinolkan.
   */
  forward(left: Float32Array, right: Float32Array, frames: number, out: Float32Array): void {
    const { nFft: n, hop, dimF, win, zRe, zIm, oRe, oIm } = this;
    const len = left.length;
    if (right.length !== len) throw new Error('kanal L/R beda panjang');
    if (this.framesFor(len) !== frames) {
      throw new Error(`STFT menghasilkan ${this.framesFor(len)} frame, diminta ${frames}`);
    }
    if (out.length < 4 * dimF * frames) throw new Error('buffer output terlalu kecil');
    const pad = n >> 1;
    const zb = this.zeroBins;
    const plane = dimF * frames;
    for (let f = 0; f < frames; f++) {
      const base = f * hop - pad;
      if (base >= 0 && base + n <= len) {
        for (let i = 0; i < n; i++) {
          const w = win[i];
          zRe[i] = left[base + i] * w;
          zIm[i] = right[base + i] * w;
        }
      } else {
        for (let i = 0; i < n; i++) {
          let idx = base + i;
          if (idx < 0 || idx >= len) idx = reflectIndex(idx, len);
          const w = win[i];
          zRe[i] = left[idx] * w;
          zIm[i] = right[idx] * w;
        }
      }
      this.fft.transform(zRe, zIm, oRe, oIm);
      for (let k = 0; k < zb; k++) {
        const o = k * frames + f;
        out[o] = 0;
        out[plane + o] = 0;
        out[2 * plane + o] = 0;
        out[3 * plane + o] = 0;
      }
      for (let k = zb; k < dimF; k++) {
        const j = k === 0 ? 0 : n - k;
        const a = oRe[k];
        const b = oIm[k];
        const c = oRe[j];
        const d = oIm[j];
        const o = k * frames + f;
        out[o] = (a + c) * 0.5; // L.re
        out[plane + o] = (b - d) * 0.5; // L.im
        out[2 * plane + o] = (b + d) * 0.5; // R.re
        out[3 * plane + o] = (c - a) * 0.5; // R.im
      }
    }
  }

  private getNorm(frames: number, timeline: number): Float64Array {
    const cacheKey = `${frames}:${timeline}`;
    let norm = this.normCache.get(cacheKey);
    if (norm) return norm;
    const { nFft: n, hop, win } = this;
    norm = new Float64Array(timeline);
    for (let f = 0; f < frames; f++) {
      const s = f * hop;
      for (let i = 0; i < n; i++) norm[s + i] += win[i] * win[i];
    }
    this.normCache.set(cacheKey, norm);
    return norm;
  }

  /**
   * Output model (NCHW [4, dimF, frames], atau [1,4,dimF,frames] yang datanya sama)
   * -> gelombang L/R sepanjang `outLen`. Bin Nyquist dianggap 0 kecuali dimF
   * mencakupnya. Komponen imajiner DC/Nyquist dibuang (sinyal real), sama seperti
   * jalur lama yang hanya mengambil bagian real dari IFFT.
   */
  inverse(
    data: ArrayLike<number>,
    frames: number,
    outLen: number,
    outL: Float32Array,
    outR: Float32Array,
  ): void {
    const { nFft: n, hop, dimF, win, zRe, zIm, oRe, oIm } = this;
    const need = 4 * dimF * frames;
    if (data.length < need) throw new Error(`output model ${data.length} < ${need}`);
    if (outL.length < outLen || outR.length < outLen) throw new Error('buffer gelombang terlalu kecil');
    const pad = n >> 1;
    const timeline = Math.max(outLen + 2 * pad, frames > 0 ? (frames - 1) * hop + n : 0);
    if (this.accL.length !== timeline) {
      this.accL = new Float64Array(timeline);
      this.accR = new Float64Array(timeline);
    } else {
      this.accL.fill(0);
      this.accR.fill(0);
    }
    const accL = this.accL;
    const accR = this.accR;
    const norm = this.getNorm(frames, timeline);
    const nyq = n >> 1;
    const copy = Math.min(dimF, nyq + 1);
    const plane = dimF * frames;
    const invN = 1 / n;
    for (let f = 0; f < frames; f++) {
      zRe.fill(0);
      zIm.fill(0);
      for (let k = 0; k < copy; k++) {
        const o = k * frames + f;
        const lRe = data[o];
        const rRe = data[2 * plane + o];
        if (k === 0 || k === nyq) {
          // bin real murni: Z = L + i·R
          zRe[k] = lRe;
          zIm[k] = rRe;
        } else {
          const lIm = data[plane + o];
          const rIm = data[3 * plane + o];
          zRe[k] = lRe - rIm;
          zIm[k] = lIm + rRe;
          const j = n - k;
          zRe[j] = lRe + rIm;
          zIm[j] = rRe - lIm;
        }
      }
      // IDFT lewat swap(DFT(swap(Z)))/N: umpan (im, re), hasil: L = oIm/N, R = oRe/N
      this.fft.transform(zIm, zRe, oRe, oIm);
      const s = f * hop;
      for (let i = 0; i < n; i++) {
        const w = win[i] * invN;
        accL[s + i] += oIm[i] * w;
        accR[s + i] += oRe[i] * w;
      }
    }
    for (let i = 0; i < outLen; i++) {
      const nv = norm[pad + i];
      if (nv > 1e-8) {
        outL[i] = accL[pad + i] / nv;
        outR[i] = accR[pad + i] / nv;
      } else {
        outL[i] = accL[pad + i];
        outR[i] = accR[pad + i];
      }
    }
  }
}
