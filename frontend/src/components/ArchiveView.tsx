import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Alert, Account } from '../types';
import { tagColors } from '../lib/tagColors';

interface Props {
  alerts:       Alert[];
  accounts:     Map<string, Account>;
  selectedId:   string | null;
  onSelect:     (a: Alert) => void;
  onUnarchive:  (id: string) => void;
  onDelete:     (id: string) => void;
}

export function ArchiveView({ alerts, accounts, selectedId, onSelect, onUnarchive, onDelete }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts.filter(a =>
      a.username.toLowerCase().includes(q) ||
      (a.note ?? '').toLowerCase().includes(q)
    );
  }, [alerts, search]);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <span className="text-[15px] font-medium text-zinc-100 flex-1">🗄 Archive</span>
        <span className="text-xs text-zinc-500">{alerts.length} alerts</span>
        <input
          type="text"
          placeholder="Search archive…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-44 px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-800
                     text-xs text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-2xl mb-2">🗄</p>
            <p className="text-sm text-zinc-600">
              {search ? 'No archived alerts match your search.' : 'Nothing archived yet.'}
            </p>
          </div>
        ) : filtered.map(alert => {
          const tag    = accounts.get(alert.username)?.tag ?? 'other';
          const colors = tagColors(tag);
          return (
            <button
              key={alert.id}
              onClick={() => onSelect(alert)}
              className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-zinc-800/60
                          transition-colors group ${
                alert.id === selectedId ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
              }`}
            >
              <div className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                               text-sm font-bold uppercase select-none opacity-60 ${colors.avatar}`}>
                {alert.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-zinc-400 truncate">@{alert.username}</span>
                  <span className="ml-auto flex-none text-[11px] text-zinc-600 whitespace-nowrap">
                    {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-600">
                  {alert.story_count} {alert.story_count === 1 ? 'story' : 'stories'}
                  {alert.note && <span className="italic ml-2 truncate">· {alert.note}</span>}
                </div>
              </div>
              <div className="flex-none flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  title="Restore"
                  onClick={e => { e.stopPropagation(); onUnarchive(alert.id); }}
                  className="px-2 py-1 rounded-md text-[10px] border border-zinc-700
                             text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Restore
                </button>
                <button
                  title="Delete permanently"
                  onClick={e => { e.stopPropagation(); onDelete(alert.id); }}
                  className="p-1.5 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30
                             transition-colors text-xs"
                >✕</button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
