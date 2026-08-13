CREATE OR REPLACE FUNCTION public.create_project_with_owner(
  _name text,
  _description text DEFAULT NULL,
  _genre text DEFAULT NULL,
  _team_size integer DEFAULT NULL,
  _platforms text[] DEFAULT '{}'::text[],
  _context text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.projects (owner_id, name, description, genre, team_size, platforms, context)
  VALUES (_uid, _name, _description, _genre, _team_size, COALESCE(_platforms, '{}'::text[]), _context)
  RETURNING id INTO _id;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (_id, _uid, 'OWNER')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_with_owner(text, text, text, integer, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_with_owner(text, text, text, integer, text[], text) TO authenticated;