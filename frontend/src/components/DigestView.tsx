import { formatDistanceToNow } from 'date-fns';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alerts: Alert[];
  accounts: Map<string, Account>;
}

interface GroupedEntry {
  username: string;
  tag: Tag;
  latestAlert: Alert;
  totalAlerts: number;
  unreadCount: number;
}

const TAG_ORDER: Tag[] = ['favourite', 'special', 'other'];

const TAG_LABELS: Record<Tag, string> = {
  favourite: 'Favourites',
  special:   'Special',
  other:     'Others',
};

const TAG_HEADING: Record<Tag, string> = {
  favourite: 'text-rose-400',
  special:   'text-violet-400',
  other:     'text-zinc-500',
};

const AVATAR_BG: Record<Tag, string> = {
  favourite: 'bg-rose-600/20 text-rose-400',
  special:   'bg-violet-600/20 text-violet-400',
  other:     'bg-zinc-800 text-zinc-400',
};

export function DigestView({ alerts, accounts }: Props) {
  const active = alerts.filter(a => !a.is_archived);

  // Aggregate by username
  const byUser = new Map<string, Alert[]>();
  active.forEach(a => {
    const list = byUser.get(a.username) ?? [];
    list.push(a);
    byUser.set(a.username, list);
  });

  const entries: GroupedEntry[] = [];
  byUser.forEach((list, username) => {
    const tag = (accounts.get(username)?.tag ?? 'other') as Tag;
    const sorted = [...list].sort(
      (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime(),
    );
    entries.push({
      username,
      tag,
      latestAlert:  sorted[0],
      totalAlerts:  list.length,
      unreadCount:  list.filter(a => !a.is_read).length,
    });
  });

  const byTag = new Map<Tag, GroupedEntry[]>(TAG_ORDER.map(t => [t, []]));
  entries.forEach(e => byTag.get(e.tag)!.push(e));

  if (entries.length === 0) {
    return (
      <div className="text-center py-24 text-zinc-600">
        <p className="text-3xl mb-3">📊</p>
        <p className="text-sm">No alerts to summarise yet.</p>
      </div>
    );
  }

  const totalUnread = entries.reduce((s, e) => s + e.unreadCount, 0);

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <span>{entries.length} accounts with active alerts</span>
        {totalUnread > 0 && (
          <span className="bg-rose-600/20 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full">
            {totalUnread} unread
          </span>
        )}
      </div>

      {TAG_ORDER.map(tag => {
        const group = (byTag.get(tag) ?? []).sort((a, b) => b.unreadCount - a.unreadCount);
        if (group.length === 0) return null;
        const sectionUnread = group.reduce((s, e) => s + e.unreadCount, 0);

        return (
          <section key={tag}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className={`text-xs font-bold uppercase tracking-widest ${TAG_HEADING[tag]}`}>
                {TAG_LABELS[tag]}
              </h2>
              <span className="text-xs text-zinc-700">{group.length} accounts</span>
              {sectionUnread > 0 && (
                <span className="ml-auto text-xs text-rose-400">
                  {sectionUnread} unread
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.map(entry => (
                <DigestCard key={entry.username} entry={entry} avatarBg={AVATAR_BG[tag]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DigestCard({
  entry,
  avatarBg,
}: {
  entry: GroupedEntry;
  avatarBg: string;
}) {
  const timeAgo = formatDistanceToNow(new Date(entry.latestAlert.detected_at), {
    addSuffix: true,
  });

  return (
    <a
      href={`https://www.instagram.com/stories/${entry.username}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800
                 rounded-xl hover:border-zinc-700 transition-colors group"
    >
      <div
        className={`flex-none w-9 h-9 rounded-full flex items-center justify-center
                    text-xs font-bold uppercase select-none ${avatarBg}`}
      >
        {entry.username[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium group-hover:text-rose-400 transition-colors truncate">
          @{entry.username}
        </p>
        <p className="text-xs text-zinc-600 truncate">
          {entry.totalAlerts} alert{entry.totalAlerts !== 1 ? 's' : ''} · {timeAgo}
        </p>
      </div>

      {entry.unreadCount > 0 && (
        <span
          className="flex-none text-xs bg-rose-600 text-white font-bold
                     px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
        >
          {entry.unreadCount}
        </span>
      )}
    </a>
  );
}
