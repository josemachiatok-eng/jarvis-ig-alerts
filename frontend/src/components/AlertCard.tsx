import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alert: Alert;
  account: Account | undefined;
  onMarkRead: (id: string) => void;
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenNote: (alert: Alert) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

const TAG_BADGE: Record<Tag, string> = {
  favourite: 'bg-rose-600/20 text-rose-400 border-rose-600/30',
  special:   'bg-violet-600/20 text-violet-400 border-violet-600/30',
  other:     'bg-zinc-700/50 text-zinc-500 border-zinc-600/30',
};

const AVATAR_BG: Record<Tag, string> = {
  favourite: 'bg-rose-600/20 text-rose-400',
  special:   'bg-violet-600/20 text-violet-400',
  other:     'bg-zinc-800 text-zinc-400',
};

const TAG_OPTIONS: { value: Tag; label: string }[] = [
  { value: 'favourite', label: 'Favourite' },
  { value: 'special',   label: 'Special' },
  { value: 'other',     label: 'Other' },
];

export function AlertCard({
  alert,
  account,
  onMarkRead,
  onMarkArchived,
  onDelete,
  onOpenNote,
  onTagChange,
}: Props) {
  const [tagMenu, setTagMenu] = useState(false);
  const tag     = account?.tag ?? 'other';
  const timeAgo = formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true });
  const isNew   = !alert.is_read && !alert.is_archived;

  return (
    <div
      className={`relative rounded-xl border transition-all ${
        alert.is_archived
          ? 'bg-zinc-900/30 border-zinc-800/60 opacity-55'
          : isNew
          ? 'bg-zinc-900 border-zinc-700 shadow-sm'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Unread stripe */}
      {isNew && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-rose-500 rounded-full" />
      )}

      <div className="p-3 pl-4 flex gap-3 items-start">
        {/* Avatar */}
        <div
          className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                      text-xs font-bold uppercase select-none ${AVATAR_BG[tag]}`}
        >
          {alert.username[0]}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://www.instagram.com/stories/${alert.username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold text-sm hover:text-rose-400 transition-colors ${
                isNew ? 'text-zinc-100' : 'text-zinc-300'
              }`}
              onClick={() => { if (isNew) onMarkRead(alert.id); }}
            >
              @{alert.username}
            </a>

            {/* Tag badge — click to open tag picker */}
            <div className="relative">
              <button
                onClick={() => setTagMenu(v => !v)}
                className={`px-2 py-0.5 rounded-full text-xs border font-medium transition-colors ${TAG_BADGE[tag]}`}
              >
                {tag}
              </button>
              {tagMenu && (
                <>
                  {/* Click-away overlay */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setTagMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-zinc-800 border border-zinc-700
                                  rounded-xl shadow-xl overflow-hidden min-w-[110px]">
                    {TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { onTagChange(alert.username, opt.value); setTagMenu(false); }}
                        className={`block w-full text-left px-3 py-2 text-xs transition-colors
                                    hover:bg-zinc-700 ${
                                      tag === opt.value ? 'text-zinc-100 font-medium' : 'text-zinc-400'
                                    }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="text-xs text-zinc-500">
              {alert.story_count} story item{alert.story_count !== 1 ? 's' : ''}
              {alert.new_ids.length > 0 && ` · ${alert.new_ids.length} new`}
            </span>

            <span className="text-xs text-zinc-600 ml-auto whitespace-nowrap">{timeAgo}</span>
          </div>

          {alert.note && (
            <p className="mt-1 text-xs text-zinc-400 italic line-clamp-2 leading-relaxed">
              {alert.note}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-none flex gap-0.5 mt-0.5">
          {isNew && (
            <button
              title="Mark read"
              onClick={() => onMarkRead(alert.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800
                         transition-colors text-sm leading-none"
            >
              ✓
            </button>
          )}
          <button
            title={alert.note ? 'Edit note' : 'Add note'}
            onClick={() => onOpenNote(alert)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800
                       transition-colors text-sm leading-none"
          >
            ✎
          </button>
          {alert.is_archived ? (
            <button
              title="Delete permanently"
              onClick={() => onDelete(alert.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30
                         transition-colors text-sm leading-none"
            >
              ✕
            </button>
          ) : (
            <button
              title="Archive"
              onClick={() => onMarkArchived(alert.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800
                         transition-colors text-sm leading-none"
            >
              ↓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
