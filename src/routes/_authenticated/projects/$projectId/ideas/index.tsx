import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Plus, ListChecks } from "lucide-react";
import { AppShell } from "@/components/gs/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/gs/states";
import { FeatureStatusBadge, PointsBadge, PriorityBadge } from "@/components/gs/badges";
import { Button } from "@/components/ui/button";
import { listFeatures } from "@/lib/features.functions";
import type { FeatureStatus, Priority } from "@/lib/gamesprint";
import { useProjectAccessGuard } from "@/lib/use-project-access";

type FeatureRow = {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string | null;
  ai_priority: string | null;
  story_points: number | null;
  ai_story_points: number | null;
};

export const Route = createFileRoute("/_authenticated/projects/$projectId/ideas/")({
  head: () => ({
    meta: [
      { title: "Ideas — GameSprint AI" },
      {
        name: "description",
        content:
          "Unfinished game ideas in this project, grouped into drafts you are still working on and ideas you rejected.",
      },
      { property: "og:title", content: "Ideas — GameSprint AI" },
      {
        property: "og:description",
        content: "Capture game ideas and review their AI-generated requirements before approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdeasPage,
});

function IdeasPage() {
  const { projectId } = Route.useParams();
  const fetchFeatures = useServerFn(listFeatures);
  const query = useQuery({
    queryKey: ["features", projectId],
    queryFn: () => fetchFeatures({ data: { projectId } }),
  });

  useProjectAccessGuard(projectId, query.error);

  const all = (query.data ?? []) as FeatureRow[];
  const drafts = all.filter(
    (feature) => feature.status !== "APPROVED" && feature.status !== "REJECTED",
  );
  const rejected = all.filter((feature) => feature.status === "REJECTED");
  const approvedCount = all.filter((feature) => feature.status === "APPROVED").length;

  return (
    <AppShell
      projectId={projectId}
      title="Ideas"
      subtitle="Unfinished work lives here. Approved work lives in the backlog."
      actions={
        <Button asChild size="sm">
          <Link to="/projects/$projectId/ideas/new" params={{ projectId }}>
            <Plus className="size-4" aria-hidden />
            New idea
          </Link>
        </Button>
      }
    >
      {query.isPending ? (
        <LoadingState label="Loading ideas" />
      ) : query.error ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          title="No ideas yet"
          description="Describe a game feature in your own words. GameSprint AI turns it into user stories, acceptance criteria, edge cases and tasks for your review."
          icon={<Lightbulb className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link to="/projects/$projectId/ideas/new" params={{ projectId }}>
                Capture an idea
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <Group
            title="Drafts"
            hint="Raw ideas, AI breakdowns and edits that are not approved yet."
            projectId={projectId}
            items={drafts}
            emptyTitle="No drafts yet"
            emptyDescription="Capture an idea or save an AI breakdown to continue later."
          />
          <Group
            title="Rejected"
            hint="Kept for reference. Open one and move it back to drafts to continue."
            projectId={projectId}
            items={rejected}
            emptyTitle="Nothing rejected"
            emptyDescription="Ideas you reject stay here so you can revisit them later."
          />

          {approvedCount > 0 ? (
            <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="size-4 text-success" aria-hidden />
                  {approvedCount} approved idea{approvedCount === 1 ? "" : "s"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approved work is development work — it lives in the backlog and sprints.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/projects/$projectId/backlog" params={{ projectId }}>
                  Open backlog
                </Link>
              </Button>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function Group({
  title,
  hint,
  items,
  projectId,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  hint: string;
  items: FeatureRow[];
  projectId: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title} ({items.length})
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {items.length === 0 ? (
        <div className="px-1 py-6">
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((feature) => (
            <li key={feature.id}>
              <Link
                to="/projects/$projectId/ideas/$featureId"
                params={{ projectId, featureId: feature.id }}
                className="surface-card block p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{feature.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <FeatureStatusBadge status={feature.status as FeatureStatus} />
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {feature.priority || feature.ai_priority ? (
                    <PriorityBadge
                      priority={(feature.priority ?? feature.ai_priority) as Priority}
                      recommendation={!feature.priority}
                    />
                  ) : null}
                  <PointsBadge points={feature.story_points ?? feature.ai_story_points ?? null} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
