import { useState } from 'react';
import type { ExtractedTable } from '../engine/pdf-table/types';
import { tablesToXlsx, tableToCsv, tableToJson, tableToHtml } from '../engine/pdf-table/export';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function PdfTableEditor({ tables, fileName, onClose }: {
  tables: ExtractedTable[];
  fileName: string;
  onClose: () => void;
}) {
  const [list, setList] = useState(tables);
  const [sel, setSel] = useState(0);
  const t = list[sel];

  function updateCell(r: number, c: number, value: string) {
    setList((prev) => prev.map((tb, i) => {
      if (i !== sel) return tb;
      const rows = tb.rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? value : cell) : row);
      return { ...tb, rows };
    }));
  }
  function addRow() {
    setList((prev) => prev.map((tb, i) => i !== sel ? tb : { ...tb, rows: [...tb.rows, Array(tb.rows[0]?.length ?? 1).fill('')] }));
  }
  function delRow(ri: number) {
    setList((prev) => prev.map((tb, i) => i !== sel ? tb : { ...tb, rows: tb.rows.filter((_, idx) => idx !== ri) }));
  }
  function addCol() {
    setList((prev) => prev.map((tb, i) => i !== sel ? tb : { ...tb, rows: tb.rows.map((r) => [...r, '']) }));
  }
  function delCol(ci: number) {
    setList((prev) => prev.map((tb, i) => i !== sel ? tb : { ...tb, rows: tb.rows.map((r) => r.filter((_, idx) => idx !== ci)) }));
  }

  if (!t) {
    return (
      <div className="pdf-table-editor">
        <p className="muted">Tidak ada tabel terdeteksi.</p>
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
    );
  }

  return (
    <div className="pdf-table-editor">
      <div className="dc-queue-head">
        <h3 style={{ margin: 0 }}>Table Editor</h3>
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {list.length} tabel · halaman {t.pageStart} · kualitas: {t.confidence} · metode: {t.method}
      </p>
      {t.warnings.length > 0 && <p className="muted">{t.warnings.join(' ')}</p>}

      <div style={{ display: 'flex', gap: '.4rem', overflowX: 'auto' }}>
        {list.map((tb, i) => (
          <button key={tb.id} type="button" className={i === sel ? 'btn primary' : 'btn'} onClick={() => setSel(i)}>
            Tabel {i + 1}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="pdf-table">
          <tbody>
            {t.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>
                    <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} />
                  </td>
                ))}
                <td><button type="button" className="btn" onClick={() => delRow(ri)}>−</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={addRow}>Tambah baris</button>
        <button type="button" className="btn" onClick={addCol}>Tambah kolom</button>
        <button type="button" className="btn" onClick={() => delCol(t.rows[0]?.length - 1 || 0)}>Hapus kolom terakhir</button>
        <button type="button" className="btn primary" onClick={() => download(tablesToXlsx([t]), `${fileName}_tabel${sel + 1}.xlsx`)}>Unduh XLSX</button>
        <button type="button" className="btn" onClick={() => download(tableToCsv(t), `${fileName}_tabel${sel + 1}.csv`)}>Unduh CSV</button>
        <button type="button" className="btn" onClick={() => download(tableToJson(t), `${fileName}_tabel${sel + 1}.json`)}>Unduh JSON</button>
        <button type="button" className="btn" onClick={() => {
          const html = tableToHtml(t);
          const blob = new Blob([html], { type: 'text/html' });
          download(blob, `${fileName}_tabel${sel + 1}.html`);
        }}>Unduh HTML</button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Deteksi bersifat heuristik (pengelompokan koordinat). Hasil bukan jaminan identik dengan PDF. Periksa sebelum dipakai.
      </p>
    </div>
  );
}
