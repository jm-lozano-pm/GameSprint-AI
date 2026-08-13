ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.sprints ALTER COLUMN status SET DEFAULT 'PLANNED';

-- Keep only the most recent ACTIVE sprint per project before enforcing uniqueness.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
  FROM public.sprints
  WHERE status = 'ACTIVE'
)
UPDATE public.sprints s
SET status = 'PLANNED'
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

UPDATE public.sprints SET started_at = COALESCE(started_at, created_at) WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS sprints_one_active_per_project
  ON public.sprints (project_id)
  WHERE status = 'ACTIVE';