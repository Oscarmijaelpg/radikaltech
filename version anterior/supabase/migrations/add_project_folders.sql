-- ============================================================
-- Migration: Add project_folders feature
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create project_folders table
CREATE TABLE IF NOT EXISTS public.project_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT 'blue',
  icon        TEXT NOT NULL DEFAULT 'folder',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add folder_id column to chats table
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_folders_user_id ON public.project_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON public.chats(folder_id);

-- 4. Row Level Security for project_folders
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders"
  ON public.project_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON public.project_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.project_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.project_folders FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_folders_updated_at ON public.project_folders;
CREATE TRIGGER set_project_folders_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
