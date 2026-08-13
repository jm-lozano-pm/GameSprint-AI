REVOKE ALL ON FUNCTION public.is_project_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_project_role(UUID, UUID, public.project_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_project_role(UUID, UUID, public.project_role[]) TO authenticated, service_role;