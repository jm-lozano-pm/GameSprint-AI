import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSprints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sprints, error } = await context.supabase
      .from("sprints")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: items, error: itemsError } = await context.supabase
      .from("backlog_items")
      .select("id, sprint_id, story_points, status")
      .eq("project_id", data.projectId)
      .not("sprint_id", "is", null);
    if (itemsError) throw new Error(itemsError.message);

    return (sprints ?? []).map((sprint) => {
      const own = (items ?? []).filter((item) => item.sprint_id === sprint.id);
      return {
        ...sprint,
        itemCount: own.length,
        committedPoints: own.reduce((sum, item) => sum + (item.story_points ?? 0), 0),
        doneCount: own.filter((item) => item.status === "DONE").length,
      };
    });
  });

export const createSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        goal: z.string().trim().max(1000).optional().default(""),
        startDate: z.string().trim().max(10).optional().default(""),
        endDate: z.string().trim().max(10).optional().default(""),
        capacity: z.number().int().min(1).max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed, error: accessError } = await context.supabase.rpc("is_project_member", {
      _project_id: data.projectId,
      _user_id: context.userId,
    });
    if (accessError) throw new Error(accessError.message);
    if (!allowed) throw new Error("FORBIDDEN: you do not have access to this project.");

    const { data: sprint, error } = await context.supabase
      .from("sprints")
      .insert({
        project_id: data.projectId,
        name: data.name,
        goal: data.goal || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        capacity: data.capacity ?? null,
        status: "PLANNED",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: sprint.id as string };
  });

/** Explicit human action: start a planned sprint. At most one ACTIVE sprint per project. */
export const startSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: active, error: activeError } = await context.supabase
      .from("sprints")
      .select("id, name")
      .eq("project_id", data.projectId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (activeError) throw new Error(activeError.message);
    if (active && active.id !== data.sprintId) {
      throw new Error(
        `"${active.name}" is already active. Complete it before starting another sprint.`,
      );
    }

    const { error } = await context.supabase
      .from("sprints")
      .update({ status: "ACTIVE", started_at: new Date().toISOString(), completed_at: null })
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Explicit human action: complete the active sprint. Unfinished work is preserved. */
export const completeSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sprints")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    const { count } = await context.supabase
      .from("backlog_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId)
      .eq("sprint_id", data.sprintId)
      .neq("status", "DONE");
    return { ok: true, unfinished: count ?? 0 };
  });

/** Moves a sprint back to PLANNED (e.g. started by mistake). */
export const reopenSprintAsPlanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sprints")
      .update({ status: "PLANNED", completed_at: null })
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getSprintBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: sprint, error } = await context.supabase
      .from("sprints")
      .select("*")
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sprint) throw new Error("FORBIDDEN: sprint not found in this project.");

    const { data: items, error: itemsError } = await context.supabase
      .from("backlog_items")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("sprint_id", data.sprintId)
      .order("created_at", { ascending: true });
    if (itemsError) throw new Error(itemsError.message);

    return { sprint, items: items ?? [] };
  });

export const listBacklog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: items, error } = await context.supabase
      .from("backlog_items")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return items ?? [];
  });

export const getBacklogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), itemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: item, error } = await context.supabase
      .from("backlog_items")
      .select("*")
      .eq("id", data.itemId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("FORBIDDEN: backlog item not found in this project.");
    return item;
  });

/** Explicit human action: assign an approved backlog item to a sprint (or unassign). */
export const assignToSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        itemId: z.string().uuid(),
        sprintId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.sprintId) {
      const { data: sprint, error } = await context.supabase
        .from("sprints")
        .select("id")
        .eq("id", data.sprintId)
        .eq("project_id", data.projectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!sprint) throw new Error("FORBIDDEN: sprint does not belong to this project.");
    }

    const { data: current, error: currentError } = await context.supabase
      .from("backlog_items")
      .select("status")
      .eq("id", data.itemId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error("FORBIDDEN: backlog item not found in this project.");

    // Sprint assignment and execution status are coupled: unplanned work has no
    // sprint, and work with no sprint is never mid-flight.
    const status = data.sprintId
      ? current.status === "UNPLANNED"
        ? "TODO"
        : current.status
      : "UNPLANNED";

    const { error: updateError } = await context.supabase
      .from("backlog_items")
      .update({ sprint_id: data.sprintId, status })
      .eq("id", data.itemId)
      .eq("project_id", data.projectId);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, status };
  });


export const setItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        itemId: z.string().uuid(),
        status: z.enum(["UNPLANNED", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: current, error: currentError } = await context.supabase
      .from("backlog_items")
      .select("sprint_id")
      .eq("id", data.itemId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error("FORBIDDEN: backlog item not found in this project.");

    // Invalid combination guard: development states belong to a sprint.
    if (!current.sprint_id && data.status !== "UNPLANNED") {
      throw new Error("Assign this work to a sprint before moving it out of Unplanned.");
    }
    // Work inside a sprint is planned work, so it is never Unplanned.
    const status = current.sprint_id && data.status === "UNPLANNED" ? "TODO" : data.status;

    const { error } = await context.supabase
      .from("backlog_items")
      .update({ status })
      .eq("id", data.itemId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true, status };
  });

export const setItemAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        itemId: z.string().uuid(),
        assigneeId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.assigneeId) {
      const { data: member, error } = await context.supabase
        .from("project_members")
        .select("id")
        .eq("project_id", data.projectId)
        .eq("user_id", data.assigneeId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!member) throw new Error("FORBIDDEN: assignee is not a member of this project.");
    }
    const { data: item, error: updateError } = await context.supabase
      .from("backlog_items")
      .update({ assignee_id: data.assigneeId })
      .eq("id", data.itemId)
      .eq("project_id", data.projectId)
      .select("feature_id")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);

    // Keep the canonical idea's assignee in sync with its approved work item.
    if (item?.feature_id) {
      await context.supabase
        .from("features")
        .update({ assignee_id: data.assigneeId })
        .eq("id", item.feature_id)
        .eq("project_id", data.projectId);
    }
    return { ok: true };
  });

/** Edits sprint metadata. Never changes which items are in the sprint. */
export const updateSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        sprintId: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        goal: z.string().trim().max(2000).optional().default(""),
        startDate: z.string().trim().optional().default(""),
        endDate: z.string().trim().optional().default(""),
        capacity: z.number().int().min(1).max(999).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sprints")
      .update({
        name: data.name,
        goal: data.goal || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        capacity: data.capacity ?? null,
      })
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Deletes a sprint. Approved work is NEVER deleted: its items return to the
 * backlog unassigned, keeping their execution status.
 */
export const deleteSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), sprintId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: sprint, error: readError } = await context.supabase
      .from("sprints")
      .select("id, status")
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!sprint) throw new Error("FORBIDDEN: sprint not found in this project.");

    // Deleting a sprint never deletes work: its items return to the backlog as
    // unplanned so nothing is silently lost.
    const { error: detachError } = await context.supabase
      .from("backlog_items")
      .update({ sprint_id: null, status: "UNPLANNED" })
      .eq("sprint_id", data.sprintId)
      .eq("project_id", data.projectId);
    if (detachError) throw new Error(detachError.message);

    const { error } = await context.supabase
      .from("sprints")
      .delete()
      .eq("id", data.sprintId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

