import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: features, error } = await context.supabase
      .from("features")
      .select(
        "id, name, description, status, priority, ai_priority, story_points, ai_story_points, assignee_id, split_reason, created_at, updated_at",
      )

      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return features ?? [];
  });

/** Persists the raw idea BEFORE any AI generation so user input is never lost. */
export const createIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(3).max(160),
        description: z.string().trim().min(10).max(4000),
        context: z.string().trim().max(4000).optional().default(""),
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

    const { data: feature, error } = await context.supabase
      .from("features")
      .insert({
        project_id: data.projectId,
        created_by: context.userId,
        name: data.name,
        description: data.description,
        context: data.context || null,
        status: "DRAFT",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: feature.id as string };
  });

export const getFeatureDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: feature, error } = await context.supabase
      .from("features")
      .select("*")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feature) throw new Error("FORBIDDEN: this idea is not part of the selected project.");

    const [requirements, tasks, generations, approvals, backlog] = await Promise.all([
      context.supabase
        .from("requirements")
        .select("*")
        .eq("feature_id", data.featureId)
        .order("kind", { ascending: true })
        .order("position", { ascending: true }),
      context.supabase
        .from("development_tasks")
        .select("*")
        .eq("feature_id", data.featureId)
        .order("position", { ascending: true }),
      context.supabase
        .from("ai_generations")
        .select("id, model, created_at, raw_output")
        .eq("feature_id", data.featureId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("approvals")
        .select("id, approved_by, approved_at, version")
        .eq("feature_id", data.featureId)
        .order("approved_at", { ascending: false }),
      context.supabase
        .from("backlog_items")
        .select("id, status, sprint_id")
        .eq("feature_id", data.featureId),
    ]);
    if (requirements.error) throw new Error(requirements.error.message);
    if (tasks.error) throw new Error(tasks.error.message);
    if (generations.error) throw new Error(generations.error.message);
    if (approvals.error) throw new Error(approvals.error.message);
    if (backlog.error) throw new Error(backlog.error.message);

    return {
      feature,
      requirements: requirements.data ?? [],
      tasks: tasks.data ?? [],
      generations: generations.data ?? [],
      approvals: approvals.data ?? [],
      backlogItems: backlog.data ?? [],
    };
  });

/**
 * Runs the full AI breakdown. Credentials stay server-side and only the minimum
 * authorised project context for THIS project is sent to the model.
 * Approved ideas can NEVER be regenerated: approved work is accepted development work.
 */
