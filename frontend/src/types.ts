export type Tag = 'favourite' | 'special' | 'other';

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

export type SortField = 'detected_at' | 'username' | 'story_count';
export type SortDir = 'asc' | 'desc';

export interface Filters {
  search: string;
  tags: Tag[];
  showRead: boolean;
  showArchived: boolean;
  sortField: SortField;
  sortDir: SortDir;
}
