/**
 * downloadZip.ts
 * Downloads all story_files from Supabase Storage as a ZIP.
 * Folder structure: {username}/{username}_{YYYY-MM-DD_HH-mm-ss}.{ext}
 */

import JSZip from 'jszip';
import { format } from 'date-fns';
import { supabase } from './supabase';
import type { StoryFile } from '../types';

export type ZipPhase = 'idle' | 'fetching' | 'downloading' | 'zipping' | 'done' | 'error';

export interface ZipProgress {
  phase: ZipPhase;
  current: number;
  total: number;
  message: string;
}

const SIGNED_URL_BATCH  = 100; // createSignedUrls per call
const DOWNLOAD_PARALLEL = 6;   // concurrent fetch() calls

export async function downloadAllAsZip(
  onProgress: (p: ZipProgress) => void,
  signal?: AbortSignal,
) {
  // ── 1. Fetch the full file list ────────────────────────────
  onProgress({ phase: 'fetching', current: 0, total: 0, message: 'Fetching file list…' });

  const { data, error } = await supabase
    .from('story_files')
    .select('*')
    .order('taken_at', { ascending: true });

  if (error || !data) {
    onProgress({ phase: 'error', current: 0, total: 0, message: `Could not fetch files: ${error?.message ?? 'unknown error'}` });
    return;
  }

  const files = data as StoryFile[];

  if (files.length === 0) {
    onProgress({ phase: 'done', current: 0, total: 0, message: 'No media stored yet.' });
    return;
  }

  // ── 2. Generate signed URLs in batches ────────────────────
  onProgress({ phase: 'fetching', current: 0, total: files.length, message: `Signing ${files.length} URLs…` });

  const urlMap = new Map<string, string>(); // file.id → signedUrl

  for (let i = 0; i < files.length; i += SIGNED_URL_BATCH) {
    if (signal?.aborted) return;
    const batch = files.slice(i, i + SIGNED_URL_BATCH);
    const paths = batch.map(f => f.storage_path);
    const { data: signed } = await supabase.storage
      .from('stories')
      .createSignedUrls(paths, 3_600);
    if (signed) {
      signed.forEach((s, idx) => {
        if (s.signedUrl) urlMap.set(batch[idx].id, s.signedUrl);
      });
    }
  }

  // ── 3. Download all files in parallel (rate-limited) ──────
  const zip = new JSZip();
  let done = 0;

  onProgress({ phase: 'downloading', current: 0, total: files.length, message: `Downloading 0 / ${files.length}…` });

  async function fetchOne(f: StoryFile) {
    if (signal?.aborted) return;
    const url = urlMap.get(f.id);
    if (!url) { done++; return; }

    const ext = f.is_video ? 'mp4' : 'jpg';
    const ts  = f.taken_at ?? f.created_at;
    const stamp = ts
      ? format(new Date(ts), 'yyyy-MM-dd_HH-mm-ss')
      : 'unknown';
    const filename = `${f.username}_${stamp}.${ext}`;
    const filepath = `${f.username}/${filename}`;

    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(filepath, blob);
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.warn(`Skipped ${f.story_id}:`, err);
      }
    }

    done++;
    onProgress({
      phase: 'downloading',
      current: done,
      total: files.length,
      message: `Downloading ${done} / ${files.length}…`,
    });
  }

  // Process in parallel batches
  for (let i = 0; i < files.length; i += DOWNLOAD_PARALLEL) {
    if (signal?.aborted) return;
    await Promise.all(files.slice(i, i + DOWNLOAD_PARALLEL).map(fetchOne));
  }

  if (signal?.aborted) return;

  // ── 4. Compress → ZIP ─────────────────────────────────────
  onProgress({ phase: 'zipping', current: 0, total: 100, message: 'Compressing…' });

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
    meta => {
      onProgress({
        phase: 'zipping',
        current: Math.round(meta.percent),
        total: 100,
        message: `Compressing… ${Math.round(meta.percent)}%`,
      });
    },
  );

  // ── 5. Trigger browser download ───────────────────────────
  const today    = format(new Date(), 'yyyy-MM-dd');
  const a        = document.createElement('a');
  a.href         = URL.createObjectURL(zipBlob);
  a.download     = `jarvis_stories_${today}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);

  onProgress({ phase: 'done', current: files.length, total: files.length, message: `Done — ${files.length} file(s) downloaded.` });
}
