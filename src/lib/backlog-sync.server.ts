/**
 * Keeps the backlog representation of an APPROVED idea consistent with the
 * canonical idea content after a human edit.
 *
 * Product rules enforced here:
 * - Workflow status is never moved backwards.
 * - Approval metadata (approved_by / approved_at / approval_id) is preserved.
 * - Sprint assignment and board status are left untouched.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function syncBacklogFromFeature(
  supabase: Client,
  projectId: string,
  featureId: string,
): Promise<void> {
  const { data: feature } = await supabase
    .from("features")
    .select("id, name, description, context, priority, ai_priority, story_points, ai_story_points, status")
    .eq("id", featureId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!feature) return;

  const { data: item } = await supabase
    .from("backlog_items")
    .select("id")
    .eq("feature_id", featureId)
    .maybeSingle();
  if (!item) return;

  const [requirements, tasks] = await Promise.all([
    supabase
      .from("requirements")
      .select("kind, content, position")
      .eq("feature_id", featureId)
      .order("position", { ascending: true }),
    supabase
      .from("development_tasks")
      .select("title, description, position")
      .eq("feature_id", featureId)
      .order("position", { ascending: true }),
  ]);

  const rows: Array<{ kind: string; content: string }> = requirements.data ?? [];
  const snapshot = {
    name: feature.name,
    description: feature.description,
    context: feature.context,
    priority: feature.priority ?? feature.ai_priority,
    story_points: feature.story_points ?? feature.ai_story_points,
    user_stories: rows.filter((r) => r.kind === "USER_STORY").map((r) => r.content),
    acceptance_criteria: rows
      .filter((r) => r.kind === "ACCEPTANCE_CRITERION")
      .map((r) => r.content),
    edge_cases: rows.filter((r) => r.kind === "EDGE_CASE").map((r) => r.content),
    development_tasks: (tasks.data ?? []).map(
      (t: { title: string; description: string | null }) => ({
        title: t.title,
        description: t.description,
      }),
    ),
  };

  // Deliberately does NOT touch status, sprint_id, assignee_id, approval_id,
  // approved_by or approved_at.
  await supabase
    .from("backlog_items")
    .update({
      title: snapshot.name,
      description: snapshot.description,
      priority: snapshot.priority,
      story_points: snapshot.story_points,
      snapshot: snapshot,
    })
    .eq("id", item.id);
}
