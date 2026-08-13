import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Projects the signed-in user is a member of. */
export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, icon, description, genre, status, team_size, platforms, context, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS scopes this to projects the user is a member of: no cross-project reads.
    const { data: project, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("FORBIDDEN: you do not have access to this project.");
    return project;
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        icon: z.string().trim().max(40).nullable().optional(),
        description: z.string().trim().max(2000).optional().default(""),
        genre: z.string().trim().max(80).optional().default(""),
        teamSize: z.number().int().min(1).max(500).optional(),
        platforms: z.array(z.string().max(20)).max(8).optional().default([]),
        context: z.string().trim().max(4000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const args: {
      _name: string;
      _platforms: string[];
      _description?: string;
      _genre?: string;
      _team_size?: number;
      _context?: string;
    } = { _name: data.name, _platforms: data.platforms ?? [] };
    if (data.description) args._description = data.description;
    if (data.genre) args._genre = data.genre;
    if (data.teamSize != null) args._team_size = data.teamSize;
    if (data.context) args._context = data.context;
    const { data: newId, error } = await context.supabase.rpc("create_project_with_owner", args);
    if (error) throw new Error(error.message);
    // The icon is personalization only, stored separately from the name.
    if (data.icon) {
      await context.supabase
        .from("projects")
        .update({ icon: data.icon })
        .eq("id", newId as string);
    }
    return { id: newId as string };
  });


/** Human edit of the project's own context. Owners/admins/designers only (enforced by RLS). */
export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        icon: z.string().trim().max(40).nullable().optional(),
        description: z.string().trim().max(2000).optional().default(""),
        genre: z.string().trim().max(80).optional().default(""),
        teamSize: z.number().int().min(1).max(500).nullable().optional(),
        platforms: z.array(z.string().max(20)).max(8).optional().default([]),
        context: z.string().trim().max(4000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({
        name: data.name,
        icon: data.icon ?? null,
        description: data.description || null,
        genre: data.genre || null,
        team_size: data.teamSize ?? null,
        platforms: data.platforms ?? [],
        context: data.context || null,
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PROJECT_ROLES = ["OWNER", "ADMIN", "DESIGNER", "DEVELOPER", "QA"] as const;

/** Server-side authorization: the caller must be OWNER or ADMIN of the project. */
async function assertProjectAdmin(
  check: PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
  const { data, error } = await check;
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("FORBIDDEN: only project owners and admins can manage members.");
}


export const getProjectMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: members, error } = await context.supabase
      .from("project_members")
      .select("id, user_id, role, joined_at")
      .eq("project_id", data.projectId)
      .order("joined_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!members || members.length === 0) return [];

    // Membership is already verified by RLS above; names come from a privileged
    // read limited to the ids of THIS project's members only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, avatar_url, icon")
      .in("id", members.map((member) => member.user_id));

    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const { data: isAdmin } = await context.supabase.rpc("has_project_role", {
      _project_id: data.projectId,
      _user_id: context.userId,
      _roles: ["OWNER", "ADMIN"],
    });

    // Professional roles: what each person does on the team.
    const { data: roleLinks } = await context.supabase
      .from("member_professional_roles")
      .select("member_id, professional_roles(id, name, icon)")
      .eq("project_id", data.projectId);

    const rolesByMember = new Map<
      string,
      Array<{ id: string; name: string; icon: string | null }>
    >();
    for (const link of roleLinks ?? []) {
      const role = link.professional_roles as {
        id: string;
        name: string;
        icon: string | null;
      } | null;
      if (!role) continue;
      const list = rolesByMember.get(link.member_id) ?? [];
      list.push(role);
      rolesByMember.set(link.member_id, list);
    }

    const { signAvatarPaths } = await import("./avatars.server");
    const signed = await signAvatarPaths((profiles ?? []).map((profile) => profile.avatar_url));

    return members.map((member) => ({
      ...member,
      display_name: byId.get(member.user_id)?.display_name ?? null,
      icon: byId.get(member.user_id)?.icon ?? null,
      email: byId.get(member.user_id)?.email ?? null,
      avatar_url: signed.get(byId.get(member.user_id)?.avatar_url ?? "") ?? null,
      professionalRoles: (rolesByMember.get(member.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      isMe: member.user_id === context.userId,
      canManage: isAdmin === true,
    }));
  });


/** Adds an existing GameSprint AI account to this project. Owners/admins only. */
export const addProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        email: z.string().trim().email().max(255),
        role: z.enum(PROJECT_ROLES).default("DEVELOPER"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProjectAdmin(
      context.supabase.rpc("has_project_role", {
        _project_id: data.projectId,
        _user_id: context.userId,
        _roles: ["OWNER", "ADMIN"],
      }),
    );
    if (data.role === "OWNER") throw new Error("A project can only have one owner.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) {
      throw new Error(
        "No GameSprint AI account uses that email yet. Ask them to create an account first, then add them.",
      );
    }

    const { error } = await context.supabase
      .from("project_members")
      .insert({ project_id: data.projectId, user_id: profile.id, role: data.role });
    if (error) {
      if (error.code === "23505" || error.message.includes("duplicate")) {
        throw new Error("That person is already a member of this project.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: z.enum(PROJECT_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProjectAdmin(
      context.supabase.rpc("has_project_role", {
        _project_id: data.projectId,
        _user_id: context.userId,
        _roles: ["OWNER", "ADMIN"],
      }),
    );

    const { data: member, error: readError } = await context.supabase
      .from("project_members")
      .select("id, role")
      .eq("id", data.memberId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!member) throw new Error("FORBIDDEN: member not found in this project.");
    if (member.role === "OWNER") throw new Error("The project owner's role cannot be changed.");
    if (data.role === "OWNER") throw new Error("A project can only have one owner.");

    const { error } = await context.supabase
      .from("project_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), memberId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProjectAdmin(
      context.supabase.rpc("has_project_role", {
        _project_id: data.projectId,
        _user_id: context.userId,
        _roles: ["OWNER", "ADMIN"],
      }),
    );

    const { data: member, error: readError } = await context.supabase
      .from("project_members")
      .select("id, role, user_id")
      .eq("id", data.memberId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!member) throw new Error("FORBIDDEN: member not found in this project.");
    if (member.role === "OWNER") {
      throw new Error("The project owner cannot be removed — a project must always have an owner.");
    }

    const { error } = await context.supabase
      .from("project_members")
      .delete()
      .eq("id", data.memberId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    // Their work stays in the project; it simply becomes unassigned.
    await Promise.all([
      context.supabase
        .from("features")
        .update({ assignee_id: null })
        .eq("project_id", data.projectId)
        .eq("assignee_id", member.user_id),
      context.supabase
        .from("backlog_items")
        .update({ assignee_id: null })
        .eq("project_id", data.projectId)
        .eq("assignee_id", member.user_id),
      context.supabase
        .from("requirements")
        .update({ assignee_id: null })
        .eq("project_id", data.projectId)
        .eq("assignee_id", member.user_id),
      context.supabase
        .from("development_tasks")
        .update({ assignee_id: null })
        .eq("project_id", data.projectId)
        .eq("assignee_id", member.user_id),
    ]);

    return { ok: true };
  });

/**
 * Permanently deletes a project and everything inside it. Owners and admins only.
 * The UI requires typing the project name to confirm.
 */
export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), confirmName: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: project, error: readError } = await context.supabase
      .from("projects")
      .select("id, name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!project) throw new Error("FORBIDDEN: you do not have access to this project.");
    if (data.confirmName.trim() !== project.name.trim()) {
      throw new Error("The project name you typed does not match. Nothing was deleted.");
    }

    const { error } = await context.supabase.from("projects").delete().eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });




export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, icon")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { signAvatarPath } = await import("./avatars.server");
    return {
      id: data?.id ?? context.userId,
      display_name: data?.display_name ?? null,
      icon: data?.icon ?? null,
      email: data?.email ?? null,
      avatar_url: await signAvatarPath(data?.avatar_url),
    };
  });


