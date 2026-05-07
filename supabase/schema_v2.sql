-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This adds story file tracking and removes the tag CHECK constraint for custom tags.

-- 1. Remove the tag check constraint so custom tags work
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_tag_check;

-- 2. Story files table — one row per downloaded media item
CREATE TABLE IF NOT EXISTS story_files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text        NOT NULL,
  story_id     text        NOT NULL,
  alert_id     uuid        REFERENCES alerts(id) ON DELETE SET NULL,
  storage_path text        NOT NULL,
  is_video     boolean     NOT NULL DEFAULT false,
  taken_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS story_files_story_id_idx ON story_files (story_id);
CREATE        INDEX IF NOT EXISTS story_files_username_idx ON story_files (username);
CREATE        INDEX IF NOT EXISTS story_files_created_at_idx ON story_files (created_at);

-- 3. RLS (same aal2-only pattern as the other tables)
ALTER TABLE story_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aal2 select story_files" ON story_files
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'aal') = 'aal2');

CREATE POLICY "aal2 insert story_files" ON story_files
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'aal') = 'aal2');

CREATE POLICY "aal2 delete story_files" ON story_files
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'aal') = 'aal2');

-- 4. Create the storage bucket via SQL (if not using the dashboard UI)
-- If this fails, just create it manually in Storage → New Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: service role can do everything (used by the pipeline)
--    Authenticated users with aal2 can read (for signed URLs)
CREATE POLICY "service role full access" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'stories');

CREATE POLICY "aal2 read stories" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stories' AND (auth.jwt() ->> 'aal') = 'aal2');
