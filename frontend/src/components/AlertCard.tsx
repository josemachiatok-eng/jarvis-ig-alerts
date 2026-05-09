import { formatDistanceToNow } from 'date-fns';
import type { Alert, Account } from '../types';
import { tagColors } from '../lib/tagColors';

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500',
  normal: 'bg-transparent',
  low:    'bg-zinc-700',
};
const PRIORITY_RING: Record<string, string> = {
  urgent: 'ring-1 ring-rose-500/30',
  normal: '',
  low:    '',
};

interface Props {
  alert:         Alert;
  account:       Account | undefined;
  isSelected:    boolean;
  isGridView:    boolean;
  bulkSelected:  boolean;
  bulkMode:      boolean;
  onSelect:      (alert: Alert) => void;
  onMarkArchived:(id: string) => void;
  onDelete:      (id: string) => void;
  onBulkToggle:  (id: string) => void;
  thumbUrl?:     string;
}

export function AlertCard({
  alert, account, isSelected, isGridView, bulkSelected, bulkMode,
  onSelect, onMarkArchived, onDelete, onBulkToggle, thumbUrl,
}: Props) {
  const tag      = account?.tag ?? 'other';
  const colors   = tagColors(tag);
  const isUnread = !alert.is_read;
  const priority = alert.priority ?? 'normal';
  const timeAgo  = formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true });

  // ── Grid card ─────────────────────────────────────────────────
  if (isGridView) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer group
                    transition-all ${isSelected ? 'ring-2 ring-zinc-400' : 'hover:ring-2 hover:ring-zinc-600'}
                    ${PRIORITY_RING[priority]}`}
        onClick={() => bulkMode ? onBulkToggle(alert.id) : onSelect(alert)}
      >
        {/* Background: thumbnail or gradient */}
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className={`w-full h-full ${colors.avatar} opacity-40`} />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Unread dot */}
        {isUnread && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
        )}

        {/* Priority dot */}
        {priority === 'urgent' && (
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-rose-500" />
        )}

        {/* Bulk checkbox */}
        {(bulkMode || bulkSelected) && (
          <div className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center
                           transition-colors ${bulkSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/60 bg-black/20'}`}>
            {bulkSelected && <span className="text-white text-xs leading-none">✓</span>}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <div className="text-[12px] font-semibold text-white truncate">@{alert.username}</div>
          <div className="text-[10px] text-white/60 mt-0.5">
            {alert.story_count} stories · {timeAgo}
          </div>
        </div>
      </div>
    );
  }

  // ── List card ─────────────────────────────────────────────────
  return (
    <button
      onClick={() => bulkMode ? onBulkToggle(alert.id) : onSelect(alert)}
      className={`w-full text-left relative flex items-center gap-3 px-3 py-3 border-b border-zinc-800/60
                  transition-colors group ${
        isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
      }`}
    >
      {/* Unread stripe */}
      <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity ${
        isUnread ? 'bg-blue-500' : 'opacity-0'
      }`} />

      {/* Bulk checkbox */}
      {bulkMode && (
        <div
          className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            bulkSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'
          }`}
          onClick={e => { e.stopPropagation(); onBulkToggle(alert.id); }}
        >
          {bulkSelected && <span className="text-white text-[9px] leading-none">✓</span>}
        </div>
      )}

      {/* Priority dot */}
      <div className={`absolute right-2.5 top-2.5 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />

      {/* Avatar */}
      <div className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                       text-sm font-bold uppercase select-none ${colors.avatar}`}>
        {alert.username[0]}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[13px] font-medium truncate ${isUnread ? 'text-zinc-100' : 'text-zinc-300'}`}>
            @{alert.username}
          </span>
          <span className={`flex-none px-1.5 py-0.5 rounded-full text-[10px] border font-medium ${colors.pillActive}`}>
            {tag}
          </span>
          <span className="ml-auto flex-none text-[11px] text-zinc-600 whitespace-nowrap pr-3">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
          <span>{alert.story_count} {alert.story_count === 1 ? 'story' : 'stories'}</span>
          {alert.new_ids.length > 0 && (
            <><span className="text-zinc-800">·</span><span className="text-blue-500/70">{alert.new_ids.length} new</span></>
          )}
          {alert.note && (
            <><span className="text-zinc-800">·</span><span className="text-zinc-600 italic truncate max-w-[100px]">{alert.note}</span></>
          )}
        </div>
      </div>

      {/* Hover actions (hidden in bulk mode) */}
      {!bulkMode && (
        <div className={`flex-none flex gap-0.5 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {!alert.is_archived && (
            <button
              title="Archive"
              onClick={e => { e.stopPropagation(); onMarkArchived(alert.id); }}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors text-xs"
            >↓</button>
          )}
          <button
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete(alert.id); }}
            className="p-1.5 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors text-xs"
          >✕</button>
        </div>
      )}
    </button>
  );
}