export const generateBreakdownForFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        mode: z.enum(["initial", "regenerate"]).default("initial"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { generateBreakdown, AiGenerationError } = await import("@/lib/ai.server");

    const { data: feature, error } = await context.supabase
      .from("features")
      .select("id, name, description, context, project_id, status")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feature) throw new Error("FORBIDDEN: this idea is not part of the selected project.");
    if (feature.status === "APPROVED") {
      throw new Error(
        "This idea is approved. Approved work cannot be regenerated — edit it by hand instead.",
      );
    }

    const { data: project, error: projectError } = await context.supabase
      .from("projects")
      .select("name, genre, context")
      .eq("id", data.projectId)
      .maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) throw new Error("FORBIDDEN: you do not have access to this project.");

    let generated;
    try {
      generated = await generateBreakdown({
        featureName: feature.name,
        featureDescription: feature.description,
        featureContext: feature.context,
        projectName: project.name,
        projectGenre: project.genre,
        projectContext: project.context,
      });
    } catch (aiError) {
      const message =
        aiError instanceof AiGenerationError
          ? aiError.message
          : "AI generation failed unexpectedly. Your input is saved — please retry.";
      await context.supabase
        .from("features")
        .update({ last_error: message })
        .eq("id", data.featureId);
      throw new Error(message);
    }

    const { data: generation, error: generationError } = await context.supabase
      .from("ai_generations")
      .insert({
        feature_id: data.featureId,
        project_id: data.projectId,
        model: generated.model,
        prompt_input: generated.promptInput,
        raw_output: generated.raw as never,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (generationError) throw new Error(generationError.message);

    const generationId = generation.id as string;

    if (data.mode === "regenerate") {
      // A full regeneration is an explicit, confirmed human action: it replaces the
      // whole breakdown, including previously edited rows.
      await context.supabase.from("requirements").delete().eq("feature_id", data.featureId);
      await context.supabase.from("development_tasks").delete().eq("feature_id", data.featureId);
    }

    const { breakdown } = generated;
    const requirementRows = [
      { kind: "USER_STORY" as const, content: breakdown.user_story, position: 0 },
      ...breakdown.acceptance_criteria.map((content, index) => ({
        kind: "ACCEPTANCE_CRITERION" as const,
        content,
        position: index,
      })),
      ...breakdown.edge_cases.map((content, index) => ({
        kind: "EDGE_CASE" as const,
        content,
        position: index,
      })),
    ].map((row) => ({
      feature_id: data.featureId,
      project_id: data.projectId,
      generation_id: generationId,
      kind: row.kind,
      content: row.content,
      original_content: row.content,
      source: "AI" as const,
      position: row.position,
    }));

    const { error: reqError } = await context.supabase.from("requirements").insert(requirementRows);
    if (reqError) throw new Error(reqError.message);

    const { error: taskError } = await context.supabase.from("development_tasks").insert(
      breakdown.development_tasks.map((task, index) => ({
        feature_id: data.featureId,
        project_id: data.projectId,
        generation_id: generationId,
        title: task.title,
        original_title: task.title,
        description: task.description || null,
        source: "AI" as const,
        position: index,
      })),
    );
    if (taskError) throw new Error(taskError.message);

    const { data: current } = await context.supabase
      .from("features")
      .select("priority_edited, points_edited, priority, story_points, status")
      .eq("id", data.featureId)
      .single();

    const keepPriority = current?.priority_edited === true;
    const keepPoints = current?.points_edited === true;
    const tooLarge = breakdown.too_large && breakdown.split_suggestions.length > 0;

    const { error: featureError } = await context.supabase
      .from("features")
      .update({
        ai_priority: breakdown.priority,
        ai_story_points: breakdown.story_points,
        priority: keepPriority ? current?.priority : breakdown.priority,
        story_points: keepPoints ? current?.story_points : breakdown.story_points,
        status: "AI_GENERATED",
        split_reason: tooLarge ? breakdown.split_reason || "This idea may be too large for one user story." : null,
        split_suggestions: tooLarge ? (breakdown.split_suggestions as never) : null,
        last_error: null,
      })
      .eq("id", data.featureId);
    if (featureError) throw new Error(featureError.message);

    return {
      generationId,
      keptEditedPriority: keepPriority,
      keptEditedPoints: keepPoints,
      tooLarge,
    };
  });

/**
 * Regenerates ONE section of the breakdown. Other sections are never touched.
 * Unavailable for approved ideas. The UI confirms before human-edited content is replaced.
 */
