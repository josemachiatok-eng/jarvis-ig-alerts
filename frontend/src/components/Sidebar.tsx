import type { Account, Tag, View } from '../types';

interface Props {
  counts: { all: number; favourite: number; special: number; unread: number };
  accountCounts: Map<string, number>;
  accounts: Map<string, Account>;
  currentView: View | string;
  onViewChange: (v: string) => void;
}

const DOT: Record<Tag, string> = {
  favourite: 'bg-amber-400',
  special:   'bg-violet-400',
  other:     'bg-zinc-600',
};

const NAV_ITEMS: { v: string; label: string; key: keyof Props['counts'] }[] = [
  { v: 'all',       label: 'All alerts', key: 'all'       },
  { v: 'favourite', label: 'Favourites', key: 'favourite' },
  { v: 'special',   label: 'Special',    key: 'special'   },
  { v: 'unread',    label: 'Unread',     key: 'unread'    },
];

export function Sidebar({ counts, accountCounts, accounts, currentView, onViewChange }: Props) {
  const sortedAccounts = [...accountCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-100 tracking-tight">Jarvis</span>
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-0.5">IG Alerts</span>
        </div>
      </div>

      {/* Views */}
      <div className="px-3 pt-4 pb-2">
        <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Views</p>
        {NAV_ITEMS.map(({ v, label, key }) => {
          const active = currentView === v;
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px]
                          transition-colors mb-0.5 ${
                active
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[11px] tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 border-t border-zinc-800 my-1" />

      {/* Accounts */}
      <div className="px-3 pt-2 flex flex-col min-h-0 flex-1">
        <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest flex-shrink-0">
          Accounts
        </p>
        <div className="overflow-y-auto flex-1 -mr-1 pr-1">
          {sortedAccounts.length === 0 ? (
            <p className="px-1 text-[12px] text-zinc-700">No active alerts</p>
          ) : (
            sortedAccounts.map(([username, count]) => {
              const tag  = accounts.get(username)?.tag ?? 'other';
              const active = currentView === username;
              return (
                <button
                  key={username}
                  onClick={() => onViewChange(username)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px]
                              transition-colors mb-0.5 ${
                    active
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[tag]}`} />
                  <span className="flex-1 text-left truncate">@{username}</span>
                  <span className={`text-[11px] tabular-nums flex-shrink-0 ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
