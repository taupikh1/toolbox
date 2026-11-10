export function UnsupportedFeatureNotice({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="dc-notice" role="note">
      <b>{title}</b>
      <ul>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
