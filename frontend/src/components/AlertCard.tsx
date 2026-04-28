import { formatDistanceToNow } from 'date-fns';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alert: Alert;
  account: Account | undefined;
  isSelected: boolean;
  onSelect: (alert: Alert) => void;
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

const AVATAR_BG: Record<Tag, string> = {
  favourite: 'bg-amber-950/60 text-amber-300',
  special:   'bg-violet-950/60 text-violet-300',
  other:     'bg-zinc-800 text-zinc-400',
};

const TAG_PILL: Record<Tag, string> = {
  favourite: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
  special:   'bg-violet-950/60 text-violet-400 border-violet-800/50',
  other:     'bg-zinc-800/60 text-zinc-500 border-zinc-700/50',
};

export function AlertCard({ alert, account, isSelected, onSelect, onMarkArchived, onDelete }: Props) {
  const tag     = account?.tag ?? 'other';
  const isUnread = !alert.is_read;
  const timeAgo  = formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true });

  return (
    <button
      onClick={() => onSelect(alert)}
      className={`w-full text-left relative flex items-center gap-3 px-3 py-3 border-b border-zinc-800/60
                  transition-colors group ${
        isSelected
          ? 'bg-zinc-800'
          : 'hover:bg-zinc-800/50'
      }`}
    >
      {/* Unread stripe */}
      <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity ${
        isUnread ? 'bg-blue-500' : 'opacity-0'
      }`} />

      {/* Avatar */}
      <div className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                       text-sm font-bold uppercase select-none ${AVATAR_BG[tag]}`}>
        {alert.username[0]}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[13px] font-medium truncate ${
            isUnread ? 'text-zinc-100' : 'text-zinc-300'
          }`}>
            @{alert.username}
          </span>
          <span className={`flex-none px-1.5 py-0.5 rounded-full text-[10px] border font-medium ${TAG_PILL[tag]}`}>
            {tag}
          </span>
          <span className="ml-auto flex-none text-[11px] text-zinc-600 whitespace-nowrap">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <span>{alert.story_count} {alert.story_count === 1 ? 'story' : 'stories'}</span>
          {alert.new_ids.length > 0 && (
            <>
              <span className="text-zinc-800">·</span>
              <span className="text-blue-500/70">{alert.new_ids.length} new</span>
            </>
          )}
          {alert.note && (
            <>
              <span className="text-zinc-800">·</span>
              <span className="text-zinc-600 italic truncate max-w-[120px]">{alert.note}</span>
            </>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className={`flex-none flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
        isSelected ? 'opacity-100' : ''
      }`}>
        {!alert.is_archived && (
          <button
            title="Archive"
            onClick={e => { e.stopPropagation(); onMarkArchived(alert.id); }}
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700
                       transition-colors text-xs leading-none"
          >
            ↓
          </button>
        )}
        <button
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(alert.id); }}
          className="p-1.5 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30
                     transition-colors text-xs leading-none"
        >
          ✕
        </button>
      </div>
    </button>
  );
}
