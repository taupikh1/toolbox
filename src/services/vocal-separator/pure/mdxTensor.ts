/**
 * Pure tensor-layout helpers for the UVR MDX ONNX graph.
 * No ORT import. Real session names/dims are still read at runtime;
 * these functions only decide and validate.
 *
 * Reference layout (KUIELab AbstractMDXNet.stft):
 *   [batch, 4, dim_f, dim_t] = real/imag × left/right, one-sided bins.
 *   https://github.com/kuielab/mdx-net/blob/main/src/models/mdxnet.py
 * ONNX feeds used by UVR inference name the input "input"
 * (seanghay/uvr-mdx-infer separate.py: session.run(None, {"input": spec})).
 */

export interface ResolvedName {
  ok: true;
  name: string;
  /** true when we had to accept the only unnamed tensor */
  sole: boolean;
}

export interface NameError {
  ok: false;
  message: string;
}

/**
 * Pick a tensor name. Prefer a known name. If several names exist and none
 * match, fail — do not silently take the first one.
 */
export function resolveTensorName(
  names: readonly string[],
  preferred: readonly string[],
): ResolvedName | NameError {
  if (!names.length) return { ok: false, message: 'Model has no tensor names' };
  for (const p of preferred) {
    if (names.includes(p)) return { ok: true, name: p, sole: names.length === 1 };
  }
  if (names.length === 1) return { ok: true, name: names[0], sole: true };
  return {
    ok: false,
    message: `Ambiguous tensors [${names.join(', ')}]; none of [${preferred.join(', ')}]`,
  };
}

export type Dim = number | string;

/**
 * Fixed numeric dims must match `expected`. Negative or symbolic dims are
 * accepted (ORT uses -1 or strings for dynamic axes). Rank must match.
 */
export function dimsCompatible(
  metaDims: readonly Dim[] | undefined,
  expected: readonly number[],
): string | null {
  if (!metaDims || metaDims.length === 0) return null;
  if (metaDims.length !== expected.length) {
    return `rank ${metaDims.length} != expected ${expected.length} (${JSON.stringify(metaDims)})`;
  }
  for (let i = 0; i < expected.length; i++) {
    const d = metaDims[i];
    if (typeof d === 'number' && d >= 0 && d !== expected[i]) {
      return `dim[${i}]=${d} != expected ${expected[i]} (${JSON.stringify(metaDims)})`;
    }
  }
  return null;
}

export interface MdxChannels {
  lRe: Float32Array;
  lIm: Float32Array;
  rRe: Float32Array;
  rIm: Float32Array;
  frames: number;
  dimF: number;
}

/**
 * Validasi layout output model tanpa menyalin data. Mengembalikan pesan error
 * atau null bila layout cocok dengan [1, 4, dimF, frames] / [4, dimF, frames].
 */
export function checkMdxOutputLayout(
  dataLength: number,
  dims: readonly number[] | undefined,
  dimF: number,
  frames: number,
): string | null {
  const need = 4 * dimF * frames;
  if (dimF <= 0 || frames <= 0) return `invalid dimF=${dimF} frames=${frames}`;
  if (dataLength < need) return `output length ${dataLength} < ${need}`;
  if (dims && dims.length > 0) {
    const shape = dims.filter((d) => typeof d === 'number');
    if (shape.length === 4) {
      const [b, c, f, t] = shape;
      if (b !== 1) return `batch ${b} != 1`;
      if (c !== 4) return `channels ${c} != 4`;
      if (f !== dimF) return `freq ${f} != dimF ${dimF}`;
      if (t !== frames) return `time ${t} != frames ${frames}`;
    } else if (shape.length === 3) {
      const [c, f, t] = shape;
      if (c !== 4) return `channels ${c} != 4`;
      if (f !== dimF) return `freq ${f} != dimF ${dimF}`;
      if (t !== frames) return `time ${t} != frames ${frames}`;
    } else {
      return `unexpected output rank ${shape.length} dims=${JSON.stringify(dims)}`;
    }
  } else if (dataLength !== need) {
    return `output length ${dataLength} != ${need} and dims are missing`;
  }
  return null;
}

/**
 * Read a model output into 4 one-sided channels.
 * Accepts [1, 4, dimF, frames] or [4, dimF, frames].
 * Rejects a wrong rank, channel count, frequency count, or time count
 * instead of indexing off the end of the buffer.
 */
export function readMdxOutput(
  data: ArrayLike<number>,
  dims: readonly number[] | undefined,
  dimF: number,
  frames: number,
): { ok: true; channels: MdxChannels } | { ok: false; message: string } {
  const err = checkMdxOutputLayout(data.length, dims, dimF, frames);
  if (err) return { ok: false, message: err };

  const lRe = new Float32Array(frames * dimF);
  const lIm = new Float32Array(frames * dimF);
  const rRe = new Float32Array(frames * dimF);
  const rIm = new Float32Array(frames * dimF);
  // NCHW: ((ch * dimF + bin) * frames + frame)
  for (let f = 0; f < frames; f++) {
    for (let b = 0; b < dimF; b++) {
      const dst = f * dimF + b;
      lRe[dst] = data[(0 * dimF + b) * frames + f] ?? 0;
      lIm[dst] = data[(1 * dimF + b) * frames + f] ?? 0;
      rRe[dst] = data[(2 * dimF + b) * frames + f] ?? 0;
      rIm[dst] = data[(3 * dimF + b) * frames + f] ?? 0;
    }
  }
  return { ok: true, channels: { lRe, lIm, rRe, rIm, frames, dimF } };
}

/** Pack 4 one-sided channels into NCHW [1, 4, dimF, frames]. */
export function packMdxInput(
  lRe: Float32Array,
  lIm: Float32Array,
  rRe: Float32Array,
  rIm: Float32Array,
  frames: number,
  dimF: number,
): Float32Array {
  const out = new Float32Array(4 * dimF * frames);
  for (let f = 0; f < frames; f++) {
    const src = f * dimF;
    for (let b = 0; b < dimF; b++) {
      out[(0 * dimF + b) * frames + f] = lRe[src + b] ?? 0;
      out[(1 * dimF + b) * frames + f] = lIm[src + b] ?? 0;
      out[(2 * dimF + b) * frames + f] = rRe[src + b] ?? 0;
      out[(3 * dimF + b) * frames + f] = rIm[src + b] ?? 0;
    }
  }
  return out;
}

/**
 * UVR menolkan 3 bin frekuensi pertama pada spektrum input sebelum masuk model
 * (spek[:, :, :3, :] *= 0). `data` berlayout frame-major dengan stride `dimF`.
 */
export function zeroLowBins(data: Float32Array, frames: number, dimF: number, bins = 3): void {
  const n = Math.min(bins, dimF);
  for (let f = 0; f < frames; f++) {
    const base = f * dimF;
    for (let b = 0; b < n; b++) data[base + b] = 0;
  }
}
