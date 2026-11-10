// Logika murni Phase 2 (bisa dites tanpa browser: npm run selftest).
const hex = (u: Uint8Array) => [...u].map((b) => b.toString(16).padStart(2, '0')).join('');

export function md5(data: Uint8Array): string {
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const n = data.length, len = (((n + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(len);
  buf.set(data); buf[n] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(len - 8, (n << 3) >>> 0, true);
  dv.setUint32(len - 4, Math.floor(n / 2 ** 29), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < len; o += 64) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + dv.getUint32(o + g * 4, true)) >>> 0;
      A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i & 3)];
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  [a0, b0, c0, d0].forEach((v, i) => out.setUint32(i * 4, v, true));
  return hex(new Uint8Array(out.buffer));
}

export async function hashBytes(alg: string, data: Uint8Array): Promise<string> {
  if (alg === 'MD5') return md5(data);
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto tidak tersedia. Buka lewat HTTPS.');
  return hex(new Uint8Array(await crypto.subtle.digest(alg, data)));
}

export function b64enc(s: string): string {
  const b = new TextEncoder().encode(s);
  let r = '';
  for (let i = 0; i < b.length; i += 0x8000) r += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(r);
}
export function bytesToB64(b: Uint8Array): string {
  let r = '';
  for (let i = 0; i < b.length; i += 0x8000) r += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(r);
}
export function b64ToBytes(s: string): Uint8Array {
  const t = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t) || t.length % 4 === 1) throw new Error('Bukan Base64 yang valid.');
  return Uint8Array.from(atob(t.padEnd(Math.ceil(t.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
}
export function b64dec(s: string): string {
  const u = b64ToBytes(s);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u); }
  catch { throw new Error('Base64 valid, tapi isinya bukan teks UTF-8 (mungkin data biner).'); }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function uuid4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const UUID7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// UUID v7 (RFC 9562): 48-bit timestamp ms + versi 7 + varian 10 + 74 bit acak. Urutan dalam milidetik yang sama tidak dijamin.
export function uuid7(ms: number = Date.now()): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let t = ms;
  for (let i = 5; i >= 0; i--) { b[i] = t % 256; t = Math.floor(t / 256); }
  b[6] = (b[6] & 15) | 0x70; b[8] = (b[8] & 63) | 128;
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type Rng = (n: number) => number;
// Rejection sampling: tanpa modulo bias.
export const secureInt: Rng = (n) => {
  const lim = Math.floor(2 ** 32 / n) * n, u = new Uint32Array(1);
  do crypto.getRandomValues(u); while (u[0] >= lim);
  return u[0] % n;
};
export const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digit: '0123456789', symbol: '!@#$%^&*()-_=+[]{};:,.?/~' };
export type PoolOpts = { lower: boolean; upper: boolean; digit: boolean; symbol: boolean; noAmbig: boolean };
export function buildPools(o: PoolOpts): string[] {
  const ks = (['lower', 'upper', 'digit', 'symbol'] as const).filter((k) => o[k]);
  return ks.map((k) => (o.noAmbig ? SETS[k].replace(/[Il1O0o|]/g, '') : SETS[k]));
}
// Menjamin minimal satu karakter dari tiap jenis yang dipilih, lalu diacak (Fisher-Yates, rng tanpa bias).
export function genPassword(len: number, pools: string[], rng: Rng = secureInt): string {
  if (!pools.length) throw new Error('Pilih minimal satu jenis karakter.');
  if (len < pools.length) throw new Error('Panjang kurang dari jumlah jenis karakter.');
  const all = pools.join('');
  const out = pools.map((p) => p[rng(p.length)]);
  while (out.length < len) out.push(all[rng(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rng(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}
export const entropyBits = (len: number, pool: number) => len * Math.log2(pool);
export const strength = (bits: number) => (bits < 40 ? 'Weak' : bits < 60 ? 'Medium' : bits < 80 ? 'Strong' : 'Very Strong');

export type Op = { t: '=' | '+' | '-'; s: string };
// Diff LCS (dengan pemangkasan awalan/akhiran sama). null jika terlalu besar.
export function diff(a: string[], b: string[]): Op[] | null {
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let e = 0; while (e < a.length - p && e < b.length - p && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const x = a.slice(p, a.length - e), y = b.slice(p, b.length - e), n = x.length, m = y.length;
  if ((n + 1) * (m + 1) > 6e6) return null;
  const W = m + 1, L = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = x[i] === y[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
  const ops: Op[] = a.slice(0, p).map((s): Op => ({ t: '=', s }));
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { ops.push({ t: '=', s: x[i] }); i++; j++; }
    else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) ops.push({ t: '-', s: x[i++] });
    else ops.push({ t: '+', s: y[j++] });
  }
  while (i < n) ops.push({ t: '-', s: x[i++] });
  while (j < m) ops.push({ t: '+', s: y[j++] });
  return ops.concat(a.slice(a.length - e).map((s): Op => ({ t: '=', s })));
}
export function mergeOps(ops: Op[]): Op[] {
  const r: Op[] = [];
  for (const o of ops) { const l = r[r.length - 1]; if (l && l.t === o.t) l.s += o.s; else r.push({ ...o }); }
  return r;
}

export function jsonError(src: string, e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  const pos = /position (\d+)/.exec(m);
  if (!pos) return m;
  const lines = src.slice(0, +pos[1]).split('\n');
  return `${m} (baris ${lines.length}, kolom ${lines[lines.length - 1].length + 1})`;
}
