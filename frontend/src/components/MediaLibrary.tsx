import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { StoryFile, Account } from '../types';
import { tagColors } from '../lib/tagColors';

type MediaFilter = 'all' | 'images' | 'videos';

async function downloadMedia(url: string, filename: string) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

interface Props {
  accounts: Map<string, Account>;
}

export function MediaLibrary({ accounts }: Props) {
  const [files,      setFiles]      = useState<StoryFile[]>([]);
  const [urls,       setUrls]       = useState<Map<string, string>>(new Map());
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<MediaFilter>('all');
  const [fullscreen, setFullscreen] = useState<{ file: StoryFile; url: string } | null>(null);
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('story_files')
        .select('*')
        .order('taken_at', { ascending: false })
        .limit(500);

      const items = (data ?? []) as StoryFile[];
      setFiles(items);

      const map = new Map<string, string>();
      const BATCH = 100;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        const { data: signed } = await supabase.storage
          .from('stories')
          .createSignedUrls(batch.map(f => f.storage_path), 3600);
        if (signed) signed.forEach((s, idx) => {
          if (s.signedUrl) map.set(batch[idx].id, s.signedUrl);
        });
      }
      setUrls(map);
      setLoading(false);
    }
    load();
  }, []);

  const visible = files.filter(f => {
    if (filter === 'images' && f.is_video)  return false;
    if (filter === 'videos' && !f.is_video) return false;
    if (search && !f.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0 flex-wrap gap-y-2">
        <span className="text-[15px] font-medium text-zinc-100">🖼 Media Library</span>
        <span className="text-xs text-zinc-500 flex-1">{visible.length} files</span>
        <input
          type="text"
          placeholder="Filter by account…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-40 px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-800
                     text-xs text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:border-zinc-500 transition-colors"
        />
        <div className="flex gap-1">
          {(['all', 'images', 'videos'] as MediaFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-[5px] rounded-lg text-[11px] border transition-colors ${
                filter === f ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                             : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? 'All' : f === 'images' ? '🖼 Images' : '🎬 Videos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Loading media…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-2xl mb-2">🖼</p>
            <p className="text-sm text-zinc-600">No media matches your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
            {visible.map(f => {
              const url    = urls.get(f.id);
              const tag    = accounts.get(f.username)?.tag ?? 'other';
              const colors = tagColors(tag);
              if (!url) return null;
              return (
                <button
                  key={f.id}
                  onClick={() => setFullscreen({ file: f, url })}
                  className="relative rounded-lg overflow-hidden bg-zinc-800 aspect-[9/16]
                             hover:ring-2 hover:ring-zinc-500 transition-all group"
                >
                  {f.is_video ? (
                    <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  {f.is_video && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">▶</div>
                    </div>
                  )}
                  {/* Account badge on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent
                                  p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-full flex-none ${colors.dot}`} />
                      <span className="text-[9px] text-white/80 truncate">@{f.username}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && (() => {
        const { file: f, url } = fullscreen;
        const ext      = f.is_video ? 'mp4' : 'jpg';
        const ts       = f.taken_at ?? f.created_at;
        const stamp    = ts ? format(new Date(ts), 'yyyy-MM-dd_HH-mm-ss') : 'unknown';
        const filename = `${f.username}_${stamp}.${ext}`;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-3 animate-fade-in"
            onClick={() => setFullscreen(null)}
          >
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40">
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-xs">@{f.username}</span>
                {ts && <span className="text-white/40 text-xs">{format(new Date(ts), 'MMM d, yyyy · HH:mm')}</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={e => { e.stopPropagation(); downloadMedia(url, filename); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10
                             hover:bg-white/20 text-white text-xs transition-colors"
                >↓ Download</button>
                <button
                  onClick={() => setFullscreen(null)}
                  className="text-white/60 hover:text-white text-xl px-1"
                >✕</button>
              </div>
            </div>
            {f.is_video ? (
              <video src={url} controls muted className="max-h-[85vh] max-w-full rounded-xl"
                     onClick={e => e.stopPropagation()} />
            ) : (
              <img src={url} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain"
                   onClick={e => e.stopPropagation()} />
            )}
          </div>
        );
      })()}
    </div>
  );
}
