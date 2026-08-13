import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Lightbulb,
  CheckCircle2,
  ListChecks,
  Gauge,
  Plus,
  FolderPlus,
  PenLine,
} from "lucide-react";
import { AppShell } from "@/components/gs/app-shell";
import { LoadingState, EmptyState, ErrorState, SectionCard } from "@/components/gs/states";
import { FeatureStatusBadge } from "@/components/gs/badges";
import { Button } from "@/components/ui/button";
import { listProjects, getDashboardSummary } from "@/lib/projects.functions";
import { getOnboardingState } from "@/lib/onboarding.functions";
import type { FeatureStatus } from "@/lib/gamesprint";

export const Route = createFileRoute("/_authenticated/dashboard")({
  // First-time accounts finish setup before landing here; completed or skipped
  // onboarding never shows again.
  beforeLoad: async () => {
    try {
      const state = await getOnboardingState();
      if (state.status === "PENDING") throw redirect({ to: "/onboarding" });
    } catch (error) {
      if (isRedirect(error)) throw error;
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — GameSprint AI" },
      {
        name: "description",
        content:
          "Your GameSprint AI dashboard: idea pipeline, approved work, backlog size and the active sprint at a glance.",
      },
      { property: "og:title", content: "Dashboard — GameSprint AI" },
      {
        property: "og:description",
        content: "Track ideas, approvals, backlog and sprint progress for your game project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const STORAGE_KEY = "gamesprint.lastProjectId";

function Dashboard() {
  const navigate = useNavigate();
  const fetchProjects = useServerFn(listProjects);
  const fetchSummary = useServerFn(getDashboardSummary);
  const [projectId, setProjectId] = useState<string | null>(null);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (projects.length === 0) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const match = projects.find((project) => project.id === stored);
    setProjectId(match?.id ?? projects[0]!.id);
  }, [projects]);

  useEffect(() => {
    if (projectId) window.localStorage.setItem(STORAGE_KEY, projectId);
  }, [projectId]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => fetchSummary({ data: { projectId } }),
    enabled: projectsQuery.isSuccess,
  });

  const summary = summaryQuery.data;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Everything below is scoped to the selected project."
      {...(projectId ? { projectId } : {})}
      actions={
        projectId ? (
          <Button
            size="sm"
            onClick={() =>
              navigate({ to: "/projects/$projectId/ideas/new", params: { projectId } })
            }
          >
            <Plus className="size-4" aria-hidden />
            New idea
          </Button>
        ) : null
      }
    >
      {projectsQuery.isPending ? (
        <LoadingState label="Loading your projects" />
      ) : projectsQuery.error ? (
        <ErrorState message={(projectsQuery.error as Error).message} onRetry={() => projectsQuery.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="Create your first game project"
          description="Projects keep each game's ideas, requirements and sprints isolated from every other project."
          icon={<FolderPlus className="size-5" aria-hidden />}
          action={
            <Button onClick={() => navigate({ to: "/projects" })}>Create a project</Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric icon={PenLine} label="Drafts" value={summary?.drafts ?? 0} />
            <Metric icon={Lightbulb} label="Needs review" value={summary?.needsReview ?? 0} />
            <Metric icon={CheckCircle2} label="Approved" value={summary?.approved ?? 0} tone="success" />
            <Metric icon={ListChecks} label="Backlog items" value={summary?.backlog ?? 0} tone="dev" />
            <Metric icon={Gauge} label="Sprints" value={summary?.sprints ?? 0} />
          </div>

          <SectionCard
            title="Recent ideas"
            hint="Newest ideas in this project and where they are in the workflow."
            actions={
              projectId ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/projects/$projectId/ideas" params={{ projectId }}>
                    View all
                  </Link>
                </Button>
              ) : null
            }
          >
            {summaryQuery.isPending ? (
              <LoadingState label="Loading activity" />
            ) : (summary?.recentIdeas.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No ideas yet. Capture your first game idea to get an AI breakdown.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {summary?.recentIdeas.map((idea) => (
                  <li key={idea.id}>
                    <Link
                      to="/projects/$projectId/ideas/$featureId"
                      params={{ projectId: projectId!, featureId: idea.id }}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"
                    >
                      <span className="text-sm font-medium">{idea.name}</span>
                      <FeatureStatusBadge status={idea.status as FeatureStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {summary?.currentSprint && summary.currentSprint.status === "ACTIVE" ? (
            <SectionCard
              title="Current sprint"
              hint={`${summary.currentSprint.name} · active`}
              icon={<Gauge className="size-4 text-success" aria-hidden />}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {summary.currentSprint.start_date ?? "No start date"} —{" "}
                    {summary.currentSprint.end_date ?? "No end date"}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {summary.sprintDone}/{summary.sprintItems} items done ·{" "}
                    {summary.sprintPoints} pts committed
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/projects/$projectId/sprints/$sprintId"
                    params={{ projectId: projectId!, sprintId: summary.currentSprint.id }}
                  >
                    View sprint
                  </Link>
                </Button>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Current sprint"
              hint="Sprints are started explicitly by your team."
              icon={<Gauge className="size-4 text-muted-foreground" aria-hidden />}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">No active sprint.</p>
                {projectId ? (
                  <Button asChild size="sm">
                    <Link to="/projects/$projectId/sprints" params={{ projectId }}>
                      Start a sprint
                    </Link>
                  </Button>
                ) : null}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Lightbulb;
  label: string;
  value: number;
  tone?: "primary" | "success" | "dev";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    dev: "bg-dev-soft text-dev",
  };
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
