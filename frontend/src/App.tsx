import { useMemo, useState } from 'react';
import { useAlerts } from './hooks/useAlerts';
import { AuthGate } from './components/AuthGate';
import { Sidebar } from './components/Sidebar';
import { AlertList } from './components/AlertList';
import { DetailPanel } from './components/DetailPanel';
import { supabase } from './lib/supabase';
import type { Alert, Tag, View } from './types';

type TagFilter = 'all' | Tag | 'unread';
type SortMode  = 'time' | 'account' | 'count';

function Dashboard() {
  const {
    allAlerts, accounts, loading, error,
    markRead, markArchived, deleteAlert, updateNote, updateAccountTag, markAllRead,
  } = useAlerts();

  const [view,        setView]        = useState<View | string>('all');
  const [tagFilter,   setTagFilter]   = useState<TagFilter>('all');
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState<SortMode>('time');
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

  // ── Derived counts for sidebar ────────────────────────────────
  const active = useMemo(() => allAlerts.filter(a => !a.is_archived), [allAlerts]);

  const counts = useMemo(() => ({
    all:      active.length,
    favourite: active.filter(a => accounts.get(a.username)?.tag === 'favourite').length,
    special:  active.filter(a => accounts.get(a.username)?.tag === 'special').length,
    unread:   active.filter(a => !a.is_read).length,
  }), [active, accounts]);

  const accountCounts = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach(a => map.set(a.username, (map.get(a.username) ?? 0) + 1));
    return map;
  }, [active]);

  // ── Filtered + sorted list ────────────────────────────────────
  const filtered = useMemo(() => {
    let list = active;

    // Sidebar view
    if (view === 'favourite') list = list.filter(a => accounts.get(a.username)?.tag === 'favourite');
    else if (view === 'special') list = list.filter(a => accounts.get(a.username)?.tag === 'special');
    else if (view === 'unread')  list = list.filter(a => !a.is_read);
    else if (view !== 'all')     list = list.filter(a => a.username === view);

    // Chip filter
    if (tagFilter === 'favourite') list = list.filter(a => accounts.get(a.username)?.tag === 'favourite');
    else if (tagFilter === 'special') list = list.filter(a => accounts.get(a.username)?.tag === 'special');
    else if (tagFilter === 'other')   list = list.filter(a => accounts.get(a.username)?.tag === 'other');
    else if (tagFilter === 'unread')  list = list.filter(a => !a.is_read);

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.username.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...list];
    if (sort === 'account') sorted.sort((a, b) => a.username.localeCompare(b.username));
    else if (sort === 'count') sorted.sort((a, b) => b.story_count - a.story_count);
    else sorted.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());

    return sorted;
  }, [active, view, tagFilter, search, sort, accounts]);

  // ── Stats ─────────────────────────────────────────────────────
  const today = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    return active.filter(a => new Date(a.detected_at).getTime() > cutoff).length;
  }, [active]);

  const uniqueAccounts = useMemo(
    () => new Set(active.map(a => a.username)).size,
    [active],
  );

  // ── Selected alert ────────────────────────────────────────────
  const selectedAlert = useMemo(
    () => allAlerts.find(a => a.id === selectedId) ?? null,
    [allAlerts, selectedId],
  );

  const handleSelect = (alert: Alert) => {
    setSelectedId(alert.id);
    if (!alert.is_read) markRead(alert.id);
  };

  const viewTitles: Record<string, string> = {
    all: 'All alerts', favourite: 'Favourites', special: 'Special', unread: 'Unread',
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <Sidebar
        counts={counts}
        accountCounts={accountCounts}
        accounts={accounts}
        currentView={view}
        onViewChange={v => { setView(v); setSelectedId(null); }}
      />

      {/* ── Main column ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
          <span className="text-[15px] font-medium text-zinc-100 flex-1">
            {viewTitles[view] ?? `@${view}`}
          </span>
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-52 px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-800
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
          {counts.unread > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-[5px] rounded-lg border border-zinc-700 bg-transparent
                         text-xs text-zinc-400 hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm px-1"
          >
            ⏻
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0">
          {[
            { num: active.length,   lbl: 'Total' },
            { num: today,           lbl: 'Today' },
            { num: uniqueAccounts,  lbl: 'Accounts' },
            { num: counts.unread,   lbl: 'Unread' },
          ].map(({ num, lbl }) => (
            <div key={lbl} className="text-center">
              <div className="text-lg font-medium text-zinc-100 leading-tight">{num}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{lbl}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
          <span className="text-[11px] text-zinc-600">Filter:</span>
          {([
            { v: 'all',       label: 'All' },
            { v: 'favourite', label: 'Favourite' },
            { v: 'special',   label: 'Special' },
            { v: 'other',     label: 'Other' },
            { v: 'unread',    label: 'Unread' },
          ] as { v: TagFilter; label: string }[]).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setTagFilter(v)}
              className={`px-3 py-[3px] rounded-full border text-[11px] transition-all ${
                tagFilter === v
                  ? v === 'favourite'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-700/50'
                    : v === 'special'
                    ? 'bg-violet-950/60 text-violet-400 border-violet-700/50'
                    : v === 'unread'
                    ? 'bg-blue-950/60 text-blue-400 border-blue-700/50'
                    : 'bg-zinc-700 text-zinc-100 border-zinc-600'
                  : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
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
            onSelect={handleSelect}
            onMarkArchived={markArchived}
            onDelete={deleteAlert}
            onTagChange={updateAccountTag}
          />
        )}
      </div>

      {/* ── Detail panel ──────────────────────────────────── */}
      <DetailPanel
        alert={selectedAlert}
        account={selectedAlert ? accounts.get(selectedAlert.username) : undefined}
        onMarkArchived={markArchived}
        onDelete={(id) => { deleteAlert(id); setSelectedId(null); }}
        onUpdateNote={updateNote}
        onTagChange={updateAccountTag}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