export const regenerateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        section: z.enum(["USER_STORY", "ACCEPTANCE_CRITERION", "EDGE_CASE", "TASKS"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { generateSection, AiGenerationError } = await import("@/lib/ai.server");

    const { data: feature, error } = await context.supabase
      .from("features")
      .select("id, name, description, context, status")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feature) throw new Error("FORBIDDEN: this idea is not part of the selected project.");
    if (feature.status === "APPROVED") {
      throw new Error(
        "This idea is approved. Approved work cannot be regenerated — edit it by hand instead.",
      );
    }

    const { data: project, error: projectError } = await context.supabase
      .from("projects")
      .select("name, genre, context")
      .eq("id", data.projectId)
      .maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) throw new Error("FORBIDDEN: you do not have access to this project.");

    const [requirements, tasks] = await Promise.all([
      context.supabase
        .from("requirements")
        .select("id, kind, content, position")
        .eq("feature_id", data.featureId)
        .order("position", { ascending: true }),
      context.supabase
        .from("development_tasks")
        .select("id, title, description, position, assignee_id")
        .eq("feature_id", data.featureId)
        .order("position", { ascending: true }),
    ]);
    if (requirements.error) throw new Error(requirements.error.message);
    if (tasks.error) throw new Error(tasks.error.message);

    const rows = requirements.data ?? [];
    const existing = {
      userStory: rows.find((row) => row.kind === "USER_STORY")?.content ?? null,
      acceptanceCriteria: rows
        .filter((row) => row.kind === "ACCEPTANCE_CRITERION")
        .map((row) => row.content),
      edgeCases: rows.filter((row) => row.kind === "EDGE_CASE").map((row) => row.content),
      tasks: (tasks.data ?? []).map((task) => ({
        title: task.title,
        description: task.description,
      })),
    };

    let generated;
    try {
      generated = await generateSection(
        data.section,
        {
          featureName: feature.name,
          featureDescription: feature.description,
          featureContext: feature.context,
          projectName: project.name,
          projectGenre: project.genre,
          projectContext: project.context,
        },
        existing,
      );
    } catch (aiError) {
      throw new Error(
        aiError instanceof AiGenerationError
          ? aiError.message
          : "AI regeneration failed unexpectedly. Nothing was changed — please retry.",
      );
    }

    const { data: generation, error: generationError } = await context.supabase
      .from("ai_generations")
      .insert({
        feature_id: data.featureId,
        project_id: data.projectId,
        model: generated.model,
        prompt_input: generated.promptInput as never,
        raw_output: generated.raw as never,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (generationError) throw new Error(generationError.message);
    const generationId = generation.id as string;

    if (data.section === "TASKS") {
      // Keep existing assignees where the position still exists, so human decisions survive.
      const previousAssignees = (tasks.data ?? []).map((task) => task.assignee_id ?? null);
      await context.supabase.from("development_tasks").delete().eq("feature_id", data.featureId);
      const { error: insertError } = await context.supabase.from("development_tasks").insert(
        generated.tasks.map((task, index) => ({
          feature_id: data.featureId,
          project_id: data.projectId,
          generation_id: generationId,
          title: task.title,
          original_title: task.title,
          description: task.description || null,
          source: "AI" as const,
          position: index,
          assignee_id: previousAssignees[index] ?? null,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    } else {
      const kind = data.section as "USER_STORY" | "ACCEPTANCE_CRITERION" | "EDGE_CASE";
      const keptAssignee =
        kind === "USER_STORY"
          ? ((rows.find((row) => row.kind === "USER_STORY") as { assignee_id?: string | null })
              ?.assignee_id ?? null)
          : null;

      await context.supabase
        .from("requirements")
        .delete()
        .eq("feature_id", data.featureId)
        .eq("kind", kind);

      if (generated.items.length > 0) {
        const { error: insertError } = await context.supabase.from("requirements").insert(
          generated.items.map((content, index) => ({
            feature_id: data.featureId,
            project_id: data.projectId,
            generation_id: generationId,
            kind,
            content,
            original_content: content,
            source: "AI" as const,
            position: index,
            assignee_id: keptAssignee,
          })),
        );

        if (insertError) throw new Error(insertError.message);
      }
    }

    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, data.featureId);

    return { ok: true, section: data.section };
  });

/** Human decision: turn one AI split suggestion into a real, separate draft idea. */
export const createIdeaFromSplit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        name: z.string().trim().min(3).max(160),
        description: z.string().trim().min(3).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: feature, error } = await context.supabase
      .from("features")
      .insert({
        project_id: data.projectId,
        created_by: context.userId,
        name: data.name,
        description: data.description,
        status: "DRAFT",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: feature.id as string };
  });

/**
 * Human decision: turn ALL AI split suggestions into separate draft ideas, then remove
 * the original oversized idea. The original is only removed after every new idea was
 * created successfully — a failed creation leaves the original untouched.
 * New ideas start as DRAFT: never approved, never in a sprint, never assigned.
 */
export const createIdeasFromSplit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: feature, error } = await context.supabase
      .from("features")
      .select("id, status, split_suggestions")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feature) throw new Error("FORBIDDEN: this idea is not part of the selected project.");
    if (feature.status === "APPROVED") {
      throw new Error("This idea is approved and can no longer be split.");
    }

    const suggestions = z
      .array(z.object({ name: z.string().trim().min(3).max(160), description: z.string().optional() }))
      .min(1)
      .parse(feature.split_suggestions ?? []);

    const { data: created, error: insertError } = await context.supabase
      .from("features")
      .insert(
        suggestions.map((suggestion) => ({
          project_id: data.projectId,
          created_by: context.userId,
          name: suggestion.name,
          description: (suggestion.description?.trim() || suggestion.name).slice(0, 4000),
          status: "DRAFT" as const,
        })),
      )
      .select("id");
    if (insertError) throw new Error(insertError.message);
    if (!created || created.length !== suggestions.length) {
      throw new Error("Not all ideas could be created — the original idea was kept.");
    }

    // Only now is it safe to retire the original oversized idea.
    await context.supabase
      .from("backlog_items")
      .delete()
      .eq("feature_id", data.featureId)
      .eq("project_id", data.projectId);
    const { error: deleteError } = await context.supabase
      .from("features")
      .delete()
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (deleteError) {
      throw new Error(
        `Created ${created.length} draft ideas, but the original idea could not be removed: ${deleteError.message}`,
      );
    }

    return { created: created.length };
  });


