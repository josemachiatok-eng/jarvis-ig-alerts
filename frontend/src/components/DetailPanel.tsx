import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Alert, Account, Tag, Priority } from '../types';
import { tagColors } from '../lib/tagColors';
import { supabase } from '../lib/supabase';

interface Props {
  alert:           Alert | null;
  account:         Account | undefined;
  allTags:         string[];
  onMarkArchived:  (id: string) => void;
  onUnarchive:     (id: string) => void;
  onDelete:        (id: string) => void;
  onUpdateNote:    (id: string, note: string) => void;
  onTagChange:     (username: string, tag: Tag) => void;
  onUpdateAccount: (username: string, updates: Partial<Account>) => void;
  onUpdatePriority:(id: string, priority: Priority) => void;
  onViewHistory:   (username: string) => void;
}

async function downloadMedia(url: string, filename: string) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Media gallery ─────────────────────────────────────────────
import type { StoryFile } from '../types';

type MediaType = 'all' | 'images' | 'videos';

function MediaGallery({ alertId, username }: { alertId: string; username: string }) {
  const [files,      setFiles]      = useState<StoryFile[]>([]);
  const [urls,       setUrls]       = useState<Map<string, string>>(new Map());
  const [loading,    setLoading]    = useState(true);
  const [fullscreen, setFullscreen] = useState<StoryFile | null>(null);
  const [mediaType,  setMediaType]  = useState<MediaType>('all');

  useEffect(() => {
    setFiles([]); setUrls(new Map()); setLoading(true);
    supabase.from('story_files').select('*').eq('alert_id', alertId)
      .order('taken_at', { ascending: true })
      .then(async ({ data }) => {
        const items = (data ?? []) as StoryFile[];
        setFiles(items);
        const map = new Map<string, string>();
        await Promise.all(items.map(async f => {
          const { data: signed } = await supabase.storage.from('stories').createSignedUrl(f.storage_path, 3600);
          if (signed?.signedUrl) map.set(f.id, signed.signedUrl);
        }));
        setUrls(map);
        setLoading(false);
      });
  }, [alertId]);

  const visible = files.filter(f => {
    if (mediaType === 'images' && f.is_video)  return false;
    if (mediaType === 'videos' && !f.is_video) return false;
    return true;
  });

  if (loading) return <p className="text-[11px] text-zinc-700 italic">Loading media…</p>;
  if (files.length === 0) return <p className="text-[11px] text-zinc-700 italic">No media stored yet.</p>;

  return (
    <>
      {/* Media type filter */}
      {files.length > 0 && (
        <div className="flex gap-1 mb-2">
          {(['all', 'images', 'videos'] as MediaType[]).map(t => (
            <button key={t}
              onClick={() => setMediaType(t)}
              className={`px-2 py-0.5 rounded-md text-[10px] border transition-colors ${
                mediaType === t ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
                                : 'text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              {t === 'all' ? `All (${files.length})` : t === 'images' ? `🖼 ${files.filter(f => !f.is_video).length}` : `🎬 ${files.filter(f => f.is_video).length}`}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {visible.map(f => {
          const url = urls.get(f.id);
          if (!url) return null;
          return (
            <button key={f.id} onClick={() => setFullscreen(f)}
              className="relative rounded-lg overflow-hidden bg-zinc-800 aspect-[9/16]
                         hover:ring-2 hover:ring-zinc-500 transition-all"
            >
              {f.is_video
                ? <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                : <img   src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              }
              {f.is_video && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-sm">▶</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && (() => {
        const url = urls.get(fullscreen.id);
        if (!url) return null;
        const ts       = fullscreen.taken_at ?? fullscreen.created_at;
        const stamp    = ts ? format(new Date(ts), 'yyyy-MM-dd_HH-mm-ss') : 'unknown';
        const ext      = fullscreen.is_video ? 'mp4' : 'jpg';
        const filename = `${username}_${stamp}.${ext}`;
        return (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-3 animate-fade-in"
               onClick={() => setFullscreen(null)}>
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40">
              <span className="text-white/60 text-xs">@{username}</span>
              <div className="flex items-center gap-3">
                <button onClick={e => { e.stopPropagation(); downloadMedia(url, filename); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
                  ↓ Download
                </button>
                <button onClick={() => setFullscreen(null)} className="text-white/60 hover:text-white text-xl px-1">✕</button>
              </div>
            </div>
            {fullscreen.is_video
              ? <video src={url} controls muted className="max-h-[85vh] max-w-full rounded-xl" onClick={e => e.stopPropagation()} />
              : <img   src={url} alt=""   className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
            }
          </div>
        );
      })()}
    </>
  );
}

// ── Detail panel ──────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; active: string }> = {
  urgent: { label: '🔴 Urgent', dot: 'bg-rose-500',   active: 'bg-rose-950/40 text-rose-300 border-rose-700/50' },
  normal: { label: '⚪ Normal', dot: 'bg-zinc-600',   active: 'bg-zinc-800 text-zinc-300 border-zinc-600' },
  low:    { label: '🔵 Low',    dot: 'bg-blue-800',   active: 'bg-blue-950/30 text-blue-400 border-blue-800/50' },
};

export function DetailPanel({
  alert, account, allTags,
  onMarkArchived, onUnarchive, onDelete, onUpdateNote,
  onTagChange, onUpdateAccount, onUpdatePriority, onViewHistory,
}: Props) {
  const [note,           setNote]           = useState('');
  const [permanentNote,  setPermanentNote]  = useState('');
  const [addingTag,      setAddingTag]      = useState(false);
  const [newTagInput,    setNewTagInput]    = useState('');
  const [addingCol,      setAddingCol]      = useState(false);
  const [colInput,       setColInput]       = useState('');
  const newTagRef = useRef<HTMLInputElement>(null);
  const colRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNote(alert?.note ?? '');
    setPermanentNote(account?.permanent_note ?? '');
    setAddingTag(false); setNewTagInput('');
    setAddingCol(false); setColInput('');
  }, [alert?.id, alert?.note, account?.permanent_note]);

  useEffect(() => { if (addingTag) newTagRef.current?.focus(); }, [addingTag]);
  useEffect(() => { if (addingCol) colRef.current?.focus(); },    [addingCol]);

  if (!alert) {
    return (
      <div className="w-[300px] flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50
                      flex items-center justify-center">
        <p className="text-zinc-700 text-sm">Select an alert</p>
      </div>
    );
  }

  const tag      = account?.tag ?? 'other';
  const colors   = tagColors(tag);
  const timeAgo  = formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true });
  const fullDate = format(new Date(alert.detected_at), 'MMM d, yyyy · HH:mm');
  const priority = alert.priority ?? 'normal';

  const handleNewTag = () => {
    const t = newTagInput.trim().toLowerCase();
    if (t) { onTagChange(alert.username, t); setAddingTag(false); setNewTagInput(''); }
  };

  const tagOptions = allTags.includes(tag) ? allTags : [...allTags, tag];

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50
                    flex flex-col overflow-hidden animate-slide-right">

      {/* Avatar + username */}
      <div className="flex flex-col items-center gap-3 px-5 pt-5 pb-4 border-b border-zinc-800 flex-shrink-0">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center
                         text-xl font-bold uppercase select-none ${colors.avatar}`}>
          {alert.username[0]}
        </div>
        <div className="text-center">
          <a href={`https://www.instagram.com/${alert.username}/`} target="_blank" rel="noopener noreferrer"
             className="text-[15px] font-semibold text-zinc-100 hover:text-zinc-300 transition-colors">
            @{alert.username}
          </a>
          {account?.display_name && <p className="text-xs text-zinc-500 mt-0.5">{account.display_name}</p>}
        </div>
        {/* Account quick-action row */}
        <div className="flex items-center gap-2">
          <button title="View history"
            onClick={() => onViewHistory(alert.username)}
            className="px-2.5 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-500
                       hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            History
          </button>
          <button title={account?.is_pinned ? 'Unpin' : 'Pin'}
            onClick={() => onUpdateAccount(alert.username, { is_pinned: !account?.is_pinned })}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
              account?.is_pinned ? 'border-amber-700/50 text-amber-400 bg-amber-950/30'
                                 : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}>
            {account?.is_pinned ? '📌 Pinned' : '📌 Pin'}
          </button>
          <button title={account?.is_watched ? 'Unwatch' : 'Watch'}
            onClick={() => onUpdateAccount(alert.username, { is_watched: !account?.is_watched })}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
              account?.is_watched ? 'border-sky-700/50 text-sky-400 bg-sky-950/30'
                                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}>
            {account?.is_watched ? '👁 Watching' : '👁 Watch'}
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Priority */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Priority</p>
          <div className="flex gap-1.5">
            {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(([p, cfg]) => (
              <button key={p}
                onClick={() => onUpdatePriority(alert.id, p)}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  priority === p ? cfg.active : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                }`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Details</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-semibold text-zinc-100">{alert.story_count}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Stories</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-center">
              <div className="text-base font-semibold text-zinc-100">{alert.new_ids.length}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wide">New</div>
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
            <div className="text-xs text-zinc-400">{timeAgo}</div>
            <div className="text-[10px] text-zinc-600">{fullDate}</div>
          </div>
        </div>

        {/* Media gallery */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Saved Media</p>
          <MediaGallery alertId={alert.id} username={alert.username} />
        </div>

        {/* Tag */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Tag</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tagOptions.map(t => {
              const c = tagColors(t);
              return (
                <button key={t} onClick={() => onTagChange(alert.username, t)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                    tag === t ? c.pillActive : c.pill
                  }`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
            {addingTag ? (
              <div className="flex items-center gap-1">
                <input ref={newTagRef} value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNewTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTagInput(''); } }}
                  placeholder="tag name"
                  className="w-24 px-2 py-1 rounded-lg border border-zinc-600 bg-zinc-800
                             text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                <button onClick={handleNewTag} className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">✓</button>
                <button onClick={() => { setAddingTag(false); setNewTagInput(''); }} className="text-[11px] text-zinc-700 hover:text-zinc-500 px-1">✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingTag(true)}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-700
                           text-[11px] text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors">
                + New
              </button>
            )}
          </div>
        </div>

        {/* Collection */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Collection</p>
          {addingCol ? (
            <div className="flex items-center gap-1">
              <input ref={colRef} value={colInput} onChange={e => setColInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onUpdateAccount(alert.username, { collection: colInput.trim() || null }); setAddingCol(false); }
                  if (e.key === 'Escape') setAddingCol(false);
                }}
                placeholder="collection name"
                className="flex-1 px-2 py-1 rounded-lg border border-zinc-600 bg-zinc-800
                           text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
              <button onClick={() => { onUpdateAccount(alert.username, { collection: colInput.trim() || null }); setAddingCol(false); }}
                className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">✓</button>
            </div>
          ) : (
            <button onClick={() => { setColInput(account?.collection ?? ''); setAddingCol(true); }}
              className="w-full text-left px-3 py-1.5 rounded-lg border border-dashed border-zinc-700
                         text-[11px] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors">
              {account?.collection ? `📁 ${account.collection}` : '+ Assign collection'}
            </button>
          )}
        </div>

        {/* Account note (permanent) */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
            Account Note <span className="text-zinc-700 normal-case font-normal">(permanent)</span>
          </p>
          <textarea
            value={permanentNote}
            onChange={e => setPermanentNote(e.target.value)}
            onBlur={() => {
              if (permanentNote !== (account?.permanent_note ?? ''))
                onUpdateAccount(alert.username, { permanent_note: permanentNote });
            }}
            placeholder="Notes about this account…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50
                       text-xs text-zinc-300 placeholder-zinc-700 resize-none
                       focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Alert note */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
            Alert Note <span className="text-zinc-700 normal-case font-normal">(this alert only)</span>
          </p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => { if (note !== (alert.note ?? '')) onUpdateNote(alert.id, note); }}
            placeholder="Add a note…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50
                       text-xs text-zinc-300 placeholder-zinc-700 resize-none
                       focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex gap-2">
        <a href={`https://www.instagram.com/stories/${alert.username}/`} target="_blank" rel="noopener noreferrer"
           className="flex-1 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                      hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-center">
          View Stories
        </a>
        {alert.is_archived ? (
          <button onClick={() => onUnarchive(alert.id)}
            className="px-3 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
            Restore
          </button>
        ) : (
          <button onClick={() => onMarkArchived(alert.id)}
            className="px-3 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
            Archive
          </button>
        )}
        <button onClick={() => onDelete(alert.id)}
          className="px-3 py-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-600
                     hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}
