import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Professional roles describe WHAT a person does (Artist, Programmer, Producer…).
 * They are stored per project and are completely independent from permission
 * roles, which decide what a person is ALLOWED to do.
 */

const projectId = z.string().uuid();
const roleName = z.string().trim().min(2).max(60);
/** Emoji or "lucide:Name" token, stored separately from the role name. */
const roleIcon = z.string().trim().max(40).nullable().optional();

/** Only owners and admins may curate the project's professional roles. */
function assertAdminRole(role: string | null | undefined) {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("FORBIDDEN: only project owners and admins can manage professional roles.");
  }
}



export const listProfessionalRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId }).parse(input))
  .handler(async ({ data, context }) => {
    const [roles, links] = await Promise.all([
      context.supabase
        .from("professional_roles")
        .select("id, name, icon, created_at")
        .eq("project_id", data.projectId)
        .order("name", { ascending: true }),
      context.supabase
        .from("member_professional_roles")
        .select("role_id, member_id")
        .eq("project_id", data.projectId),
    ]);
    if (roles.error) throw new Error(roles.error.message);
    if (links.error) throw new Error(links.error.message);

    const counts = new Map<string, number>();
    for (const link of links.data ?? []) {
      counts.set(link.role_id, (counts.get(link.role_id) ?? 0) + 1);
    }

    return (roles.data ?? []).map((role) => ({
      ...role,
      memberCount: counts.get(role.id) ?? 0,
    }));
  });

export const createProfessionalRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId, name: roleName, icon: roleIcon }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const membership = await context.supabase
      .from("project_members")
      .select("role")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    assertAdminRole(membership.data?.role);
    const { data: row, error } = await context.supabase
      .from("professional_roles")
      .insert({ project_id: data.projectId, name: data.name, icon: data.icon ?? null })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        throw new Error("This project already has a professional role with that name.");
      }
      throw new Error(error.message);
    }
    return { id: row.id };
  });

export const renameProfessionalRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId, roleId: z.string().uuid(), name: roleName, icon: roleIcon }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const membership = await context.supabase
      .from("project_members")
      .select("role")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    assertAdminRole(membership.data?.role);
    const { error } = await context.supabase
      .from("professional_roles")
      .update({ name: data.name, icon: data.icon ?? null })
      .eq("id", data.roleId)
      .eq("project_id", data.projectId);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        throw new Error("This project already has a professional role with that name.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

/**
 * Removes the role and its member associations only. Members keep their
 * permissions, their backlog items and their sprint assignments.
 */
export const deleteProfessionalRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId, roleId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const membership = await context.supabase
      .from("project_members")
      .select("role")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    assertAdminRole(membership.data?.role);
    const { error } = await context.supabase
      .from("professional_roles")
      .delete()
      .eq("id", data.roleId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Replaces the full set of professional roles held by one project member. */
export const setMemberProfessionalRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId,
        memberId: z.string().uuid(),
        roleIds: z.array(z.string().uuid()).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const membership = await context.supabase
      .from("project_members")
      .select("role")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membership.error) throw new Error(membership.error.message);
    assertAdminRole(membership.data?.role);

    const { data: member, error: memberError } = await context.supabase
      .from("project_members")
      .select("id")
      .eq("id", data.memberId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member) throw new Error("FORBIDDEN: member not found in this project.");

    const { error: clearError } = await context.supabase
      .from("member_professional_roles")
      .delete()
      .eq("project_id", data.projectId)
      .eq("member_id", data.memberId);
    if (clearError) throw new Error(clearError.message);

    if (data.roleIds.length > 0) {
      const { error } = await context.supabase.from("member_professional_roles").insert(
        data.roleIds.map((roleId) => ({
          project_id: data.projectId,
          member_id: data.memberId,
          role_id: roleId,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
