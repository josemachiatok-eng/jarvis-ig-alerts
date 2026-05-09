export type Tag      = string;
export type Priority = 'urgent' | 'normal' | 'low';
export type Page     = 'dashboard' | 'archive' | 'history' | 'timeline' | 'media' | 'leaderboard' | 'manage';

export interface Account {
  id:             string;
  username:       string;
  tag:            Tag;
  display_name:   string | null;
  note:           string | null;        // per-alert note (legacy, kept for compat)
  permanent_note: string | null;        // persists across all alerts
  collection:     string | null;
  is_pinned:      boolean;
  is_paused:      boolean;
  is_watched:     boolean;
  created_at:     string;
  updated_at:     string;
}

export interface Alert {
  id:          string;
  username:    string;
  story_count: number;
  story_ids:   string[];
  new_ids:     string[];
  is_read:     boolean;
  is_archived: boolean;
  note:        string | null;
  priority:    Priority;
  detected_at: string;
  created_at:  string;
}

export interface StoryFile {
  id:           string;
  username:     string;
  story_id:     string;
  alert_id:     string | null;
  storage_path: string;
  is_video:     boolean;
  taken_at:     string | null;
  created_at:   string;
}

export interface MonitoredAccount {
  username:  string;
  is_active: boolean;
  added_at:  string;
}

export interface DateRange {
  preset: 'all' | 'today' | '7d' | '30d' | 'custom';
  from:   Date | null;
  to:     Date | null;
}
