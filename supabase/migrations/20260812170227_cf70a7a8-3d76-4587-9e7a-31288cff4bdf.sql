CREATE TABLE public.professional_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX professional_roles_project_name_key
  ON public.professional_roles (project_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_roles TO authenticated;
GRANT ALL ON public.professional_roles TO service_role;
ALTER TABLE public.professional_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_roles_select_members ON public.professional_roles
  FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY professional_roles_write_admin ON public.professional_roles
  FOR ALL TO authenticated
  USING (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]))
  WITH CHECK (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]));

CREATE TRIGGER professional_roles_set_updated_at
  BEFORE UPDATE ON public.professional_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.member_professional_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.project_members(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.professional_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, role_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_professional_roles TO authenticated;
GRANT ALL ON public.member_professional_roles TO service_role;
ALTER TABLE public.member_professional_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_professional_roles_select_members ON public.member_professional_roles
  FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY member_professional_roles_write_admin ON public.member_professional_roles
  FOR ALL TO authenticated
  USING (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]))
  WITH CHECK (public.has_project_role(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE POLICY "Members can read avatars"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users manage their own avatar"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);