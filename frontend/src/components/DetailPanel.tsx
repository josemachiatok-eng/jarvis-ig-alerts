import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Alert, Account, Tag, StoryFile } from '../types';
import { tagColors } from '../lib/tagColors';
import { supabase } from '../lib/supabase';

interface Props {
  alert: Alert | null;
  account: Account | undefined;
  allTags: string[];
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

// ── Media gallery ─────────────────────────────────────────────
function MediaGallery({ alertId, username }: { alertId: string; username: string }) {
  const [files,     setFiles]     = useState<StoryFile[]>([]);
  const [urls,      setUrls]      = useState<Map<string, string>>(new Map());
  const [loading,   setLoading]   = useState(true);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    setFiles([]);
    setUrls(new Map());
    setLoading(true);

    supabase
      .from('story_files')
      .select('*')
      .eq('alert_id', alertId)
      .order('taken_at', { ascending: true })
      .then(async ({ data }) => {
        const items = (data ?? []) as StoryFile[];
        setFiles(items);

        // Generate signed URLs (1-hour expiry)
        const map = new Map<string, string>();
        await Promise.all(
          items.map(async f => {
            const { data: signed } = await supabase.storage
              .from('stories')
              .createSignedUrl(f.storage_path, 3600);
            if (signed?.signedUrl) map.set(f.id, signed.signedUrl);
          })
        );
        setUrls(map);
        setLoading(false);
      });
  }, [alertId, username]);

  if (loading) {
    return <p className="text-[11px] text-zinc-700 italic">Loading media…</p>;
  }

  if (files.length === 0) {
    return <p className="text-[11px] text-zinc-700 italic">No media stored yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {files.map(f => {
          const url = urls.get(f.id);
          if (!url) return null;
          return (
            <button
              key={f.id}
              onClick={() => setFullscreen(f.id)}
              className="relative rounded-lg overflow-hidden bg-zinc-800 aspect-[9/16]
                         hover:ring-2 hover:ring-zinc-500 transition-all"
            >
              {f.is_video ? (
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={url}
                  alt={`story ${f.story_id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              {f.is_video && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-sm">
                    ▶
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Fullscreen lightbox */}
      {fullscreen && (() => {
        const f   = files.find(x => x.id === fullscreen);
        const url = f ? urls.get(f.id) : undefined;
        if (!f || !url) return null;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setFullscreen(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
              onClick={() => setFullscreen(null)}
            >
              ✕
            </button>
            {f.is_video ? (
              <video
                src={url}
                controls
                autoPlay
                className="max-h-screen max-w-full rounded-xl"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <img
                src={url}
                alt="story"
                className="max-h-screen max-w-full rounded-xl object-contain"
                onClick={e => e.stopPropagation()}
              />
            )}
          </div>
        );
      })()}
    </>
  );
}

// ── Detail panel ──────────────────────────────────────────────
export function DetailPanel({ alert, account, allTags, onMarkArchived, onDelete, onUpdateNote, onTagChange }: Props) {
  const [note,        setNote]        = useState('');
  const [addingTag,   setAddingTag]   = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const newTagRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNote(alert?.note ?? '');
    setAddingTag(false);
    setNewTagInput('');
  }, [alert?.id, alert?.note]);

  useEffect(() => {
    if (addingTag) newTagRef.current?.focus();
  }, [addingTag]);

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

  const handleNewTag = () => {
    const t = newTagInput.trim().toLowerCase();
    if (t) {
      onTagChange(alert.username, t);
      setAddingTag(false);
      setNewTagInput('');
    }
  };

  const tagOptions = allTags.includes(tag) ? allTags : [...allTags, tag];

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50
                    flex flex-col overflow-hidden">

      {/* Avatar + username */}
      <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-4 border-b border-zinc-800 flex-shrink-0">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center
                         text-xl font-bold uppercase select-none ${colors.avatar}`}>
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
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
            Saved Media
          </p>
          <MediaGallery alertId={alert.id} username={alert.username} />
        </div>

        {/* Tag */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Tag</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tagOptions.map(t => {
              const c = tagColors(t);
              return (
                <button
                  key={t}
                  onClick={() => onTagChange(alert.username, t)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                    tag === t ? c.pillActive : c.pill
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
            {addingTag ? (
              <div className="flex items-center gap-1">
                <input
                  ref={newTagRef}
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleNewTag();
                    if (e.key === 'Escape') { setAddingTag(false); setNewTagInput(''); }
                  }}
                  placeholder="tag name"
                  className="w-24 px-2 py-1 rounded-lg border border-zinc-600 bg-zinc-800
                             text-[11px] text-zinc-200 placeholder-zinc-600
                             focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={handleNewTag}
                  className="px-2 py-1 rounded-lg border border-zinc-700 text-[11px]
                             text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  ✓
                </button>
                <button
                  onClick={() => { setAddingTag(false); setNewTagInput(''); }}
                  className="text-[11px] text-zinc-700 hover:text-zinc-500 px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-700
                           text-[11px] text-zinc-600 hover:border-zinc-500 hover:text-zinc-400
                           transition-colors"
              >
                + New
              </button>
            )}
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
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50
                       text-xs text-zinc-300 placeholder-zinc-700 resize-none
                       focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>
      </div>

      {/* Footer */}
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
            className="px-3 py-2 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Archive
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          className="px-3 py-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-600
                     hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
