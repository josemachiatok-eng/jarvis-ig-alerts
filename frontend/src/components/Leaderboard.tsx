import { useMemo, useState } from 'react';
import type { Alert, Account } from '../types';
import { tagColors } from '../lib/tagColors';

type Period = '7d' | '30d' | 'all';

interface Props {
  alerts:          Alert[];
  accounts:        Map<string, Account>;
  onViewAccount:   (username: string) => void;
}

export function Leaderboard({ alerts, accounts, onViewAccount }: Props) {
  const [period, setPeriod] = useState<Period>('30d');

  const rows = useMemo(() => {
    const cutoff = period === 'all' ? null
      : new Date(Date.now() - (period === '7d' ? 7 : 30) * 86_400_000);

    const filtered = cutoff
      ? alerts.filter(a => new Date(a.detected_at) >= cutoff)
      : alerts;

    const map = new Map<string, { count: number; alerts: number; lastAt: string }>();
    filtered.forEach(a => {
      const r = map.get(a.username) ?? { count: 0, alerts: 0, lastAt: a.detected_at };
      r.count  += a.story_count;
      r.alerts += 1;
      if (a.detected_at > r.lastAt) r.lastAt = a.detected_at;
      map.set(a.username, r);
    });

    return [...map.entries()]
      .map(([username, r]) => ({ username, ...r }))
      .sort((a, b) => b.count - a.count);
  }, [alerts, period]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <span className="text-[15px] font-medium text-zinc-100 flex-1">🏆 Leaderboard</span>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[11px] border transition-colors ${
                period === p ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                             : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {p === 'all' ? 'All time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-24">
            <p className="text-2xl mb-2">🏆</p>
            <p className="text-sm text-zinc-600">No data for this period.</p>
          </div>
        ) : rows.map((row, i) => {
          const tag    = accounts.get(row.username)?.tag ?? 'other';
          const colors = tagColors(tag);
          const isTop3 = i < 3;
          return (
            <button
              key={row.username}
              onClick={() => onViewAccount(row.username)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5
                         border border-zinc-800/60 hover:bg-zinc-800/50 hover:border-zinc-700
                         transition-colors group animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Rank */}
              <div className="flex-none w-8 text-center">
                {isTop3
                  ? <span className="text-lg">{medals[i]}</span>
                  : <span className="text-[13px] font-medium text-zinc-600">#{i + 1}</span>
                }
              </div>

              {/* Avatar */}
              <div className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                               text-sm font-bold uppercase ${colors.avatar}`}>
                {row.username[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-zinc-200 truncate">@{row.username}</div>
                <div className="text-[11px] text-zinc-600">
                  {row.alerts} {row.alerts === 1 ? 'alert' : 'alerts'}
                </div>
              </div>

              {/* Bar */}
              <div className="flex-none w-24 hidden sm:block">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isTop3 ? 'bg-amber-400' : 'bg-zinc-600'}`}
                    style={{ width: `${Math.round((row.count / (rows[0]?.count || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Count */}
              <div className="flex-none text-right">
                <div className={`text-[15px] font-semibold ${isTop3 ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {row.count}
                </div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide">stories</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
