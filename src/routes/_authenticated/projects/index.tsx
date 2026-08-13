import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/gs/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProject, listProjects } from "@/lib/projects.functions";
import { ProjectIcon } from "@/components/gs/project-icon";
import { IconPickerField, IconInsertButton } from "@/components/gs/emoji-icon-picker";
import { PLATFORMS } from "@/lib/gamesprint";
import { GameSprintLogo } from "@/components/gs/gamesprint-logo";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — GameSprint AI" },
      {
        name: "description",
        content:
          "All your game projects in GameSprint AI. Each project isolates its ideas, requirements, backlog and sprints.",
      },
      { property: "og:title", content: "Projects — GameSprint AI" },
      {
        property: "og:description",
        content: "Create and open game projects, each with its own isolated planning workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProjects = useServerFn(listProjects);
  const create = useServerFn(createProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          name,
          icon,
          genre,
          description,
          platforms,
          ...(teamSize ? { teamSize: Number(teamSize) } : {}),
        },
      }),
    onSuccess: (result) => {
      toast.success("Project created");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName("");
      setIcon(null);
      setGenre("");
      setDescription("");
      setTeamSize("");
      setPlatforms([]);
      navigate({ to: "/projects/$projectId", params: { projectId: result.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const projects = projectsQuery.data ?? [];

  return (
    <AppShell
      title="Projects"
      subtitle="Every project is an isolated planning workspace."
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New project
        </Button>
      }
    >
      {projectsQuery.isPending ? (
        <LoadingState label="Loading projects" />
      ) : projectsQuery.error ? (
        <ErrorState
          message={(projectsQuery.error as Error).message}
          onRetry={() => projectsQuery.refetch()}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project for your game so its ideas, requirements and sprints stay separate from everything else."
          icon={<GameSprintLogo variant="symbol" height={28} decorative />}
          action={<Button onClick={() => setOpen(true)}>Create project</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="surface-card block h-full p-5 transition-colors hover:border-primary/40"
              >
                <ProjectIcon icon={project.icon} name={project.name} />
                <h2 className="mt-3.5 text-sm font-semibold">{project.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description || "No description yet."}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {[project.genre, project.team_size ? `${project.team_size} people` : null]
                    .filter(Boolean)
                    .join(" · ") || "Details not set"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New game project</DialogTitle>
            <DialogDescription>
              Project context helps the AI produce breakdowns that fit your game and team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <div className="flex items-center gap-2">
                <ProjectIcon icon={icon} name={name} />
                <IconPickerField
                  value={icon}
                  onChange={setIcon}
                  label="project icon"
                  buttonId="project-icon"
                />
                <Input
                  id="project-name"
                  className="flex-1"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Neon Drift"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-genre">Genre</Label>
                <Input
                  id="project-genre"
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  placeholder="Arcade racer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-team">Team size</Label>
                <Input
                  id="project-team"
                  type="number"
                  min={1}
                  value={teamSize}
                  onChange={(event) => setTeamSize(event.target.value)}
                  placeholder="4"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="project-description">Description</Label>
                <IconInsertButton
                  onInsert={(value) => setDescription((current) => `${current}${value}`)}
                />
              </div>
              <Textarea
                id="project-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A neon-soaked arcade racer with roguelike run structure."
              />
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const active = platforms.includes(platform);
                  return (
                    <Button
                      key={platform}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() =>
                        setPlatforms((current) =>
                          active
                            ? current.filter((value) => value !== platform)
                            : [...current, platform],
                        )
                      }
                    >
                      {platform}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || name.trim().length < 2}
            >
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