/** Dismisses the AI's split suggestion without changing any content. */
export const dismissSplitSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("features")
      .update({ split_reason: null, split_suggestions: null })
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Assigns (or unassigns) a project member to the idea's user story. */
export const setRequirementAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        requirementId: z.string().uuid(),
        assigneeId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.assigneeId) await assertProjectMembership(context, data.projectId, data.assigneeId);
    const { error } = await context.supabase
      .from("requirements")
      .update({ assignee_id: data.assigneeId })
      .eq("id", data.requirementId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Assigns (or unassigns) a project member to a single development task. */
export const setTaskAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        assigneeId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.assigneeId) await assertProjectMembership(context, data.projectId, data.assigneeId);
    const { error } = await context.supabase
      .from("development_tasks")
      .update({ assignee_id: data.assigneeId })
      .eq("id", data.taskId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Never allow assigning someone who is not a member of THIS project. */
async function assertProjectMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: { supabase: any },
  projectId: string,
  userId: string,
) {
  const { data: member, error } = await context.supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) throw new Error("FORBIDDEN: assignee is not a member of this project.");
}


export const updateRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        requirementId: z.string().uuid(),
        content: z.string().trim().min(3).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error } = await context.supabase
      .from("requirements")
      .select("id, feature_id, source, original_content, content")
      .eq("id", data.requirementId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) throw new Error("FORBIDDEN: requirement not found in this project.");

    const { error: updateError } = await context.supabase
      .from("requirements")
      .update({
        content: data.content,
        source: existing.source === "USER_CREATED" ? "USER_CREATED" : "USER_EDITED",
      })
      .eq("id", data.requirementId);
    if (updateError) throw new Error(updateError.message);

    await context.supabase
      .from("features")
      .update({ status: "USER_EDITED" })
      .eq("id", existing.feature_id)
      .neq("status", "APPROVED");

    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, existing.feature_id);

    return { ok: true };
  });

export const addRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        kind: z.enum(["USER_STORY", "ACCEPTANCE_CRITERION", "EDGE_CASE"]),
        content: z.string().trim().min(3).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("requirements").insert({
      feature_id: data.featureId,
      project_id: data.projectId,
      kind: data.kind,
      content: data.content,
      source: "USER_CREATED",
      position: 999,
    });
    if (error) throw new Error(error.message);
    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, data.featureId);

    return { ok: true };
  });

export const deleteRequirement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), requirementId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("requirements")
      .select("feature_id")
      .eq("id", data.requirementId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    const { error } = await context.supabase
      .from("requirements")
      .delete()
      .eq("id", data.requirementId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    if (existing) {
    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
      await syncBacklogFromFeature(context.supabase, data.projectId, existing.feature_id);
  
    }
    return { ok: true };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        taskId: z.string().uuid(),
        title: z.string().trim().min(3).max(300),
        description: z.string().trim().max(2000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error } = await context.supabase
      .from("development_tasks")
      .select("id, feature_id, source")
      .eq("id", data.taskId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) throw new Error("FORBIDDEN: task not found in this project.");

    const { error: updateError } = await context.supabase
      .from("development_tasks")
      .update({
        title: data.title,
        description: data.description || null,
        source: existing.source === "USER_CREATED" ? "USER_CREATED" : "USER_EDITED",
      })
      .eq("id", data.taskId);
    if (updateError) throw new Error(updateError.message);

    await context.supabase
      .from("features")
      .update({ status: "USER_EDITED" })
      .eq("id", existing.feature_id)
      .neq("status", "APPROVED");

    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, existing.feature_id);

    return { ok: true };
  });

