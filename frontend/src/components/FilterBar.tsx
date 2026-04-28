import type { Filters, Tag, SortField, SortDir } from '../types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const TAGS: { value: Tag; label: string; active: string }[] = [
  { value: 'favourite', label: 'Favourite', active: 'bg-rose-600 text-white border-transparent' },
  { value: 'special',   label: 'Special',   active: 'bg-violet-600 text-white border-transparent' },
  { value: 'other',     label: 'Other',     active: 'bg-zinc-600 text-white border-transparent' },
];

export function FilterBar({ filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const toggleTag = (tag: Tag) =>
    set({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter(t => t !== tag)
        : [...filters.tags, tag],
    });

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search username..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100
                     placeholder-zinc-500 focus:outline-none focus:border-rose-500 w-44 transition-colors"
        />

        <div className="flex gap-1">
          {TAGS.map(t => (
            <button
              key={t.value}
              onClick={() => toggleTag(t.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                filters.tags.includes(t.value)
                  ? t.active
                  : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.showRead}
              onChange={e => set({ showRead: e.target.checked })}
              className="accent-rose-500"
            />
            Show read
          </label>

          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.showArchived}
              onChange={e => set({ showArchived: e.target.checked })}
              className="accent-rose-500"
            />
            Archived
          </label>

          <select
            value={`${filters.sortField}:${filters.sortDir}`}
            onChange={e => {
              const [sortField, sortDir] = e.target.value.split(':') as [SortField, SortDir];
              set({ sortField, sortDir });
            }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300
                       focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="detected_at:desc">Newest first</option>
            <option value="detected_at:asc">Oldest first</option>
            <option value="username:asc">Username A–Z</option>
            <option value="username:desc">Username Z–A</option>
            <option value="story_count:desc">Most stories</option>
          </select>
        </div>
      </div>
    </div>
  );
}
