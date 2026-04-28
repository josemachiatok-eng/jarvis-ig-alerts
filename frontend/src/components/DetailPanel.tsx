import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alert: Alert | null;
  account: Account | undefined;
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

const AVATAR_BG: Record<Tag, string> = {
  favourite: 'bg-amber-950/60 text-amber-300',
  special:   'bg-violet-950/60 text-violet-300',
  other:     'bg-zinc-800 text-zinc-300',
};

const TAG_BTNS: { value: Tag; label: string; active: string }[] = [
  { value: 'favourite', label: 'Favourite', active: 'bg-amber-950/60 text-amber-400 border-amber-700/50' },
  { value: 'special',   label: 'Special',   active: 'bg-violet-950/60 text-violet-400 border-violet-700/50' },
  { value: 'other',     label: 'Other',     active: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
];

export function DetailPanel({ alert, account, onMarkArchived, onDelete, onUpdateNote, onTagChange }: Props) {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(alert?.note ?? '');
  }, [alert?.id, alert?.note]);

  if (!alert) {
    return (
      <div className="w-[300px] flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50
                      flex items-center justify-center">
        <p className="text-zinc-700 text-sm">Select an alert</p>
      </div>
    );
  }

  const tag     = account?.tag ?? 'other';
  const timeAgo = formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true });
  const fullDate = format(new Date(alert.detected_at), 'MMM d, yyyy · HH:mm');

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50
                    flex flex-col overflow-hidden">

      {/* Avatar + username header */}
      <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4 border-b border-zinc-800 flex-shrink-0">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center
                         text-xl font-bold uppercase select-none ${AVATAR_BG[tag]}`}>
          {alert.username[0]}
        </div>
        <div className="text-center">
          <a
            href={`https://www.instagram.com/${alert.username}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-semibold text-zinc-100 hover:text-zinc-300 transition-colors"
          >
            @{alert.username}
          </a>
          {account?.display_name && (
            <p className="text-xs text-zinc-500 mt-0.5">{account.display_name}</p>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Metadata */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Details</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Stories',  value: alert.story_count },
              { label: 'New',      value: alert.new_ids.length },
              { label: 'Detected', value: timeAgo, full: true },
              { label: 'Date',     value: fullDate, full: true },
            ].filter(x => !x.full).map(({ label, value }) => (
              <div key={label} className="bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
                <div className="text-base font-semibold text-zinc-100">{value}</div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 bg-zinc-800/50 rounded-lg px-3 py-2">
            <div className="text-xs text-zinc-400">{timeAgo}</div>
            <div className="text-[10px] text-zinc-600">{fullDate}</div>
          </div>
        </div>

        {/* Tag picker */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Tag</p>
          <div className="flex gap-1.5">
            {TAG_BTNS.map(({ value, label, active: activeStyle }) => (
              <button
                key={value}
                onClick={() => onTagChange(alert.username, value)}
                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  tag === value
                    ? activeStyle
                    : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Note</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => {
              if (note !== (alert.note ?? '')) onUpdateNote(alert.id, note);
            }}
            placeholder="Add a note…"
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50
                       text-xs text-zinc-300 placeholder-zinc-700 resize-none
                       focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Story IDs preview */}
        {alert.new_ids.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              New Story IDs
            </p>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {alert.new_ids.map(id => (
                <p key={id} className="text-[10px] text-zinc-600 font-mono truncate">{id}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex gap-2">
        <a
          href={`https://www.instagram.com/stories/${alert.username}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                     hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-center"
        >
          View Stories
        </a>
        {!alert.is_archived && (
          <button
            onClick={() => onMarkArchived(alert.id)}
            title="Archive"
            className="px-3 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Archive
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          title="Delete permanently"
          className="px-3 py-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-600
                     hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
        >
          Delete
        </button>
      </div>

    </div>
  );
}
