/**
 * No-install pure logic selftest for vocal separator (Node 22+).
 * node --experimental-strip-types scripts/selftest-vocal.ts
 */
import assert from 'node:assert/strict';
import { planChunks } from '../src/services/vocal-separator/pure/chunkPlanner.ts';
import { validateModelMarker } from '../src/services/vocal-separator/pure/modelMarker.ts';
import { runQualityGate } from '../src/services/vocal-separator/pure/qualityGate.ts';
import { hannWindow, stftChannel, istftChannel, fft, reconstructIdentity } from '../src/services/vocal-separator/pure/stft.ts';
import { MAX_DURATION_SEC } from '../src/services/vocal-separator/pure/config.ts';

const plan = planChunks({
  sampleCount: 5000,
  hopLength: 1024,
  dimT: 8,
  nFft: 6144,
  overlap: 0.25,
});
assert.ok(plan.totalChunks >= 1);

const marker = validateModelMarker({
  expectedSize: 10,
  actualSize: 10,
  expectedSha256: 'aa',
  headerSha256: 'aa',
});
assert.equal(marker.ok, true);

const silent = runQualityGate({
  input: [new Float32Array(100).fill(0.2)],
  vocals: [new Float32Array(100)],
});
assert.equal(silent.ok, false);

const nFft = 512;
const hop = 128;
const w = hannWindow(nFft);
const samples = new Float32Array(4096);
for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i / 20) * 0.3;
const { re, im, frames } = stftChannel(samples, nFft, hop, w);
const out = istftChannel(re, im, frames, nFft, hop, w, samples.length);
let err = 0;
for (let i = nFft; i < samples.length - nFft; i++) err += Math.abs(out[i] - samples[i]);
err /= samples.length - 2 * nFft;
assert.ok(err < 0.08, `stft identity err=${err}`);

{
  const N = 6144;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  re[0] = 1;
  fft(re, im);
  let dev = 0;
  for (let k = 0; k < N; k++) dev = Math.max(dev, Math.abs(re[k] - 1), Math.abs(im[k]));
  assert.ok(dev < 1e-4, `fft 6144 impulse dev=${dev}`);
  const sig = new Float32Array(8192);
  for (let i = 0; i < sig.length; i++) sig[i] = Math.sin((2 * Math.PI * 440 * i) / 44100) * 0.5;
  const y = reconstructIdentity(sig, 6144, 1024, 3072);
  let s2 = 0;
  let e2 = 0;
  for (let i = 0; i < sig.length; i++) {
    s2 += sig[i] * sig[i];
    const d = y[i] - sig[i];
    e2 += d * d;
  }
  const snr = 10 * Math.log10(s2 / e2);
  assert.ok(snr > 60, `mdx identity snr=${snr}`);
}

assert.ok(MAX_DURATION_SEC > 0);
console.log('selftest-vocal: OK');

// 22B-2 quality gate extras
import {
  runQualityGate as qg2,
  correlation as corr,
} from '../src/services/vocal-separator/pure/qualityGate.ts';
{
  const input = [new Float32Array(3000).map((_, i) => Math.sin(i / 20) * 0.4)];
  const inst = [new Float32Array(input[0])];
  const vocals = [new Float32Array(3000).map(() => 0.05)];
  const r = qg2({ input, vocals, instrumental: inst });
  assert.ok(r.warnings.length >= 1, 'expect not-separated warning');
  assert.ok(corr(input[0], inst[0]) > 0.99);
}
console.log('selftest-vocal 22B-2 extras: OK');

import { getDeviceTier, trimToSeconds, estimateProcessingTime } from '../src/services/vocal-separator/pure/deviceTier.ts';
import { runFastMode } from '../src/services/vocal-separator/pure/fastMode.ts';
import { mapPositionOnSourceSwitch } from '../src/services/vocal-separator/pure/abPlayer.ts';
{
  assert.equal(getDeviceTier({ userAgent: 'iPhone', hardwareConcurrency: 2 }), 'low');
  const t = trimToSeconds([new Float32Array(10000)], 1000, 2);
  assert.equal(t[0].length, 2000);
  const L = new Float32Array([1, 0, -1]);
  const R = new Float32Array([1, 0, -1]);
  const fm = runFastMode(L, R, { strength: 0, keepBass: false, sampleRate: 44100 });
  assert.equal(fm.left[0], 1);
  assert.ok(mapPositionOnSourceSwitch(5, 10, 20) === 10);
  assert.ok(estimateProcessingTime(10, 'mid', 'economy').minSec > 0);
  console.log('selftest-vocal 22C extras: OK');
}
