ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS studio_name TEXT,
  ADD COLUMN IF NOT EXISTS studio_website TEXT,
  ADD COLUMN IF NOT EXISTS studio_team_size TEXT,
  ADD COLUMN IF NOT EXISTS default_sprint_length_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS planning_tool TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_status_check
  CHECK (onboarding_status IN ('PENDING','COMPLETED','SKIPPED'));

-- Existing accounts already use the app, so they should not be sent through onboarding.
UPDATE public.profiles SET onboarding_status = 'COMPLETED', onboarding_completed_at = now()
WHERE onboarding_status = 'PENDING';