export const getDashboardSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const projectId = data.projectId;
    if (!projectId) {
      return {
        ideas: 0,
        drafts: 0,
        needsReview: 0,
        approved: 0,
        backlog: 0,
        done: 0,
        sprints: 0,
        sprintItems: 0,
        sprintDone: 0,
        sprintPoints: 0,
        currentSprint: null as {
          id: string;
          name: string;
          status: string;
          start_date: string | null;
          end_date: string | null;
        } | null,
        recentIdeas: [] as Array<{
          id: string;
          name: string;
          status: string;
          created_at: string;
          priority: string | null;
          ai_priority: string | null;
        }>,
      };
    }

    const [features, backlog, sprints] = await Promise.all([
      context.supabase
        .from("features")
        .select("id, name, status, created_at, priority, ai_priority")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("backlog_items")
        .select("id, status, sprint_id, story_points")
        .eq("project_id", projectId),
      context.supabase
        .from("sprints")
        .select("id, name, status, start_date, end_date")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    if (features.error) throw new Error(features.error.message);
    if (backlog.error) throw new Error(backlog.error.message);
    if (sprints.error) throw new Error(sprints.error.message);

    const { count: ideaCount } = await context.supabase
      .from("features")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    const { count: approvedCount } = await context.supabase
      .from("features")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "APPROVED");
    const { count: draftCount } = await context.supabase
      .from("features")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "DRAFT");
    const { count: reviewCount } = await context.supabase
      .from("features")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["AI_GENERATED", "USER_EDITED"]);

    const all = sprints.data ?? [];
    const latestSprint =
      all.find((sprint) => sprint.status === "ACTIVE") ??
      all.find((sprint) => sprint.status === "PLANNED") ??
      all[0] ??
      null;
    const sprintItems = latestSprint
      ? (backlog.data ?? []).filter((item) => item.sprint_id === latestSprint.id)
      : [];

    return {
      ideas: ideaCount ?? 0,
      drafts: draftCount ?? 0,
      needsReview: reviewCount ?? 0,
      approved: approvedCount ?? 0,
      sprintItems: sprintItems.length,
      sprintDone: sprintItems.filter((item) => item.status === "DONE").length,
      sprintPoints: sprintItems.reduce((sum, item) => sum + (item.story_points ?? 0), 0),
      backlog: backlog.data?.length ?? 0,
      done: backlog.data?.filter((item) => item.status === "DONE").length ?? 0,
      sprints: sprints.data?.length ?? 0,
      currentSprint: latestSprint,
      recentIdeas: features.data ?? [],
    };
  });
