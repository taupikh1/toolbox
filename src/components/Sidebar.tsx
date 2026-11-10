import { forwardRef } from 'react';
import type { ToolDefinition } from '../tools/registry';
import { EXPANDED_CATEGORIES, SETTINGS_SHORTCUT_ID, categoryIcon, categoryLabel, categorySlug, groupCategories, type Route } from '../nav';

interface Props {
  tools: ToolDefinition[];
  categories: string[];
  route: Route;
  favCount: number;
  showRecent: boolean;
  open: boolean;
  onNavigate: () => void;
  onClose: () => void;
}

export const Sidebar = forwardRef<HTMLElement, Props>(function Sidebar({ tools, categories, route, favCount, showRecent, open, onNavigate, onClose }, ref) {
  const groups = groupCategories(categories);
  const countOf = (c: string) => tools.filter((t) => t.category === c).length;
  const cur = (on: boolean) => (on ? ('page' as const) : undefined);

  return (
    <aside className={'side' + (open ? ' open' : '')} id="sidebar" ref={ref} aria-label="Menu utama">
      <div className="side-head">
        <a className="logo" href="#/" onClick={onNavigate}>
          <span aria-hidden="true">🧰</span> Toolbox Offline
        </a>
        <button className="icon-btn side-close" type="button" onClick={onClose} aria-label="Tutup menu">
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <nav className="side-nav" aria-label="Navigasi">
        <ul className="nav-list">
          <li><a className="nav-link" href="#/" aria-current={cur(route.kind === 'home')} onClick={onNavigate}><span aria-hidden="true">🏠</span>Beranda</a></li>
          <li><a className="nav-link" href="#/favorites" aria-current={cur(route.kind === 'favorites')} onClick={onNavigate}><span aria-hidden="true">★</span>Favorit{favCount > 0 && <small className="nav-count">{favCount}</small>}</a></li>
          {showRecent && (
            <li><a className="nav-link" href="#/recent" aria-current={cur(route.kind === 'recent')} onClick={onNavigate}><span aria-hidden="true">🕘</span>Terakhir dibuka</a></li>
          )}
        </ul>
        {groups.map((g) => (
          <div className="nav-group" key={g.id} role="group" aria-labelledby={'ng-' + g.id}>
            <h2 className="nav-title" id={'ng-' + g.id}>{g.label}</h2>
            <ul className="nav-list">
              {g.categories.map((c) => {
                const slug = categorySlug(c);
                const expanded = EXPANDED_CATEGORIES.includes(c);
                return (
                  <li key={c}>
                    <a className="nav-link" href={'#/category/' + slug} aria-current={cur(route.kind === 'category' && route.slug === slug)} onClick={onNavigate}>
                      <span aria-hidden="true">{categoryIcon(c)}</span>{categoryLabel(c)}<small className="nav-count">{countOf(c)}</small>
                    </a>
                    {expanded && (
                      <ul className="nav-sub" aria-label={'Submenu ' + categoryLabel(c)}>
                        {tools.filter((t) => t.category === c).map((t) => (
                          <li key={t.id}>
                            <a className="nav-link sub" href={'#/tools/' + t.id} aria-current={cur(route.kind === 'tool' && route.id === t.id)} onClick={onNavigate}>
                              <span aria-hidden="true">{t.icon}</span>{t.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <ul className="nav-list nav-foot">
          <li><a className="nav-link" href={'#/tools/' + SETTINGS_SHORTCUT_ID} aria-current={cur(route.kind === 'tool' && route.id === SETTINGS_SHORTCUT_ID)} onClick={onNavigate}><span aria-hidden="true">⚙️</span>Pengaturan &amp; Backup</a></li>
        </ul>
      </nav>
    </aside>
  );
});
