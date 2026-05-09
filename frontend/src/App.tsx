import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useAlerts } from './hooks/useAlerts';
import { AuthGate } from './components/AuthGate';
import { Sidebar } from './components/Sidebar';
import { AlertList } from './components/AlertList';
import { DetailPanel } from './components/DetailPanel';
import { ArchiveView } from './components/ArchiveView';
import { AccountHistory } from './components/AccountHistory';
import { Timeline } from './components/Timeline';
import { MediaLibrary } from './components/MediaLibrary';
import { Leaderboard } from './components/Leaderboard';
import { AccountManagement } from './components/AccountManagement';
import { supabase } from './lib/supabase';
import { downloadAllAsZip, type ZipProgress } from './lib/downloadZip';
import type { Alert, Page, DateRange } from './types';

type SortMode    = 'time' | 'account' | 'count';
type MediaFilter = 'all' | 'has_media' | 'no_media';

const BUILT_IN_ORDER = ['favourite', 'special', 'other'];

function inRange(date: string, range: DateRange): boolean {
  if (range.preset === 'all') return true;
  const d = new Date(date).getTime();
  const now = Date.now();
  if (range.preset === 'today')  return d > now - 86_400_000;
  if (range.preset === '7d')     return d > now - 7  * 86_400_000;
  if (range.preset === '30d')    return d > now - 30 * 86_400_000;
  if (range.preset === 'custom') {
    if (range.from && d < range.from.getTime()) return false;
    if (range.to   && d > range.to.getTime() + 86_400_000) return false;
    return true;
  }
  return true;
}

