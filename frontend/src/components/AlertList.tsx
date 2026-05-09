import { useMemo } from 'react';
import { AlertCard } from './AlertCard';
import { supabase } from '../lib/supabase';
import type { Alert, Account } from '../types';
import type { ZipProgress } from '../lib/downloadZip';

interface Props {
  alerts:          Alert[];
  accounts:        Map<string, Account>;
  selectedId:      string | null;
  isGridView:      boolean;
  selectedIds:     Set<string>;
  onSelect:        (alert: Alert) => void;
  onMarkArchived:  (id: string) => void;
  onDelete:        (id: string) => void;
  onBulkToggle:    (id: string) => void;
  onBulkArchive:   (ids: string[]) => void;
  onBulkDelete:    (ids: string[]) => void;
  onBulkMarkRead:  (ids: string[]) => void;
  onClearSelection:() => void;
  onSetZipProgress:(p: ZipProgress | null) => void;
}

export function AlertList({
  alerts, accounts, selectedId, isGridView, selectedIds,
  onSelect, onMarkArchived, onDelete,
  onBulkToggle, onBulkArchive, onBulkDelete, onBulkMarkRead,
  onClearSelection, onSetZipProgress,
}: Props) {
  const bulkMode = selectedIds.size > 0;
  const selArray = [...selectedIds];

  // Preload first thumbnail for each alert (for grid mode)
  const thumbUrls = useMemo(() => {
    // Only matters in grid view — we don't fetch anything here;
    // thumbnails are loaded lazily per-card from Supabase via signed URL
    return new Map<string, string>();
  }, []);

  const handleBulkDownload = async () => {
    const selectedAlerts = alerts.filter(a => selectedIds.has(a.id));
    void selectedAlerts; // used for context only

    // Fetch story_files for selected alert ids
    const { data: files } = await supabase
      .from('story_files')
      .select('*')
      .in('alert_id', selArray);

    if (!files || files.length === 0) {
      alert('No saved media found for the selected alerts.');
      return;
    }

    // Reuse downloadAllAsZip logic with a filtered file list override
    // We'll do a simple inline download using the same pattern
    const JSZip  = (await import('jszip')).default;
    const { format } = await import('date-fns');
    const zip    = new JSZip();
    let done     = 0;
    const total  = files.length;

    onSetZipProgress({ phase: 'fetching', current: 0, total, message: `Signing ${total} URLs…` });

    const paths = files.map((f: { storage_path: string }) => f.storage_path);
    const BATCH = 100;
    const urlMap = new Map<string, string>();
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const { data: signed } = await supabase.storage.from('stories').createSignedUrls(batch, 3600);
      if (signed) signed.forEach((s: { signedUrl: string | null }, idx: number) => {
        if (s.signedUrl) urlMap.set(files[i + idx].storage_path, s.signedUrl);
      });
    }

    onSetZipProgress({ phase: 'downloading', current: 0, total, message: `Downloading 0 / ${total}…` });

    for (const f of files as Array<{ username: string; storage_path: string; is_video: boolean; taken_at: string | null; created_at: string }>) {
      const url = urlMap.get(f.storage_path);
      if (!url) { done++; continue; }
      const ext   = f.is_video ? 'mp4' : 'jpg';
      const ts    = f.taken_at ?? f.created_at;
      const stamp = ts ? format(new Date(ts), 'yyyy-MM-dd_HH-mm-ss') : 'unknown';
      try {
        const res  = await fetch(url);
        const blob = await res.blob();
        zip.file(`${f.username}/${f.username}_${stamp}.${ext}`, blob);
      } catch { /* skip */ }
      done++;
      onSetZipProgress({ phase: 'downloading', current: done, total, message: `Downloading ${done} / ${total}…` });
    }

    onSetZipProgress({ phase: 'zipping', current: 0, total: 100, message: 'Compressing…' });
    const blob     = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    const today    = format(new Date(), 'yyyy-MM-dd');
    const a        = document.createElement('a');
    a.href         = URL.createObjectURL(blob);
    a.download     = `jarvis_selection_${today}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    onSetZipProgress({ phase: 'done', current: total, total, message: `Done — ${total} file(s) downloaded.` });
    setTimeout(() => onSetZipProgress(null), 3000);
  };

  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <p className="text-2xl text-zinc-700 mb-2">✓</p>
        <p className="text-sm text-zinc-600">No alerts match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
      {/* Bulk action bar */}
      {bulkMode && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-950/40 border-b border-blue-900/40 animate-fade-up">
          <span className="text-[12px] text-blue-300 font-medium flex-1">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => onBulkMarkRead(selArray)}
            className="px-3 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >Mark read</button>
          <button
            onClick={() => { onBulkArchive(selArray); onClearSelection(); }}
            className="px-3 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >Archive</button>
          <button
            onClick={handleBulkDownload}
            className="px-3 py-1 rounded-lg border border-zinc-700 text-[11px] text-zinc-400
                       hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >↓ Download</button>
          <button
            onClick={() => { onBulkDelete(selArray); onClearSelection(); }}
            className="px-3 py-1 rounded-lg border border-rose-900/50 text-[11px] text-rose-500
                       hover:bg-rose-950/30 transition-colors"
          >Delete</button>
          <button
            onClick={onClearSelection}
            className="text-zinc-600 hover:text-zinc-400 text-xs px-1 transition-colors"
          >✕</button>
        </div>
      )}

      {/* List or Grid */}
      <div className={`flex-1 overflow-y-auto ${isGridView ? 'p-3' : ''}`}>
        {isGridView ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                account={accounts.get(alert.username)}
                isSelected={alert.id === selectedId}
                isGridView
                bulkSelected={selectedIds.has(alert.id)}
                bulkMode={bulkMode}
                onSelect={onSelect}
                onMarkArchived={onMarkArchived}
                onDelete={onDelete}
                onBulkToggle={onBulkToggle}
                thumbUrl={thumbUrls.get(alert.id)}
              />
            ))}
          </div>
        ) : (
          alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              account={accounts.get(alert.username)}
              isSelected={alert.id === selectedId}
              isGridView={false}
              bulkSelected={selectedIds.has(alert.id)}
              bulkMode={bulkMode}
              onSelect={onSelect}
              onMarkArchived={onMarkArchived}
              onDelete={onDelete}
              onBulkToggle={onBulkToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
