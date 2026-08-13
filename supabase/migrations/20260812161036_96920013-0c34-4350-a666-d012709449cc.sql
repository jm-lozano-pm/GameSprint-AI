ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS features_assignee_idx ON public.features(assignee_id);