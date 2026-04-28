import { useState } from 'react';
import { useAlerts } from './hooks/useAlerts';
import { FilterBar } from './components/FilterBar';
import { AlertList } from './components/AlertList';
import { DigestView } from './components/DigestView';
import { NoteModal } from './components/NoteModal';
import type { Filters, Alert } from './types';

const DEFAULT_FILTERS: Filters = {
  search:       '',
  tags:         [],
  showRead:     true,
  showArchived: false,
  sortField:    'detected_at',
  sortDir:      'desc',
};

type View = 'list' | 'digest';

export default function App() {
  const [filters,    setFilters]    = useState<Filters>(DEFAULT_FILTERS);
  const [view,       setView]       = useState<View>('list');
  const [noteTarget, setNoteTarget] = useState<Alert | null>(null);

  const {
    alerts,
    allAlerts,
    accounts,
    loading,
    error,
    unreadCount,
    markRead,
    markArchived,
    deleteAlert,
    updateNote,
    updateAccountTag,
    markAllRead,
  } = useAlerts(filters);

  const handleNoteSave = async (id: string, note: string) => {
    await updateNote(id, note);
    setNoteTarget(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3
                         flex items-center gap-3">
        <span className="text-lg select-none">📸</span>
        <h1 className="text-base font-bold tracking-tight">Story Alerts</h1>

        {unreadCount > 0 && (
          <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Mark all read
            </button>
          )}

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(['list', 'digest'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Filters ────────────────────────────────────────── */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-600 text-sm">
            Loading…
          </div>
        ) : error ? (
          <div className="text-rose-400 text-sm text-center py-12">
            <p className="font-medium mb-1">Could not connect to Supabase</p>
            <p className="text-xs text-rose-500/70">{error}</p>
          </div>
        ) : view === 'digest' ? (
          <DigestView alerts={allAlerts} accounts={accounts} />
        ) : (
          <AlertList
            alerts={alerts}
            accounts={accounts}
            onMarkRead={markRead}
            onMarkArchived={markArchived}
            onDelete={deleteAlert}
            onOpenNote={setNoteTarget}
            onTagChange={updateAccountTag}
          />
        )}
      </main>

      {/* ── Note modal ─────────────────────────────────────── */}
      {noteTarget && (
        <NoteModal
          alert={noteTarget}
          onSave={handleNoteSave}
          onClose={() => setNoteTarget(null)}
        />
      )}
    </div>
  );
}
