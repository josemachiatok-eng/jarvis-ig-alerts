import type { Account } from '../types';
import { tagColors } from '../lib/tagColors';

interface Props {
  totalCount: number;
  unreadCount: number;
  tagCounts: Map<string, number>;
  allTags: string[];
  accountCounts: Map<string, number>;
  accounts: Map<string, Account>;
  currentView: string;
  onViewChange: (v: string) => void;
}

function NavBtn({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px]
                  transition-colors mb-0.5 ${
        active ? 'bg-zinc-800 text-zinc-100 font-medium'
               : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      <span>{label}</span>
      <span className={`text-[11px] tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
        {count}
      </span>
    </button>
  );
}

export function Sidebar({
  totalCount, unreadCount, tagCounts, allTags,
  accountCounts, accounts, currentView, onViewChange,
}: Props) {
  const sortedAccounts = [...accountCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-100 tracking-tight">Jarvis</span>
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-0.5">IG Alerts</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Views */}
        <div className="px-3 pt-4 pb-1">
          <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Views</p>
          <NavBtn label="All alerts" count={totalCount}   active={currentView === 'all'}    onClick={() => onViewChange('all')} />
          <NavBtn label="Unread"     count={unreadCount}  active={currentView === 'unread'} onClick={() => onViewChange('unread')} />
        </div>

        <div className="mx-3 border-t border-zinc-800 my-2" />

        {/* Tags */}
        <div className="px-3 pb-1">
          <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Tags</p>
          {allTags.length === 0 ? (
            <p className="px-1 text-[12px] text-zinc-700">No tags yet</p>
          ) : allTags.map(tag => {
            const colors = tagColors(tag);
            const active = currentView === tag;
            const count  = tagCounts.get(tag) ?? 0;
            const label  = tag.charAt(0).toUpperCase() + tag.slice(1);
            return (
              <button
                key={tag}
                onClick={() => onViewChange(tag)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px]
                            transition-colors mb-0.5 ${
                  active ? 'bg-zinc-800 text-zinc-100 font-medium'
                         : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                <span className="flex-1 text-left truncate">{label}</span>
                <span className={`text-[11px] tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-3 border-t border-zinc-800 my-2" />

        {/* Accounts */}
        <div className="px-3 pb-4">
          <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Accounts</p>
          {sortedAccounts.length === 0 ? (
            <p className="px-1 text-[12px] text-zinc-700">No active alerts</p>
          ) : sortedAccounts.map(([username, count]) => {
            const tag    = accounts.get(username)?.tag ?? 'other';
            const colors = tagColors(tag);
            const active = currentView === username;
            return (
              <button
                key={username}
                onClick={() => onViewChange(username)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px]
                            transition-colors mb-0.5 ${
                  active ? 'bg-zinc-800 text-zinc-100'
                         : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                <span className="flex-1 text-left truncate">@{username}</span>
                <span className={`text-[11px] tabular-nums flex-shrink-0 ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