export const addTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        title: z.string().trim().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("development_tasks").insert({
      feature_id: data.featureId,
      project_id: data.projectId,
      title: data.title,
      source: "USER_CREATED",
      position: 999,
    });
    if (error) throw new Error(error.message);
    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, data.featureId);

    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), taskId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("development_tasks")
      .select("feature_id")
      .eq("id", data.taskId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    const { error } = await context.supabase
      .from("development_tasks")
      .delete()
      .eq("id", data.taskId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    if (existing) {
    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
      await syncBacklogFromFeature(context.supabase, data.projectId, existing.feature_id);
  
    }
    return { ok: true };
  });

/** Human override of the AI's priority recommendation / story-point estimate. */
export const updateFeatureEstimates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        storyPoints: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(5),
          z.literal(8),
          z.literal(13),
        ]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.priority && !data.storyPoints) return { ok: true };
    const patch = {
      ...(data.priority ? { priority: data.priority, priority_edited: true } : {}),
      ...(data.storyPoints ? { story_points: data.storyPoints, points_edited: true } : {}),
    };


    const { error } = await context.supabase
      .from("features")
      .update(patch)
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("features")
      .update({ status: "USER_EDITED" })
      .eq("id", data.featureId)
      .neq("status", "APPROVED");

    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, data.featureId);

    return { ok: true };
  });

/**
 * Human edit of the canonical idea itself (name / description / context).
 * Available through the entire lifecycle, including after approval:
 * an approved idea stays APPROVED and keeps its approval metadata.
 */
export const updateIdeaBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        name: z.string().trim().min(3).max(160),
        description: z.string().trim().min(10).max(4000),
        context: z.string().trim().max(4000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("features")
      .select("id, status")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("FORBIDDEN: this idea is not part of the selected project.");

    const keepStatus = existing.status === "APPROVED" || existing.status === "DRAFT";
    const { error } = await context.supabase
      .from("features")
      .update({
        name: data.name,
        description: data.description,
        context: data.context || null,
        ...(keepStatus ? {} : { status: "USER_EDITED" as const }),
      })
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    const { syncBacklogFromFeature } = await import("@/lib/backlog-sync.server");
    await syncBacklogFromFeature(context.supabase, data.projectId, data.featureId);

    return { ok: true };
  });

export const rejectFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("features")
      .update({ status: "REJECTED" })
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Puts a rejected idea back into the drafts group without touching its content
 * and without re-running the AI.
 */
export const moveIdeaToDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("features")
      .select("id, status")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error("FORBIDDEN: this idea is not part of the selected project.");
    if (existing.status === "APPROVED") {
      throw new Error("Approved work lives in the backlog and cannot be moved back to drafts.");
    }

    const { count } = await context.supabase
      .from("requirements")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", data.featureId);

    const { error } = await context.supabase
      .from("features")
      .update({ status: (count ?? 0) > 0 ? "USER_EDITED" : "DRAFT" })
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/**
 * Assigns (or unassigns) a project member to the idea itself.
 * Works for drafts and approved work; approved work keeps the backlog item in sync.
 */
export const setFeatureAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        featureId: z.string().uuid(),
        assigneeId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.assigneeId) await assertProjectMembership(context, data.projectId, data.assigneeId);
    const { error } = await context.supabase
      .from("features")
      .update({ assignee_id: data.assigneeId })
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("backlog_items")
      .update({ assignee_id: data.assigneeId })
      .eq("feature_id", data.featureId)
      .eq("project_id", data.projectId);

    return { ok: true };
  });

/**
 * Deletes an idea. Requirements, tasks, AI history and the approved backlog item
 * are removed with it — the UI warns about this before calling.
 */
