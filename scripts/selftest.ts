import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { md5, hashBytes, b64enc, b64dec, bytesToB64, b64ToBytes, uuid4, uuid7, UUID_RE, UUID7_RE, buildPools, genPassword, diff, mergeOps, entropyBits, jsonError } from '../src/lib/dev.ts';
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;
const enc = (s: string) => new TextEncoder().encode(s);
let n = 0; const ok = (name: string, f: () => void | Promise<void>) => Promise.resolve(f()).then(() => { n++; console.log('PASS', name); });

await ok('md5 vs node crypto', () => {
  for (const s of ['', 'a', 'abc', 'halo dunia 😀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)])
    assert.equal(md5(enc(s)), createHash('md5').update(s).digest('hex'), s.slice(0, 10));
});
await ok('sha256/384/512 known + vs node', async () => {
  assert.equal(await hashBytes('SHA-256', enc('')), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  for (const a of ['SHA-256', 'SHA-384', 'SHA-512']) assert.equal(await hashBytes(a, enc('abc 😀')), createHash(a.replace('-', '').toLowerCase()).update('abc 😀').digest('hex'));
});
await ok('base64 roundtrip + invalid', () => {
  for (const s of ['', 'hello', 'Halo dunia 🌏 日本語']) assert.equal(b64dec(b64enc(s)), s);
  assert.equal(b64enc('hello'), 'aGVsbG8=');
  assert.throws(() => b64dec('@@@'));
  assert.throws(() => b64dec('/w=='), /UTF-8/);
});
await ok('uuid v4 format + unik', () => {
  const s = new Set(Array.from({ length: 500 }, uuid4));
  assert.equal(s.size, 500); for (const u of s) assert.match(u, UUID_RE);
});
await ok('password: panjang, set, ambigu, error', () => {
  const o = { lower: true, upper: true, digit: true, symbol: true, noAmbig: true };
  for (let i = 0; i < 200; i++) {
    const p = genPassword(16, buildPools(o)); assert.equal(p.length, 16);
    assert.match(p, /[a-z]/); assert.match(p, /[A-Z]/); assert.match(p, /\d/); assert.match(p, /[^A-Za-z0-9]/); assert.doesNotMatch(p, /[Il1O0o|]/);
  }
  assert.match(genPassword(30, buildPools({ ...o, upper: false, symbol: false, digit: false })), /^[a-z]+$/);
  assert.throws(() => genPassword(8, [])); assert.throws(() => genPassword(2, buildPools(o)));
  assert.ok(Math.abs(entropyBits(10, 62) - 59.54) < 0.01);
});
await ok('diff', () => {
  const t = (a: string, b: string) => mergeOps(diff([...a], [...b])!).map((o) => o.t + o.s).join('|');
  assert.equal(t('abc', 'abc'), '=abc'); assert.equal(t('', ''), '');
  assert.equal(t('abc', 'abXc'), '=ab|+X|=c'); assert.equal(t('abc', 'ac'), '=a|-b|=c'); assert.equal(t('', 'hi'), '+hi');
});
await ok('jsonError: posisi hanya jika engine menyebutnya', () => {
  assert.match(jsonError('{\n"a":}', new Error('Unexpected token } at position 6')), /baris 2, kolom 5/);
  assert.equal(jsonError('x', new Error('pesan tanpa posisi')), 'pesan tanpa posisi');
});
await ok('uuid v7: format, timestamp, urutan, unik', () => {
  const ms = 1700000000123, u = uuid7(ms);
  assert.match(u, UUID7_RE); assert.equal(parseInt(u.replace(/-/g, '').slice(0, 12), 16), ms);
  assert.ok(uuid7(1000) < uuid7(2000));
  assert.equal(new Set(Array.from({ length: 500 }, () => uuid7())).size, 500);
});
await ok('base64 bytes: biner roundtrip', () => {
  const raw = Uint8Array.from({ length: 256 }, (_, i) => i);
  assert.deepEqual(b64ToBytes(bytesToB64(raw)), raw);
  const big = new Uint8Array(200000).map((_, i) => i % 251); assert.deepEqual(b64ToBytes(bytesToB64(big)), big);
  assert.deepEqual(b64ToBytes('aGk'), enc('hi')); assert.throws(() => b64ToBytes('a'));
});
console.log(`${n} grup tes lulus`);
