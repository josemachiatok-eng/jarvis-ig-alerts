import { useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Alert, Account } from '../types';
import { tagColors } from '../lib/tagColors';

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500',
  normal: 'bg-zinc-600',
  low:    'bg-zinc-800',
};

interface Props {
  username:   string;
  alerts:     Alert[];
  account:    Account | undefined;
  selectedId: string | null;
  onSelect:   (a: Alert) => void;
  onBack:     () => void;
}

export function AccountHistory({ username, alerts, account, selectedId, onSelect, onBack }: Props) {
  const sorted = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()),
    [alerts],
  );

  const tag    = account?.tag ?? 'other';
  const colors = tagColors(tag);
  const total  = sorted.reduce((s, a) => s + a.story_count, 0);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm px-1"
        >←</button>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase ${colors.avatar}`}>
          {username[0]}
        </div>
        <span className="text-[15px] font-medium text-zinc-100 flex-1">@{username}</span>
        <span className="text-xs text-zinc-500">{sorted.length} alerts · {total} stories total</span>
      </div>

      {/* Stats strip */}
      {sorted.length > 0 && (
        <div className="flex gap-6 px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0">
          {[
            { num: sorted.length,                     lbl: 'Alerts'   },
            { num: total,                             lbl: 'Stories'  },
            { num: sorted.filter(a => !a.is_archived).length, lbl: 'Active'   },
            { num: sorted.filter(a => a.is_archived).length,  lbl: 'Archived' },
          ].map(({ num, lbl }) => (
            <div key={lbl} className="text-center">
              <div className="text-lg font-medium text-zinc-100 leading-tight">{num}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-zinc-600">No alerts found for @{username}.</p>
          </div>
        ) : sorted.map((alert, i) => (
          <button
            key={alert.id}
            onClick={() => onSelect(alert)}
            className={`w-full text-left relative flex items-start gap-3 px-4 py-3 border-b border-zinc-800/60
                        transition-colors group ${
              alert.id === selectedId ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
            }`}
          >
            {/* Timeline line */}
            <div className="flex flex-col items-center gap-1 flex-none pt-1">
              <div className={`w-2 h-2 rounded-full flex-none ${PRIORITY_DOT[alert.priority ?? 'normal']}`} />
              {i < sorted.length - 1 && (
                <div className="w-px flex-1 min-h-[24px] bg-zinc-800" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[12px] font-medium ${alert.is_archived ? 'text-zinc-500' : 'text-zinc-200'}`}>
                  {alert.story_count} {alert.story_count === 1 ? 'story' : 'stories'}
                  {alert.new_ids.length > 0 && (
                    <span className="text-blue-400/70 ml-1">+{alert.new_ids.length} new</span>
                  )}
                </span>
                {alert.is_archived && (
                  <span className="text-[10px] text-zinc-600 border border-zinc-700 px-1 rounded">archived</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-600">
                {format(new Date(alert.detected_at), 'MMM d, yyyy · HH:mm')}
                <span className="ml-1 text-zinc-700">
                  ({formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true })})
                </span>
              </div>
              {alert.note && (
                <div className="text-[11px] text-zinc-500 italic mt-0.5 truncate">{alert.note}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
