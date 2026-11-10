import type { ToolDefinition } from '../tools/registry';
import { categoryLabel } from '../nav';

interface Props {
  tool: ToolDefinition;
  fav: boolean;
  onToggleFav: (id: string) => void;
  compact?: boolean;
  showCategory?: boolean;
}

/** Kartu tool standar. Tautan dan tombol favorit bersaudara (bukan bersarang) agar HTML valid dan fokus keyboard jelas. */
export function ToolCard({ tool, fav, onToggleFav, compact, showCategory = true }: Props) {
  return (
    <div className={'tcard' + (compact ? ' compact' : '')}>
      <a className="tcard-link" href={'#/tools/' + tool.id}>
        <span className="tcard-ico" aria-hidden="true">{tool.icon}</span>
        <span className="tcard-body">
          <span className="tcard-name">{tool.name}</span>
          {!compact && <span className="tcard-desc">{tool.description}</span>}
          {(showCategory || tool.badge) && (
            <span className="tcard-meta">
              {showCategory && <span className="tcard-cat">{categoryLabel(tool.category)}</span>}
              {tool.badge && <span className={'dc-badge tcard-badge ' + (tool.badge.tone === 'ok' ? 'dc-available' : 'dc-in-development')}>{tool.badge.label}</span>}
            </span>
          )}
        </span>
      </a>
      <button
        className="tcard-fav"
        type="button"
        aria-pressed={fav}
        aria-label={(fav ? 'Hapus dari favorit: ' : 'Tambah ke favorit: ') + tool.name}
        onClick={() => onToggleFav(tool.id)}
      >
        <span aria-hidden="true">{fav ? '★' : '☆'}</span>
      </button>
    </div>
  );
}

export function ToolGrid({ list, favs, onToggleFav, compact, showCategory }: { list: ToolDefinition[]; favs: string[]; onToggleFav: (id: string) => void; compact?: boolean; showCategory?: boolean }) {
  return (
    <div className="tgrid">
      {list.map((t) => (
        <ToolCard key={t.id} tool={t} fav={favs.includes(t.id)} onToggleFav={onToggleFav} compact={compact} showCategory={showCategory} />
      ))}
    </div>
  );
}
