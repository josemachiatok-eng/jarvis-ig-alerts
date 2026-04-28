import { useState, useEffect } from 'react';
import type { Alert } from '../types';

interface Props {
  alert: Alert;
  onSave: (id: string, note: string) => void;
  onClose: () => void;
}

export function NoteModal({ alert, onSave, onClose }: Props) {
  const [note, setNote] = useState(alert.note ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSave(alert.id, note);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alert.id, note, onClose, onSave]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold mb-0.5">Note for @{alert.username}</h3>
        <p className="text-xs text-zinc-500 mb-3">
          {new Date(alert.detected_at).toLocaleString()}
          {' · '}
          {alert.story_count} story item{alert.story_count !== 1 ? 's' : ''}
        </p>

        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="Add a note about this account or alert..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100
                     placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none transition-colors"
        />

        <p className="text-xs text-zinc-600 mt-1 mb-3">⌘ Enter to save · Esc to cancel</p>

        <div className="flex gap-2">
          <button
            onClick={() => onSave(alert.id, note)}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium
                       py-2 rounded-xl transition-colors"
          >
            Save note
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium
                       py-2 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
