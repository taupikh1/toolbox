// Faktor ke satuan dasar tiap kategori: m, kg, m², liter, m/s, byte.
export const UNITS: Record<string, Record<string, number>> = {
  Panjang: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.344 },
  Berat: { mg: 1e-6, g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237, ton: 1000 },
  Luas: { 'm²': 1, 'km²': 1e6, hektar: 1e4, acre: 4046.8564224, 'ft²': 0.09290304 },
  Volume: { ml: 0.001, l: 1, 'm³': 1000, 'galon AS': 3.785411784, cup: 0.2365882365 },
  Kecepatan: { 'm/s': 1, 'km/jam': 1 / 3.6, mph: 0.44704 },
  Data: { bit: 1 / 8, B: 1, 'KB (1000)': 1e3, 'MB (1000²)': 1e6, 'GB (1000³)': 1e9, 'TB (1000⁴)': 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 },
};
export const TEMPS = ['°C', '°F', 'K'];

export function convert(cat: string, v: number, from: string, to: string): number {
  if (cat === 'Suhu') {
    const c = from === '°C' ? v : from === '°F' ? ((v - 32) * 5) / 9 : v - 273.15;
    return to === '°C' ? c : to === '°F' ? (c * 9) / 5 + 32 : c + 273.15;
  }
  const u = UNITS[cat];
  return (v * u[from]) / u[to];
}
