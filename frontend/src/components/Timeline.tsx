import { useMemo } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type { Alert, Account } from '../types';
import { tagColors } from '../lib/tagColors';

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'border-rose-500/60 bg-rose-950/20',
  normal: 'border-zinc-700',
  low:    'border-zinc-800/60',
};

function groupByDay(alerts: Alert[]) {
  const groups = new Map<string, Alert[]>();
  alerts.forEach(a => {
    const d   = new Date(a.detected_at);
    const key = isToday(d)     ? 'Today'
              : isYesterday(d) ? 'Yesterday'
              : format(d, 'MMMM d, yyyy');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  });
  return groups;
}

interface Props {
  alerts:          Alert[];
  accounts:        Map<string, Account>;
  onSelectAccount: (username: string) => void;
}

export function Timeline({ alerts, accounts, onSelectAccount }: Props) {
  const sorted = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()),
    [alerts],
  );
  const grouped = useMemo(() => groupByDay(sorted), [sorted]);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <span className="text-[15px] font-medium text-zinc-100 flex-1">📱 Activity Timeline</span>
        <span className="text-xs text-zinc-500">{sorted.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-24">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-zinc-600">No activity yet.</p>
          </div>
        ) : [...grouped.entries()].map(([day, dayAlerts]) => (
          <div key={day} className="animate-fade-up">
            {/* Day label */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{day}</span>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[11px] text-zinc-700">{dayAlerts.length}</span>
            </div>

            {/* Events */}
            <div className="space-y-2">
              {dayAlerts.map(alert => {
                const tag    = accounts.get(alert.username)?.tag ?? 'other';
                const colors = tagColors(tag);
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                                hover:bg-zinc-800/50 cursor-pointer ${PRIORITY_COLOR[alert.priority ?? 'normal']}`}
                    onClick={() => onSelectAccount(alert.username)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                     text-xs font-bold uppercase flex-none ${colors.avatar}`}>
                      {alert.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-200 truncate">@{alert.username}</span>
                        <span className={`flex-none px-1.5 py-0.5 rounded-full text-[10px] border ${colors.pillActive}`}>
                          {tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {alert.story_count} {alert.story_count === 1 ? 'story' : 'stories'}
                        {alert.new_ids.length > 0 && (
                          <span className="text-blue-400/70 ml-1">· {alert.new_ids.length} new</span>
                        )}
                      </div>
                    </div>
                    <span className="flex-none text-[11px] text-zinc-600 whitespace-nowrap">
                      {formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })}
                    </span>
                    {alert.priority === 'urgent' && (
                      <span className="flex-none w-1.5 h-1.5 rounded-full bg-rose-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
