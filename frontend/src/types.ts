export type Tag = 'favourite' | 'special' | 'other';
export type View = 'all' | 'favourite' | 'special' | 'unread';  // or a username string

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
