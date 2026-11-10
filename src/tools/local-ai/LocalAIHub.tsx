import { MODEL_REGISTRY } from './models';

export default function LocalAIHub() {
  const downloaded = 0;
  const totalSize = 0;

  return (
    <div className="local-ai">
      <h2>Local AI Hub</h2>
      <p className="muted">Pusat status kemampuan AI lokal. Saat ini tidak ada model yang diunduh atau di-bundle. Tidak ada inference AI. Tidak ada upload.</p>
      <div className="ai-stats">
        <span>Model terdaftar: {MODEL_REGISTRY.length}</span>
        <span>Terunduh: {downloaded}</span>
        <span>Ukuran: {totalSize} MB</span>
        <span>Runtime: tidak terpasang</span>
      </div>
      <table className="ai-table">
        <thead><tr><th>Fitur</th><th>Status</th><th>Alasan</th></tr></thead>
        <tbody>
          {MODEL_REGISTRY.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.status.toUpperCase()}</td>
              <td className="muted">{m.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="er" role="status">Tidak ada model yang diunduh secara otomatis. Tidak ada API cloud. Document Assistant (Batch 16) tetap rule-based dan bukan AI.</p>
    </div>
  );
}
