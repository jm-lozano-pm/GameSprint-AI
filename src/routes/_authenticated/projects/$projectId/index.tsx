import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, ListChecks, Gauge, Plus } from "lucide-react";
import { AppShell } from "@/components/gs/app-shell";
import { ProjectIcon } from "@/components/gs/project-icon";
import { ErrorState, LoadingState, SectionCard } from "@/components/gs/states";
import { Button } from "@/components/ui/button";
import { getProject, getDashboardSummary } from "@/lib/projects.functions";
import { useProjectAccessGuard } from "@/lib/use-project-access";

export const Route = createFileRoute("/_authenticated/projects/$projectId/")({
  head: () => ({
    meta: [
      { title: "Project overview — GameSprint AI" },
      {
        name: "description",
        content:
          "Project overview in GameSprint AI: game context, idea pipeline, backlog size and sprint activity for this project only.",
      },
      { property: "og:title", content: "Project overview — GameSprint AI" },
      {
        property: "og:description",
        content: "See this game project's context, ideas, backlog and sprints in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectOverview,
});

function ProjectOverview() {
  const { projectId } = Route.useParams();
  const fetchProject = useServerFn(getProject);
  const fetchSummary = useServerFn(getDashboardSummary);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { projectId } }),
  });
  const summaryQuery = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => fetchSummary({ data: { projectId } }),
  });

  useProjectAccessGuard(projectId, projectQuery.error);

  const project = projectQuery.data;

  return (
    <AppShell
      projectId={projectId}
      title={project?.name ?? "Project"}
      titleIcon={
        project ? <ProjectIcon icon={project.icon} name={project.name} /> : undefined
      }
      subtitle={project?.genre ?? "Project overview"}
      actions={
        <Button asChild size="sm">
          <Link to="/projects/$projectId/ideas/new" params={{ projectId }}>
            <Plus className="size-4" aria-hidden />
            New idea
          </Link>
        </Button>
      }
    >
      {projectQuery.isPending ? (
        <LoadingState label="Loading project" />
      ) : projectQuery.error ? (
        <ErrorState
          message={(projectQuery.error as Error).message}
          onRetry={() => projectQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <SectionCard title="Game context" hint="Shared with the AI for this project only.">
            <p className="text-sm text-body">
              {project?.description || "No description yet."}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <Detail label="Genre" value={project?.genre || "—"} />
              <Detail
                label="Team size"
                value={project?.team_size ? String(project.team_size) : "—"}
              />
              <Detail
                label="Platforms"
                value={
                  (project?.platforms as string[] | null)?.length
                    ? (project!.platforms as string[]).join(", ")
                    : "—"
                }
              />
            </dl>
            {project?.context ? (
              <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-body">
                {project.context}
              </p>
            ) : null}
          </SectionCard>

          <div className="grid gap-3 sm:grid-cols-3">
            <NavCard
              to="/projects/$projectId/ideas"
              projectId={projectId}
              icon={Lightbulb}
              label="Ideas"
              value={summaryQuery.data?.ideas ?? 0}
              hint="Capture ideas and generate AI breakdowns."
            />
            <NavCard
              to="/projects/$projectId/backlog"
              projectId={projectId}
              icon={ListChecks}
              label="Backlog"
              value={summaryQuery.data?.backlog ?? 0}
              hint="Approved work ready for sprint planning."
            />
            <NavCard
              to="/projects/$projectId/sprints"
              projectId={projectId}
              icon={Gauge}
              label="Sprints"
              value={summaryQuery.data?.sprints ?? 0}
              hint="Plan sprints and track the board."
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function NavCard({
  to,
  projectId,
  icon: Icon,
  label,
  value,
  hint,
}: {
  to: "/projects/$projectId/ideas" | "/projects/$projectId/backlog" | "/projects/$projectId/sprints";
  projectId: string;
  icon: typeof Lightbulb;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Link
      to={to}
      params={{ projectId }}
      className="surface-card block p-5 transition-colors hover:border-primary/40"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="mt-3.5 text-xl font-semibold tracking-tight">{value}</p>
      <h2 className="text-sm font-semibold">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </Link>
  );
}
