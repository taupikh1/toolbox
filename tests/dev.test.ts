import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { md5, hashBytes, b64enc, b64dec, bytesToB64, b64ToBytes, uuid4, uuid7, UUID_RE, UUID7_RE, buildPools, genPassword, entropyBits, diff, mergeOps, jsonError } from '../src/lib/dev';
import { convert } from '../src/tools/unit-converter/convert';

const enc = (s: string) => new TextEncoder().encode(s);

describe('hash', () => {
  it('md5 sama dengan node crypto', () => {
    for (const s of ['', 'a', 'abc', 'halo 😀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)])
      expect(md5(enc(s))).toBe(createHash('md5').update(s).digest('hex'));
  });
  it('sha-256 string kosong dan SHA-384/512', async () => {
    expect(await hashBytes('SHA-256', enc(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    for (const a of ['SHA-384', 'SHA-512']) expect(await hashBytes(a, enc('abc'))).toBe(createHash(a.replace('-', '').toLowerCase()).update('abc').digest('hex'));
  });
});
describe('base64', () => {
  it('roundtrip teks Unicode', () => { for (const s of ['', 'hello', 'Halo 🌏 日本語']) expect(b64dec(b64enc(s))).toBe(s); });
  it('nilai dikenal dan input invalid', () => { expect(b64enc('hello')).toBe('aGVsbG8='); expect(() => b64dec('@@@')).toThrow(); expect(() => b64dec('/w==')).toThrow(/UTF-8/); });
  it('roundtrip biner', () => { const r = Uint8Array.from({ length: 256 }, (_, i) => i); expect(b64ToBytes(bytesToB64(r))).toEqual(r); });
});
describe('uuid', () => {
  it('v4 valid dan unik', () => { const s = new Set(Array.from({ length: 500 }, uuid4)); expect(s.size).toBe(500); for (const u of s) expect(u).toMatch(UUID_RE); });
  it('v7 valid, memuat timestamp, terurut antar milidetik', () => {
    const u = uuid7(1700000000123);
    expect(u).toMatch(UUID7_RE);
    expect(parseInt(u.replace(/-/g, '').slice(0, 12), 16)).toBe(1700000000123);
    expect(uuid7(1000) < uuid7(2000)).toBe(true);
  });
});
describe('password', () => {
  const o = { lower: true, upper: true, digit: true, symbol: true, noAmbig: true };
  it('panjang, tiap jenis ada, tanpa karakter mirip', () => {
    for (let i = 0; i < 200; i++) { const p = genPassword(16, buildPools(o)); expect(p).toHaveLength(16); expect(p).toMatch(/[a-z]/); expect(p).toMatch(/[A-Z]/); expect(p).toMatch(/\d/); expect(p).toMatch(/[^A-Za-z0-9]/); expect(p).not.toMatch(/[Il1O0o|]/); }
  });
  it('error dan entropi', () => { expect(() => genPassword(8, [])).toThrow(); expect(() => genPassword(2, buildPools(o))).toThrow(); expect(entropyBits(10, 62)).toBeCloseTo(59.54, 1); });
});
describe('diff', () => {
  const t = (a: string, b: string) => mergeOps(diff([...a], [...b])!).map((o) => o.t + o.s).join('|');
  it('kasus dasar', () => { expect(t('abc', 'abc')).toBe('=abc'); expect(t('', '')).toBe(''); expect(t('abc', 'abXc')).toBe('=ab|+X|=c'); expect(t('abc', 'ac')).toBe('=a|-b|=c'); expect(t('', 'hi')).toBe('+hi'); });
});
describe('json error', () => {
  it('posisi hanya jika disebut engine', () => { expect(jsonError('{\n"a":}', new Error('x at position 6'))).toMatch(/baris 2, kolom 5/); expect(jsonError('x', new Error('tanpa posisi'))).toBe('tanpa posisi'); });
});
describe('unit converter', () => {
  it('konversi umum', () => {
    expect(convert('Panjang', 1, 'km', 'm')).toBe(1000);
    expect(convert('Suhu', 100, '°C', '°F')).toBeCloseTo(212);
    expect(convert('Suhu', -40, '°C', '°F')).toBeCloseTo(-40);
    expect(convert('Suhu', 0, '°C', 'K')).toBeCloseTo(273.15);
    expect(convert('Data', 1, 'KiB', 'B')).toBe(1024);
    expect(convert('Data', 1, 'KB (1000)', 'B')).toBe(1000);
  });
});
