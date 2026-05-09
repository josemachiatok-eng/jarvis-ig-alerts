import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Account, Page } from '../types';
import { tagColors } from '../lib/tagColors';

interface Props {
  totalCount:    number;
  unreadCount:   number;
  archivedCount: number;
  tagCounts:     Map<string, number>;
  allTags:       string[];
  accountCounts: Map<string, number>;
  lastActive:    Map<string, string>;
  accounts:      Map<string, Account>;
  currentView:   string;
  currentPage:   Page;
  onViewChange:  (v: string) => void;
  onPageChange:  (p: Page, account?: string) => void;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
      {label}
    </p>
  );
}

function NavBtn({ icon, label, count, active, onClick, muted }: {
  icon?: string; label: string; count?: number; active: boolean; onClick: () => void; muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px]
                  transition-colors mb-0.5 ${
        active ? 'bg-zinc-800 text-zinc-100 font-medium'
               : muted ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
               : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {icon && <span className="text-[12px]">{icon}</span>}
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-[11px] tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  totalCount, unreadCount, archivedCount, tagCounts, allTags,
  accountCounts, lastActive, accounts, currentView, currentPage,
  onViewChange, onPageChange,
}: Props) {
  const [open, setOpen] = useState(true);

  const sortedAccounts = [...accountCounts.entries()].sort((a, b) => b[1] - a[1]);

  const pinnedAccounts = sortedAccounts.filter(([u]) => accounts.get(u)?.is_pinned);
  const watchedAccounts = sortedAccounts.filter(([u]) => accounts.get(u)?.is_watched);

  // Unique collections
  const collections = [...new Set(
    [...accounts.values()].map(a => a.collection).filter(Boolean) as string[]
  )].sort();

  const collectionCounts = new Map<string, number>();
  sortedAccounts.forEach(([u, cnt]) => {
    const col = accounts.get(u)?.collection;
    if (col) collectionCounts.set(col, (collectionCounts.get(col) ?? 0) + cnt);
  });

  const isDashboard = currentPage === 'dashboard';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {!open && (
        <button
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setOpen(true)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        flex flex-col flex-shrink-0 bg-zinc-900 border-r border-zinc-800 overflow-hidden
        transition-all duration-200 z-30
        ${open ? 'w-[220px]' : 'w-0 md:w-[220px]'}
        fixed md:relative h-full md:h-auto
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-zinc-100 tracking-tight">Jarvis</span>
            <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-0.5">IG Alerts</span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-zinc-700 hover:text-zinc-500 md:hidden text-sm"
            >✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Pinned accounts */}
          {pinnedAccounts.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <SectionLabel label="📌 Pinned" />
              {pinnedAccounts.map(([username]) => {
                const tag    = accounts.get(username)?.tag ?? 'other';
                const colors = tagColors(tag);
                const last   = lastActive.get(username);
                const active = isDashboard && currentView === username;
                return (
                  <button
                    key={username}
                    onClick={() => { onPageChange('dashboard'); onViewChange(username); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px]
                                transition-colors mb-0.5 ${
                      active ? 'bg-zinc-800 text-zinc-100'
                             : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className="flex-1 text-left truncate">@{username}</span>
                    {last && (
                      <span className="text-[10px] text-zinc-700 whitespace-nowrap">
                        {formatDistanceToNow(new Date(last), { addSuffix: false })}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="mx-0 border-t border-zinc-800 mt-2 mb-0" />
            </div>
          )}

          {/* Views */}
          <div className="px-3 pt-3 pb-1">
            <SectionLabel label="Views" />
            <NavBtn label="All alerts" count={totalCount}   active={isDashboard && currentView === 'all'}    onClick={() => { onPageChange('dashboard'); onViewChange('all'); }} />
            <NavBtn label="Unread"     count={unreadCount}  active={isDashboard && currentView === 'unread'} onClick={() => { onPageChange('dashboard'); onViewChange('unread'); }} />
            {watchedAccounts.length > 0 && (
              <NavBtn icon="👁" label="Watching" count={watchedAccounts.reduce((s, [, c]) => s + c, 0)}
                active={isDashboard && currentView === '__watched'}
                onClick={() => { onPageChange('dashboard'); onViewChange('__watched'); }} />
            )}
            <NavBtn icon="🗄" label="Archive" count={archivedCount} muted
              active={currentPage === 'archive'}
              onClick={() => onPageChange('archive')} />
          </div>

          {/* Collections */}
          {collections.length > 0 && (
            <>
              <div className="mx-3 border-t border-zinc-800 my-2" />
              <div className="px-3 pb-1">
                <SectionLabel label="Collections" />
                {collections.map(col => (
                  <NavBtn key={col}
                    label={col}
                    count={collectionCounts.get(col)}
                    active={isDashboard && currentView === `__col:${col}`}
                    onClick={() => { onPageChange('dashboard'); onViewChange(`__col:${col}`); }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <>
              <div className="mx-3 border-t border-zinc-800 my-2" />
              <div className="px-3 pb-1">
                <SectionLabel label="Tags" />
                {allTags.map(tag => {
                  const colors = tagColors(tag);
                  const active = isDashboard && currentView === tag;
                  return (
                    <button key={tag}
                      onClick={() => { onPageChange('dashboard'); onViewChange(tag); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px]
                                  transition-colors mb-0.5 ${
                        active ? 'bg-zinc-800 text-zinc-100 font-medium'
                               : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <span className="flex-1 text-left truncate">{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                      <span className={`text-[11px] tabular-nums ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {tagCounts.get(tag) ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Accounts */}
          <div className="mx-3 border-t border-zinc-800 my-2" />
          <div className="px-3 pb-2">
            <SectionLabel label="Accounts" />
            {sortedAccounts.length === 0 ? (
              <p className="px-1 text-[12px] text-zinc-700">No active alerts</p>
            ) : sortedAccounts.map(([username, count]) => {
              const acc    = accounts.get(username);
              const tag    = acc?.tag ?? 'other';
              const colors = tagColors(tag);
              const active = isDashboard && currentView === username;
              const last   = lastActive.get(username);
              const isPaused  = acc?.is_paused;
              const isWatched = acc?.is_watched;
              return (
                <button
                  key={username}
                  onClick={() => { onPageChange('dashboard'); onViewChange(username); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px]
                              transition-colors mb-0.5 ${
                    active ? 'bg-zinc-800 text-zinc-100'
                           : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isPaused ? 'bg-zinc-700' : colors.dot
                  }`} />
                  <span className="flex-1 text-left truncate">
                    {isWatched && <span className="text-[9px] mr-0.5">👁</span>}
                    @{username}
                  </span>
                  {last && (
                    <span className="text-[10px] text-zinc-700 whitespace-nowrap hidden sm:block">
                      {formatDistanceToNow(new Date(last), { addSuffix: false })}
                    </span>
                  )}
                  <span className={`text-[11px] tabular-nums flex-shrink-0 ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explore */}
          <div className="mx-3 border-t border-zinc-800 my-2" />
          <div className="px-3 pb-4">
            <SectionLabel label="Explore" />
            <NavBtn icon="📱" label="Timeline"     active={currentPage === 'timeline'}   onClick={() => onPageChange('timeline')} />
            <NavBtn icon="🖼" label="Media Library" active={currentPage === 'media'}      onClick={() => onPageChange('media')} />
            <NavBtn icon="🏆" label="Leaderboard"   active={currentPage === 'leaderboard'} onClick={() => onPageChange('leaderboard')} />
            <NavBtn icon="⚙" label="Manage Accounts" muted active={currentPage === 'manage'} onClick={() => onPageChange('manage')} />
          </div>
        </div>
      </div>

      {/* Mobile hamburger (shown when sidebar is closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-3 left-3 z-40 md:hidden p-2 rounded-lg bg-zinc-800 border border-zinc-700
                     text-zinc-300 hover:text-zinc-100 text-sm"
        >☰</button>
      )}
    </>
  );
}
