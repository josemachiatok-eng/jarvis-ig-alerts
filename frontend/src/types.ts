export type Tag  = string;  // any user-defined label; built-ins: 'favourite' | 'special' | 'other'
export type View = 'all' | 'unread' | string;  // 'all', 'unread', a tag, or a username

export interface Account {
  id: string;
  username: string;
  tag: Tag;
  display_name: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  username: string;
  story_count: number;
  story_ids: string[];
  new_ids: string[];
  is_read: boolean;
  is_archived: boolean;
  note: string | null;
  detected_at: string;
  created_at: string;
}

export interface StoryFile {
  id: string;
  username: string;
  story_id: string;
  alert_id: string | null;
  storage_path: string;
  is_video: boolean;
  taken_at: string | null;
  created_at: string;
}