function Dashboard() {
  const {
    allAlerts, accounts, loading, error,
    markRead, markArchived, unarchive, deleteAlert, updateNote,
    updateAlertPriority, markAllRead, bulkArchive, bulkDelete, bulkMarkRead,
    updateAccount, updateAccountTag,
  } = useAlerts();

  const [page,           setPage]           = useState<Page>('dashboard');
  const [historyAccount, setHistoryAccount] = useState<string | null>(null);
  const [view,           setView]           = useState('all');
  const [search,         setSearch]         = useState('');
  const [sort,           setSort]           = useState<SortMode>('time');
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [isGridView,     setIsGridView]     = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [dateRange,      setDateRange]      = useState<DateRange>({ preset: 'all', from: null, to: null });
  const [mediaFilter,    setMediaFilter]    = useState<MediaFilter>('all');
  const [zipProgress,    setZipProgress]    = useState<ZipProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Derived data ──────────────────────────────────────────────
  const active   = useMemo(() => allAlerts.filter(a => !a.is_archived), [allAlerts]);
  const archived = useMemo(() => allAlerts.filter(a =>  a.is_archived), [allAlerts]);

  const unreadCount = useMemo(() => active.filter(a => !a.is_read).length, [active]);

  // Document title with unread count
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Jarvis` : 'Jarvis';
  }, [unreadCount]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach(a => {
      const tag = accounts.get(a.username)?.tag ?? 'other';
      map.set(tag, (map.get(tag) ?? 0) + 1);
    });
    return map;
  }, [active, accounts]);

  const allTags = useMemo(() => {
    const custom: string[] = [];
    accounts.forEach(acc => {
      if (!BUILT_IN_ORDER.includes(acc.tag) && !custom.includes(acc.tag)) custom.push(acc.tag);
    });
    custom.sort();
    return [...BUILT_IN_ORDER.filter(t => tagCounts.has(t)), ...custom.filter(t => tagCounts.has(t))];
  }, [accounts, tagCounts]);

  const accountCounts = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach(a => map.set(a.username, (map.get(a.username) ?? 0) + 1));
    return map;
  }, [active]);

  const lastActive = useMemo(() => {
    const map = new Map<string, string>();
    allAlerts.forEach(a => {
      const ex = map.get(a.username);
      if (!ex || a.detected_at > ex) map.set(a.username, a.detected_at);
    });
    return map;
  }, [allAlerts]);

  // ── Filtered + sorted list ────────────────────────────────────
  const filtered = useMemo(() => {
    let list = active;

    if      (view === 'unread')           list = list.filter(a => !a.is_read);
    else if (view === '__watched')        list = list.filter(a => accounts.get(a.username)?.is_watched);
    else if (view.startsWith('__col:'))  list = list.filter(a => accounts.get(a.username)?.collection === view.slice(6));
    else if (view !== 'all')             list = list.filter(a =>
      accounts.get(a.username)?.tag === view || a.username === view);

    // Date range
    list = list.filter(a => inRange(a.detected_at, dateRange));

    // Media filter (approximate: use new_ids as proxy)
    if (mediaFilter === 'has_media')  list = list.filter(a => a.new_ids.length > 0);
    if (mediaFilter === 'no_media')   list = list.filter(a => a.new_ids.length === 0);

    // Search in username + notes
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.username.toLowerCase().includes(q) ||
        (a.note ?? '').toLowerCase().includes(q) ||
        (accounts.get(a.username)?.permanent_note ?? '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sort === 'account') sorted.sort((a, b) => a.username.localeCompare(b.username));
    else if (sort === 'count') sorted.sort((a, b) => b.story_count - a.story_count);
    else sorted.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());

    return sorted;
  }, [active, view, dateRange, mediaFilter, search, sort, accounts]);

  const today = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    return active.filter(a => new Date(a.detected_at).getTime() > cutoff).length;
  }, [active]);

  const uniqueAccounts = useMemo(() => new Set(active.map(a => a.username)).size, [active]);

  const selectedAlert = useMemo(
    () => allAlerts.find(a => a.id === selectedId) ?? null,
    [allAlerts, selectedId],
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleSelect = (alert: Alert) => {
    setSelectedId(alert.id);
    if (!alert.is_read) markRead(alert.id);
  };

  const handleBulkToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handlePageChange = useCallback((p: Page, account?: string) => {
    setPage(p);
    if (account) setHistoryAccount(account);
    setSelectedId(null);
  }, []);

  const handleViewHistory = useCallback((username: string) => {
    setHistoryAccount(username);
    setPage('history');
    setSelectedId(null);
  }, []);

  const handleDownloadZip = useCallback(async () => {
    abortRef.current = new AbortController();
    setZipProgress({ phase: 'fetching', current: 0, total: 0, message: 'Starting…' });
    await downloadAllAsZip(setZipProgress, abortRef.current.signal);
    setTimeout(() => setZipProgress(null), 3_000);
  }, []);

  const viewTitle = page !== 'dashboard'  ? ''
    : view === 'all'    ? 'All alerts'
    : view === 'unread' ? 'Unread'
    : view === '__watched' ? 'Watching'
    : view.startsWith('__col:') ? `📁 ${view.slice(6)}`
    : allTags.includes(view) ? view.charAt(0).toUpperCase() + view.slice(1)
    : `@${view}`;

  // Account history alerts
  const historyAlerts = useMemo(
    () => historyAccount ? allAlerts.filter(a => a.username === historyAccount) : [],
    [allAlerts, historyAccount],
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <Sidebar
        totalCount={active.length}
        unreadCount={unreadCount}
        archivedCount={archived.length}
        tagCounts={tagCounts}
        allTags={allTags}
        accountCounts={accountCounts}
        lastActive={lastActive}
        accounts={accounts}
        currentView={view}
        currentPage={page}
        onViewChange={v => { setView(v); setSelectedId(null); setPage('dashboard'); }}
        onPageChange={handlePageChange}
      />

      {/* ── Main column ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Dashboard view */}
        {page === 'dashboard' && (
          <>
            {/* Topbar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap gap-y-2">
              <span className="text-[15px] font-medium text-zinc-100 flex-1 min-w-0 truncate">{viewTitle}</span>
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-44 px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-800
                           text-xs text-zinc-100 placeholder-zinc-500
                           focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortMode)}
                className="px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-900
                           text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                <option value="time">Newest first</option>
                <option value="account">By account</option>
                <option value="count">By story count</option>
              </select>
              {/* Grid / List toggle */}
              <button
                onClick={() => setIsGridView(v => !v)}
                title={isGridView ? 'List view' : 'Grid view'}
                className={`px-3 py-[5px] rounded-lg border text-xs transition-colors ${
                  isGridView ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                             : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {isGridView ? '≡ List' : '⊞ Grid'}
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="px-3 py-[5px] rounded-lg border border-zinc-700 text-xs text-zinc-400
                             hover:bg-zinc-800 transition-colors whitespace-nowrap">
                  Mark all read
                </button>
              )}
              <button onClick={handleDownloadZip} disabled={zipProgress !== null}
                title="Download all saved media as ZIP"
                className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg border border-zinc-700
                           text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                ↓ ZIP
              </button>
              <button onClick={() => supabase.auth.signOut()} title="Sign out"
                className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm px-1">⏻</button>
            </div>

            {/* Stats bar */}
            <div className="flex gap-6 px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0">
              {[
                { num: active.length,  lbl: 'Total'    },
                { num: today,          lbl: 'Today'    },
                { num: uniqueAccounts, lbl: 'Accounts' },
                { num: unreadCount,    lbl: 'Unread'   },
              ].map(({ num, lbl }) => (
                <div key={lbl} className="text-center">
                  <div className="text-lg font-medium text-zinc-100 leading-tight">{num}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{lbl}</div>
                </div>
              ))}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 overflow-x-auto">
              <span className="text-[11px] text-zinc-600 flex-shrink-0">Tag:</span>
              {[{ v: 'all', label: 'All' }, { v: 'unread', label: 'Unread' },
                ...allTags.map(t => ({ v: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
              ].map(({ v, label }) => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex-shrink-0 px-3 py-[3px] rounded-full border text-[11px] transition-all ${
                    view === v ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                               : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}>
                  {label}
                </button>
              ))}
              <span className="text-zinc-800 flex-shrink-0">|</span>
              <span className="text-[11px] text-zinc-600 flex-shrink-0">Media:</span>
              {([['all', 'All'], ['has_media', 'Has media'], ['no_media', 'No media']] as [MediaFilter, string][]).map(([v, label]) => (
                <button key={v} onClick={() => setMediaFilter(v)}
                  className={`flex-shrink-0 px-3 py-[3px] rounded-full border text-[11px] transition-all ${
                    mediaFilter === v ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                                     : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}>
                  {label}
                </button>
              ))}
              <span className="text-zinc-800 flex-shrink-0">|</span>
              <span className="text-[11px] text-zinc-600 flex-shrink-0">Period:</span>
              {([['all', 'All time'], ['today', 'Today'], ['7d', '7d'], ['30d', '30d']] as [DateRange['preset'], string][]).map(([v, label]) => (
                <button key={v} onClick={() => setDateRange({ preset: v, from: null, to: null })}
                  className={`flex-shrink-0 px-3 py-[3px] rounded-full border text-[11px] transition-all ${
                    dateRange.preset === v ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                                          : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Alert list */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Loading…</div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-rose-400 text-sm">{error}</div>
            ) : (
              <AlertList
                alerts={filtered}
                accounts={accounts}
                selectedId={selectedId}
                isGridView={isGridView}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onMarkArchived={markArchived}
                onDelete={deleteAlert}
                onBulkToggle={handleBulkToggle}
                onBulkArchive={bulkArchive}
                onBulkDelete={bulkDelete}
                onBulkMarkRead={bulkMarkRead}
                onClearSelection={() => setSelectedIds(new Set())}
                onSetZipProgress={setZipProgress}
              />
            )}
          </>
        )}

        {/* Other pages */}
        {page === 'archive' && (
          <ArchiveView
            alerts={archived}
            accounts={accounts}
            selectedId={selectedId}
            onSelect={handleSelect}
            onUnarchive={unarchive}
            onDelete={id => { deleteAlert(id); setSelectedId(null); }}
          />
        )}

        {page === 'history' && historyAccount && (
          <AccountHistory
            username={historyAccount}
            alerts={historyAlerts}
            account={accounts.get(historyAccount)}
            selectedId={selectedId}
            onSelect={handleSelect}
            onBack={() => setPage('dashboard')}
          />
        )}

        {page === 'timeline' && (
          <Timeline
            alerts={active}
            accounts={accounts}
            onSelectAccount={handleViewHistory}
          />
        )}

        {page === 'media' && (
          <MediaLibrary accounts={accounts} />
        )}

        {page === 'leaderboard' && (
          <Leaderboard
            alerts={active}
            accounts={accounts}
            onViewAccount={handleViewHistory}
          />
        )}

        {page === 'manage' && (
          <AccountManagement
            accounts={accounts}
            onUpdateAccount={updateAccount}
          />
        )}
      </div>

      {/* ── Detail panel ──────────────────────────────────── */}
      {(page === 'dashboard' || page === 'archive' || page === 'history') && (
        <DetailPanel
          alert={selectedAlert}
          account={selectedAlert ? accounts.get(selectedAlert.username) : undefined}
          allTags={allTags}
          onMarkArchived={markArchived}
          onUnarchive={unarchive}
          onDelete={id => { deleteAlert(id); setSelectedId(null); }}
          onUpdateNote={updateNote}
          onTagChange={updateAccountTag}
          onUpdateAccount={updateAccount}
          onUpdatePriority={updateAlertPriority}
          onViewHistory={handleViewHistory}
        />
      )}

      {/* ── ZIP download progress modal ───────────────────── */}
      {zipProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[340px] bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-zinc-100">
                {zipProgress.phase === 'done'  ? '✓ Download ready'
               : zipProgress.phase === 'error' ? '✕ Download failed'
               : '↓ Preparing ZIP…'}
              </span>
              {(zipProgress.phase === 'done' || zipProgress.phase === 'error') ? (
                <button onClick={() => setZipProgress(null)} className="text-zinc-500 hover:text-zinc-300 text-lg px-1 leading-none">✕</button>
              ) : (
                <button onClick={() => { abortRef.current?.abort(); setZipProgress(null); }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-700 px-2 py-1 rounded-lg transition-colors">
                  Cancel
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-3">{zipProgress.message}</p>
            {zipProgress.phase !== 'done' && zipProgress.phase !== 'error' && (
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-zinc-400 rounded-full transition-all duration-300"
                  style={{ width: zipProgress.total > 0 ? `${Math.round((zipProgress.current / zipProgress.total) * 100)}%` : '30%' }}
                />
              </div>
            )}
            {zipProgress.total > 0 && zipProgress.phase === 'downloading' && (
              <p className="text-[10px] text-zinc-600 mt-1.5 text-right">
                {zipProgress.current} / {zipProgress.total} files
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AuthGate><Dashboard /></AuthGate>;
}
