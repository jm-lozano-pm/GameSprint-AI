ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.development_tasks
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.features
  ADD COLUMN IF NOT EXISTS split_reason text,
  ADD COLUMN IF NOT EXISTS split_suggestions jsonb;

CREATE INDEX IF NOT EXISTS requirements_assignee_idx ON public.requirements(assignee_id);
CREATE INDEX IF NOT EXISTS development_tasks_assignee_idx ON public.development_tasks(assignee_id);