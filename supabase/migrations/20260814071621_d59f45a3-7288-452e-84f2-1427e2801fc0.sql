CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = _project_id AND m.user_id = _user_id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_role(_project_id uuid, _user_id uuid, _roles project_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = _project_id AND m.user_id = _user_id AND m.role = ANY(_roles))
  END;
$$;

DROP POLICY IF EXISTS "Members can read avatars" ON storage.objects;
CREATE POLICY "Users can read their own avatar" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);