export const deleteFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("backlog_items")
      .delete()
      .eq("feature_id", data.featureId)
      .eq("project_id", data.projectId);

    const { error } = await context.supabase
      .from("features")
      .delete()
      .eq("id", data.featureId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/**
 * Explicit human approval. Records the approving user, a version snapshot of the
 * human-approved state and creates the backlog item from that snapshot.
 * Never assigns work to a sprint.
 */
export const approveFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), featureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: feature, error } = await context.supabase
      .from("features")
      .select("*")
      .eq("id", data.featureId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!feature) throw new Error("FORBIDDEN: this idea is not part of the selected project.");

    // Approval is only possible once an AI breakdown has been generated and reviewed.
    const { count: generationCount } = await context.supabase
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", data.featureId);
    if ((generationCount ?? 0) === 0 || feature.status === "DRAFT") {
      throw new Error("Generate the AI breakdown before approving this idea.");
    }

    const [requirements, tasks] = await Promise.all([
      context.supabase
        .from("requirements")
        .select("kind, content, source, position")
        .eq("feature_id", data.featureId)
        .order("position", { ascending: true }),
      context.supabase
        .from("development_tasks")
        .select("title, description, source, position")
        .eq("feature_id", data.featureId)
        .order("position", { ascending: true }),
    ]);
    if (requirements.error) throw new Error(requirements.error.message);
    if (tasks.error) throw new Error(tasks.error.message);

    const rows = requirements.data ?? [];
    const userStories = rows.filter((r) => r.kind === "USER_STORY");
    if (userStories.length === 0) {
      throw new Error("Generate the AI breakdown before approving this idea.");
    }
    if (userStories.length > 1) {
      throw new Error(
        "An idea can only carry one user story. Keep one and split the rest into separate ideas.",
      );
    }
    if (rows.filter((r) => r.kind === "ACCEPTANCE_CRITERION").length === 0) {
      throw new Error("Add at least one acceptance criterion before approving this idea.");
    }


    const snapshot = {
      name: feature.name,
      description: feature.description,
      context: feature.context,
      priority: feature.priority ?? feature.ai_priority ?? "MEDIUM",
      story_points: feature.story_points ?? feature.ai_story_points ?? null,
      user_stories: rows.filter((r) => r.kind === "USER_STORY").map((r) => r.content),
      acceptance_criteria: rows
        .filter((r) => r.kind === "ACCEPTANCE_CRITERION")
        .map((r) => r.content),
      edge_cases: rows.filter((r) => r.kind === "EDGE_CASE").map((r) => r.content),
      development_tasks: (tasks.data ?? []).map((t) => ({
        title: t.title,
        description: t.description,
      })),
    };

    const { count: previousApprovals } = await context.supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("feature_id", data.featureId);

    const { data: approval, error: approvalError } = await context.supabase
      .from("approvals")
      .insert({
        feature_id: data.featureId,
        project_id: data.projectId,
        approved_by: context.userId,
        version: (previousApprovals ?? 0) + 1,
        snapshot: snapshot as never,
      })
      .select("id, approved_at, version")
      .single();
    if (approvalError) throw new Error(approvalError.message);

    const { data: existingItem } = await context.supabase
      .from("backlog_items")
      .select("id")
      .eq("feature_id", data.featureId)
      .maybeSingle();

    const itemPayload = {
      project_id: data.projectId,
      feature_id: data.featureId,
      approval_id: approval.id,
      title: snapshot.name,
      description: snapshot.description,
      priority: snapshot.priority,
      story_points: snapshot.story_points,
      snapshot: snapshot as never,
      approved_by: context.userId,
      approved_at: approval.approved_at,
      assignee_id: feature.assignee_id ?? null,
    };


    if (existingItem) {
      const { error: updateError } = await context.supabase
        .from("backlog_items")
        .update(itemPayload)
        .eq("id", existingItem.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await context.supabase
        .from("backlog_items")
        .insert({ ...itemPayload, status: "UNPLANNED" });
      if (insertError) throw new Error(insertError.message);
    }

    const { error: statusError } = await context.supabase
      .from("features")
      .update({ status: "APPROVED" })
      .eq("id", data.featureId);
    if (statusError) throw new Error(statusError.message);

    return { approvalId: approval.id as string, version: approval.version as number };
  });
