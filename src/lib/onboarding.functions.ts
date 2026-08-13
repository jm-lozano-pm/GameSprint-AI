import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type OnboardingStatus = "PENDING" | "COMPLETED" | "SKIPPED";

/** First-time setup state for the signed-in user. */
export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "display_name, onboarding_status, studio_name, studio_website, studio_team_size, default_sprint_length_weeks, planning_tool",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      status: (data?.onboarding_status ?? "PENDING") as OnboardingStatus,
      displayName: data?.display_name ?? null,
      studioName: data?.studio_name ?? "",
      studioWebsite: data?.studio_website ?? "",
      teamSize: data?.studio_team_size ?? "",
      sprintLengthWeeks: data?.default_sprint_length_weeks ?? null,
      planningTool: data?.planning_tool ?? "",
    };
  });

const studioSchema = z.object({
  studioName: z.string().trim().max(120).optional().default(""),
  studioWebsite: z.string().trim().max(255).optional().default(""),
  teamSize: z.string().trim().max(40).optional().default(""),
  sprintLengthWeeks: z.number().int().min(1).max(4).nullable().optional(),
  planningTool: z.string().trim().max(40).optional().default(""),
});

/** Saves whatever the user has entered so far without finishing onboarding. */
export const saveOnboardingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        studio_name: data.studioName || null,
        studio_website: data.studioWebsite || null,
        studio_team_size: data.teamSize || null,
        default_sprint_length_weeks: data.sprintLengthWeeks ?? null,
        planning_tool: data.planningTool || null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Ends onboarding. `outcome` records whether the user finished the steps or
 * skipped out; either way they are never sent through onboarding again.
 * A first project is created only when a real name was provided.
 */
export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    studioSchema
      .extend({
        outcome: z.enum(["COMPLETED", "SKIPPED"]),
        projectName: z.string().trim().max(120).optional().default(""),
        genre: z.string().trim().max(80).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        studio_name: data.studioName || null,
        studio_website: data.studioWebsite || null,
        studio_team_size: data.teamSize || null,
        default_sprint_length_weeks: data.sprintLengthWeeks ?? null,
        planning_tool: data.planningTool || null,
        onboarding_status: data.outcome,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    let projectId: string | null = null;
    if (data.projectName.length >= 2) {
      const teamSizeNumber = /^\d+$/.test(data.teamSize) ? Number(data.teamSize) : NaN;
      const args: Record<string, unknown> = {
        _name: data.projectName,
        _platforms: [],
      };
      if (data.genre) args["_genre"] = data.genre;
      if (Number.isFinite(teamSizeNumber) && teamSizeNumber > 0) {
        args["_team_size"] = Math.min(teamSizeNumber, 500);
      }
      const { data: newId, error: projectError } = await context.supabase.rpc(
        "create_project_with_owner",
        args as never,
      );
      if (projectError) throw new Error(projectError.message);
      projectId = (newId as string) ?? null;
    }

    return { ok: true, projectId };
  });
