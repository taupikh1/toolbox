import { useState } from 'react';
import { copyText } from '../utils';

export default function Copy({ text, label = 'Salin', primary = false, small = false }: { text: string; label?: string; primary?: boolean; small?: boolean }) {
  const [n, setN] = useState('');
  return (
    <button className={'btn' + (primary ? ' primary' : '') + (small ? ' sm' : '')} disabled={!text} onClick={async () => { setN((await copyText(text)) ? 'Tersalin ✓' : 'Gagal menyalin'); setTimeout(() => setN(''), 1500); }}>
      {n || label}
    </button>
  );
}
