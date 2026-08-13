-- helper: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- enums
CREATE TYPE public.project_role AS ENUM ('OWNER','ADMIN','DESIGNER','DEVELOPER','QA');
CREATE TYPE public.feature_status AS ENUM ('DRAFT','AI_GENERATED','USER_EDITED','APPROVED','REJECTED');
CREATE TYPE public.req_kind AS ENUM ('USER_STORY','ACCEPTANCE_CRITERION','EDGE_CASE');
CREATE TYPE public.content_source AS ENUM ('AI','USER_EDITED','USER_CREATED');
CREATE TYPE public.priority_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE public.board_status AS ENUM ('TODO','IN_PROGRESS','IN_REVIEW','DONE');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  team_size INTEGER,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.project_role NOT NULL DEFAULT 'DEVELOPER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = _project_id AND m.user_id = _user_id);
$$;
CREATE OR REPLACE FUNCTION public.has_project_role(_project_id UUID, _user_id UUID, _roles public.project_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = _project_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_members" ON public.projects FOR SELECT TO authenticated USING (public.is_project_member(id, auth.uid()));
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects_update_members" ON public.projects FOR UPDATE TO authenticated USING (public.has_project_role(id, auth.uid(), ARRAY['OWNER','ADMIN','DESIGNER']::public.project_role[])) WITH CHECK (public.has_project_role(id, auth.uid(), ARRAY['OWNER','ADMIN','DESIGNER']::public.project_role[]));
CREATE POLICY "projects_delete_owner" ON public.projects FOR DELETE TO authenticated USING (public.has_project_role(id, auth.uid(), ARRAY['OWNER','ADMIN']::public.project_role[]));
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON public.project_members FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "members_insert_self_or_admin" ON public.project_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::public.project_role[]));
CREATE POLICY "members_update_admin" ON public.project_members FOR UPDATE TO authenticated USING (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::public.project_role[])) WITH CHECK (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::public.project_role[]));
CREATE POLICY "members_delete_admin" ON public.project_members FOR DELETE TO authenticated USING (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::public.project_role[]));

-- features (ideas)
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  context TEXT,
  status public.feature_status NOT NULL DEFAULT 'DRAFT',
  ai_priority public.priority_level,
  ai_story_points INTEGER,
  priority public.priority_level,
  story_points INTEGER,
  priority_edited BOOLEAN NOT NULL DEFAULT false,
  points_edited BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.features TO authenticated;
GRANT ALL ON public.features TO service_role;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "features_all_members" ON public.features FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE TRIGGER features_updated_at BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai generations (immutable record of raw AI output)
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_input JSONB NOT NULL,
  raw_output JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_select_members" ON public.ai_generations FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "gen_insert_members" ON public.ai_generations FOR INSERT TO authenticated WITH CHECK (public.is_project_member(project_id, auth.uid()));

-- requirements
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  generation_id UUID REFERENCES public.ai_generations ON DELETE SET NULL,
  kind public.req_kind NOT NULL,
  content TEXT NOT NULL,
  original_content TEXT,
  source public.content_source NOT NULL DEFAULT 'AI',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requirements TO authenticated;
GRANT ALL ON public.requirements TO service_role;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "req_all_members" ON public.requirements FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE TRIGGER requirements_updated_at BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- development tasks
CREATE TABLE public.development_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  generation_id UUID REFERENCES public.ai_generations ON DELETE SET NULL,
  title TEXT NOT NULL,
  original_title TEXT,
  description TEXT,
  story_points INTEGER,
  source public.content_source NOT NULL DEFAULT 'AI',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_tasks TO authenticated;
GRANT ALL ON public.development_tasks TO service_role;
ALTER TABLE public.development_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_all_members" ON public.development_tasks FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.development_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sprints
CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprints_all_members" ON public.sprints FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- approvals
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL
);
GRANT SELECT, INSERT ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select_members" ON public.approvals FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "approvals_insert_members" ON public.approvals FOR INSERT TO authenticated WITH CHECK (public.is_project_member(project_id, auth.uid()) AND approved_by = auth.uid());

-- backlog items
CREATE TABLE public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  feature_id UUID REFERENCES public.features ON DELETE SET NULL,
  approval_id UUID REFERENCES public.approvals ON DELETE SET NULL,
  sprint_id UUID REFERENCES public.sprints ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority public.priority_level NOT NULL DEFAULT 'MEDIUM',
  story_points INTEGER,
  status public.board_status NOT NULL DEFAULT 'TODO',
  snapshot JSONB,
  assignee_id UUID REFERENCES auth.users ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_items TO authenticated;
GRANT ALL ON public.backlog_items TO service_role;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backlog_all_members" ON public.backlog_items FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));
CREATE TRIGGER backlog_updated_at BEFORE UPDATE ON public.backlog_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_features_project ON public.features(project_id);
CREATE INDEX idx_req_feature ON public.requirements(feature_id);
CREATE INDEX idx_tasks_feature ON public.development_tasks(feature_id);
CREATE INDEX idx_backlog_project ON public.backlog_items(project_id);
CREATE INDEX idx_backlog_sprint ON public.backlog_items(sprint_id);
CREATE INDEX idx_members_user ON public.project_members(user_id);