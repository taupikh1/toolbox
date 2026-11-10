import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { categories, tools, type ToolDefinition } from './tools/registry';
import { searchTools } from './lib/search';
import { useHashRoute, useMediaQuery, useOffline, useTheme } from './hooks';
import { SEARCH_SUGGESTIONS, categoryFromSlug, categoryIcon, categoryIntro, categoryLabel, categorySlug, groupCategories, parseRoute } from './nav';
import { Sidebar } from './components/Sidebar';
import { ToolGrid } from './components/ToolCard';
import {
  clearHistory,
  getFavorites,
  getHistory,
  isHistoryEnabled,
  recordToolOpen,
  setHistoryEnabled,
  toggleFavorite,
} from './services/storage';

const APP_VERSION = '0.5.0';
const realCategories = categories.filter((c) => c !== 'All Tools');

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec">
      <div className="sec-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const routeStr = useHashRoute();
  const r = useMemo(() => parseRoute(routeStr), [routeStr]);
  const { theme, toggle } = useTheme();
  const { online, ready } = useOffline();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<string[]>(() => getFavorites());
  const [hist, setHist] = useState(() => getHistory());
  const [histOn, setHistOn] = useState(() => isHistoryEnabled());
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  const sideRef = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);

  const tool = r.kind === 'tool' ? tools.find((t) => t.id === r.id) : undefined;
  const Tool = tool?.component;
  const catName = r.kind === 'category' ? categoryFromSlug(realCategories, r.slug) : undefined;
  const routeKey = r.kind + ('slug' in r ? r.slug : '') + ('id' in r ? r.id : '');

  // Riwayat: catat saat tool dibuka.
  useEffect(() => {
    if (tool) {
      recordToolOpen(tool.id);
      setHist(getHistory());
    }
  }, [tool?.id]);

  // Perubahan rute: tutup drawer, bersihkan pencarian bila keluar dari hasil pencarian, perbarui judul, pindahkan fokus ke konten.
  useEffect(() => {
    setOpen(false);
    if (r.kind !== 'search' && r.kind !== 'tool') setQ('');
    const label =
      r.kind === 'tool' ? tool?.name
        : r.kind === 'category' ? (catName ? categoryLabel(catName) : undefined)
          : r.kind === 'favorites' ? 'Favorit'
            : r.kind === 'recent' ? 'Terakhir dibuka'
              : r.kind === 'search' ? 'Cari'
                : undefined;
    document.title = label ? `${label} · Toolbox Offline` : 'Toolbox Offline';
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (document.activeElement === searchRef.current) return; // jangan curi fokus saat mengetik
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [routeKey]);

  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  // Drawer mobile: Escape menutup, Tab terkurung di dalam drawer, scroll latar dikunci.
  useEffect(() => {
    if (!open || isDesktop) return;
    const side = sideRef.current;
    const focusables = () => Array.from(side?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtn.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, isDesktop]);

  const menuExpanded = isDesktop ? !collapsed : open;
  const toggleMenu = () => {
    if (isDesktop) {
      const n = !collapsed;
      setCollapsed(n);
      try { localStorage.setItem('sidebarCollapsed', n ? '1' : '0'); } catch { /* tetap jalan tanpa penyimpanan */ }
    } else {
      setOpen((o) => !o);
    }
  };
  const closeDrawer = () => {
    setOpen(false);
    menuBtn.current?.focus();
  };

  const onSearch = (v: string) => {
    setQ(v);
    if (v.trim()) {
      if (r.kind !== 'search') location.hash = '/search';
    } else if (r.kind === 'search') {
      location.hash = '/';
    }
  };

  const onToggleFav = (id: string) => setFavs(toggleFavorite(id));

  const byId = (ids: string[]) => ids.map((id) => tools.find((t) => t.id === id)).filter((t): t is ToolDefinition => !!t);
  const favTools = useMemo(() => byId(favs), [favs]);
  const recentTools = useMemo(() => byId(hist.map((h) => h.id)).slice(0, 12), [hist]);
  const results = useMemo(() => searchTools(tools, q), [q]);
  const groups = useMemo(() => groupCategories(categories), []);

  const conn = online ? 'Online' : 'Offline';
  const cache = ready ? (online ? 'siap offline ✓' : 'siap dipakai ✓') : online ? 'menyiapkan cache…' : 'cache belum lengkap';

  const homeLink = (
    <a className="back" href="#/">← Beranda</a>
  );

  let view: ReactNode;
  if (r.kind === 'home') {
    view = (
      <>
        <div className="hero">
          <h1>Semua utilitas, di perangkatmu</h1>
          <p className="muted">File tidak dikirim ke server. Badge pada kartu menandai fitur yang belum penuh.</p>
        </div>
        {favTools.length > 0 && (
          <Section title="Favorit" action={favTools.length > 6 ? <a className="sec-link" href="#/favorites">Lihat semua ({favTools.length})</a> : undefined}>
            <ToolGrid list={favTools.slice(0, 6)} favs={favs} onToggleFav={onToggleFav} compact />
          </Section>
        )}
        {histOn && recentTools.length > 0 && (
          <Section title="Terakhir dibuka" action={<a className="sec-link" href="#/recent">Kelola riwayat</a>}>
            <ToolGrid list={recentTools.slice(0, 6)} favs={favs} onToggleFav={onToggleFav} compact />
          </Section>
        )}
        <Section title="Kategori">
          {groups.map((g) => (
            <div className="cat-block" key={g.id}>
              <h3 className="cat-group">{g.label}</h3>
              <div className="catgrid">
                {g.categories.map((c) => (
                  <a key={c} className="catcard" href={'#/category/' + categorySlug(c)}>
                    <span className="catcard-ico" aria-hidden="true">{categoryIcon(c)}</span>
                    <span className="catcard-name">{categoryLabel(c)}</span>
                    <small className="muted">{tools.filter((t) => t.category === c).length} tool</small>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </Section>
        <Section title={`Semua tools (${tools.length})`}>
          <ToolGrid list={tools} favs={favs} onToggleFav={onToggleFav} compact />
        </Section>
        <footer className="app-info">
          <p>
            <b>Toolbox Offline</b> v{APP_VERSION}. Tanpa akun dan tanpa server.
          </p>
          <p>
            Status jaringan: {conn}, {cache}. Word, Excel, dan sebagian PDF/PowerPoint sudah bisa dijalankan dengan keterbatasan yang tertulis di halaman masing-masing. OCR butuh model bahasa. Audio/video butuh unduhan FFmpeg. Local AI tidak punya model.
          </p>
        </footer>
      </>
    );
  } else if (r.kind === 'search') {
    view = (
      <>
        <h1>Hasil pencarian</h1>
        {!q.trim() ? (
          <p className="muted">Ketik nama tool, fungsi, atau format, misalnya “word ke pdf”.</p>
        ) : results.length ? (
          <>
            <p className="muted" role="status">{results.length} tool cocok dengan “{q.trim()}”.</p>
            <ToolGrid list={results} favs={favs} onToggleFav={onToggleFav} />
          </>
        ) : (
          <div className="empty" role="status">
            <p><b>Tidak ada tool yang cocok dengan “{q.trim()}”.</b></p>
            <p className="muted">Coba kata kunci lain, nama format (pdf, docx, xlsx, jpg), atau salah satu contoh ini:</p>
            <div className="chips">
              {SEARCH_SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => onSearch(s)}>{s}</button>
              ))}
            </div>
            <p className="muted">Atau <a href="#/">jelajahi kategori di beranda</a>.</p>
          </div>
        )}
      </>
    );
  } else if (r.kind === 'favorites') {
    view = (
      <>
        {homeLink}
        <h1>★ Favorit</h1>
        {favTools.length ? (
          <ToolGrid list={favTools} favs={favs} onToggleFav={onToggleFav} />
        ) : (
          <div className="empty">
            <p><b>Belum ada favorit.</b></p>
            <p className="muted">Ketuk ☆ pada kartu tool untuk menyimpannya di sini.</p>
          </div>
        )}
      </>
    );
  } else if (r.kind === 'recent') {
    view = (
      <>
        {homeLink}
        <h1>🕘 Terakhir dibuka</h1>
        <div className="row-ctl">
          <label className="chk">
            <input
              type="checkbox"
              checked={histOn}
              onChange={(e) => {
                setHistoryEnabled(e.target.checked);
                setHistOn(e.target.checked);
              }}
            />
            Simpan riwayat di perangkat ini
          </label>
          <button
            className="btn sm"
            type="button"
            onClick={() => {
              clearHistory();
              setHist([]);
            }}
          >
            Hapus riwayat
          </button>
        </div>
        {histOn && recentTools.length ? (
          <ToolGrid list={recentTools} favs={favs} onToggleFav={onToggleFav} />
        ) : (
          <div className="empty">
            <p><b>{histOn ? 'Belum ada tool yang dibuka.' : 'Riwayat dinonaktifkan.'}</b></p>
            <p className="muted">{histOn ? 'Tool yang kamu buka akan muncul di sini.' : 'Aktifkan “Simpan riwayat” untuk mencatat tool yang dibuka.'}</p>
          </div>
        )}
      </>
    );
  } else if (r.kind === 'category' && catName) {
    const list = tools.filter((t) => t.category === catName);
    view = (
      <>
        {homeLink}
        <h1>{categoryIcon(catName)} {categoryLabel(catName)}</h1>
        <p className="muted">{categoryIntro(catName) || `${list.length} tool.`}</p>
        <ToolGrid list={list} favs={favs} onToggleFav={onToggleFav} showCategory={false} />
      </>
    );
  } else if (r.kind === 'tool' && tool && Tool) {
    const isFav = favs.includes(tool.id);
    view = (
      <>
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="#/">Beranda</a>
          <span aria-hidden="true">›</span>
          <a href={'#/category/' + categorySlug(tool.category)}>{categoryLabel(tool.category)}</a>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{tool.name}</span>
        </nav>
        <div className="tool-head">
          <h1>
            <span aria-hidden="true">{tool.icon}</span> {tool.name}
          </h1>
          <button className="btn sm" type="button" aria-pressed={isFav} onClick={() => onToggleFav(tool.id)}>
            {isFav ? '★ Favorit' : '☆ Favorit'}
          </button>
        </div>
        <p className="muted">{tool.description}</p>
        <Suspense fallback={<p className="muted" role="status">Memuat…</p>}>
          <Tool />
        </Suspense>
      </>
    );
  } else {
    view = (
      <>
        {homeLink}
        <h1>Halaman tidak ditemukan</h1>
        <p className="muted">Alamat ini tidak cocok dengan tool atau kategori mana pun.</p>
      </>
    );
  }

  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '')}>
      <a className="skip" href="#main-content" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>Lewati ke konten</a>
      <header className="topbar">
        <button
          ref={menuBtn}
          className="icon-btn"
          type="button"
          aria-label={menuExpanded ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuExpanded}
          aria-controls="sidebar"
          onClick={toggleMenu}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <a className="top-logo" href="#/" aria-label="Toolbox Offline"><span aria-hidden="true">🧰</span> <span className="brand-long">Toolbox</span></a>
        <div className="top-search" role="search">
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari tool, mis. pdf ke word, kompres gambar"
            aria-label="Cari tool"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
        <span className={'pill ' + (online ? 'is-on' : 'is-off')} role="status" title={`${conn}, ${cache}`}>
          <span className="dot" aria-hidden="true" />
          <span>{conn}</span>
          <span className="pill-sub">· {cache}</span>
        </span>
        <button
          className="icon-btn"
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
      </header>
      <Sidebar
        ref={sideRef}
        tools={tools}
        categories={categories}
        route={r}
        favCount={favs.length}
        showRecent
        open={open}
        onNavigate={() => setOpen(false)}
        onClose={closeDrawer}
      />
      <div className={'scrim' + (open && !isDesktop ? ' show' : '')} onClick={closeDrawer} aria-hidden="true" />
      <main className="main" id="main-content" ref={mainRef} tabIndex={-1}>
        {view}
      </main>
    </div>
  );
}
