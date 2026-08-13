import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SearchResult = {
  kind: "IDEA" | "BACKLOG" | "SPRINT";
  id: string;
  title: string;
  subtitle: string | null;
  featureId: string | null;
};

/**
 * Search is ALWAYS scoped to a single project: results can never leak across
 * projects. RLS additionally restricts rows to projects the user belongs to.
 */
export const searchProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: z.string().uuid(), query: z.string().trim().min(1).max(120) })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<SearchResult[]> => {
    const term = `%${data.query.replace(/[%_]/g, "")}%`;

    const [features, items, sprints] = await Promise.all([
      context.supabase
        .from("features")
        .select("id, name, description, status")
        .eq("project_id", data.projectId)
        .or(`name.ilike.${term},description.ilike.${term}`)
        .limit(8),
      context.supabase
        .from("backlog_items")
        .select("id, title, description, status, feature_id")
        .eq("project_id", data.projectId)
        .or(`title.ilike.${term},description.ilike.${term}`)
        .limit(8),
      context.supabase
        .from("sprints")
        .select("id, name, goal, status")
        .eq("project_id", data.projectId)
        .or(`name.ilike.${term},goal.ilike.${term}`)
        .limit(6),
    ]);

    if (features.error) throw new Error(features.error.message);
    if (items.error) throw new Error(items.error.message);
    if (sprints.error) throw new Error(sprints.error.message);

    return [
      ...(features.data ?? []).map((row) => ({
        kind: "IDEA" as const,
        id: row.id as string,
        title: row.name as string,
        subtitle: (row.description as string | null) ?? null,
        featureId: row.id as string,
      })),
      ...(items.data ?? []).map((row) => ({
        kind: "BACKLOG" as const,
        id: row.id as string,
        title: row.title as string,
        subtitle: (row.description as string | null) ?? null,
        featureId: (row.feature_id as string | null) ?? null,
      })),
      ...(sprints.data ?? []).map((row) => ({
        kind: "SPRINT" as const,
        id: row.id as string,
        title: row.name as string,
        subtitle: (row.goal as string | null) ?? null,
        featureId: null,
      })),
    ];
  });
