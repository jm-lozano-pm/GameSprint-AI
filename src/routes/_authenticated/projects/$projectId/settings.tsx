import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Settings2, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { ErrorState, LoadingState, SectionCard } from "@/components/gs/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProject, updateProject, deleteProject } from "@/lib/projects.functions";
import { useProjectAccessGuard } from "@/lib/use-project-access";
import { PLATFORMS } from "@/lib/gamesprint";
import { IconPickerField, IconInsertButton } from "@/components/gs/emoji-icon-picker";
import { ProjectIcon } from "@/components/gs/project-icon";


export const Route = createFileRoute("/_authenticated/projects/$projectId/settings")({
  head: () => ({
    meta: [
      { title: "Project settings — GameSprint AI" },
      {
        name: "description",
        content:
          "Edit this game project's name, genre, team size, platforms and the context shared with the AI.",
      },
      { property: "og:title", content: "Project settings — GameSprint AI" },
      {
        property: "og:description",
        content: "Keep the project context accurate so AI breakdowns stay relevant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchProject = useServerFn(getProject);
  const save = useServerFn(updateProject);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject({ data: { projectId } }),
  });

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  /** Personalization inserts at the cursor instead of replacing the text. */
  const insertIntoDescription = (value: string) => {
    const field = descriptionRef.current;
    if (!field) {
      setDescription((current) => `${current}${value}`);
      return;
    }
    const start = field.selectionStart ?? description.length;
    const end = field.selectionEnd ?? start;
    const next = `${description.slice(0, start)}${value}${description.slice(end)}`;
    setDescription(next);
    requestAnimationFrame(() => {
      field.focus();
      const caret = start + value.length;
      field.setSelectionRange(caret, caret);
    });
  };
  const [genre, setGenre] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [context, setContext] = useState("");

  useProjectAccessGuard(projectId, projectQuery.error);

  const project = projectQuery.data;

  useEffect(() => {
    if (!project) return;
    setName(project.name ?? "");
    setIcon((project.icon as string | null) ?? null);
    setDescription(project.description ?? "");
    setGenre(project.genre ?? "");
    setTeamSize(project.team_size ? String(project.team_size) : "");
    setPlatforms((project.platforms as string[] | null) ?? []);
    setContext(project.context ?? "");
  }, [project]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          projectId,
          name,
          icon,
          description,
          genre,
          teamSize: teamSize ? Number(teamSize) : null,
          platforms,
          context,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      projectId={projectId}
      title="Settings"
      subtitle="This context is shared with the AI for this project only."
    >
      {projectQuery.isPending ? (
        <LoadingState label="Loading project" />
      ) : projectQuery.error ? (
        <ErrorState
          message={(projectQuery.error as Error).message}
          onRetry={() => projectQuery.refetch()}
        />
      ) : (
        <div className="mx-auto max-w-2xl">
          <SectionCard
            title="Project details"
            hint="Only owners, admins and designers can save changes."
            icon={<Settings2 className="size-4 text-primary" aria-hidden />}
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="project-name">Project name</Label>
                <div className="flex items-center gap-2">
                  <ProjectIcon icon={icon} name={name} />
                  <IconPickerField value={icon} onChange={setIcon} label="project icon" />
                  <Input
                    id="project-name"
                    className="flex-1"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="project-description">Description</Label>
                  <IconInsertButton onInsert={insertIntoDescription} />
                </div>
                <Textarea
                  id="project-description"
                  ref={descriptionRef}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-genre">Genre</Label>
                  <Input
                    id="project-genre"
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
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
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Platforms</span>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => {
                    const active = platforms.includes(platform);
                    return (
                      <Button
                        key={platform}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
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
              <div className="space-y-1.5">
                <Label htmlFor="project-context">AI context (optional)</Label>
                <Textarea
                  id="project-context"
                  rows={4}
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Engine, art direction, target audience, technical constraints…"
                />
              </div>
              <Button type="submit" disabled={name.trim().length < 2 || mutation.isPending}>
                Save changes
              </Button>
            </form>
          </SectionCard>

          <DangerZone projectId={projectId} projectName={project?.name ?? ""} />
        </div>
      )}
    </AppShell>
  );
}

/** Permanent project deletion. Requires typing the exact project name. */
function DangerZone({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const remove = useServerFn(deleteProject);
  const [confirmName, setConfirmName] = useState("");

  const mutation = useMutation({
    mutationFn: () => remove({ data: { projectId, confirmName } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      navigate({ to: "/projects" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive-soft/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <TriangleAlert className="size-4" aria-hidden />
        Danger zone
      </h2>
      <p className="mt-1.5 text-sm text-body">
        Deleting this project permanently removes every idea, AI breakdown, approval, backlog item
        and sprint inside it, for all members. This cannot be undone.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="confirm-project-name">
            Type <span className="font-semibold">{projectName}</span> to confirm
          </Label>
          <Input
            id="confirm-project-name"
            value={confirmName}
            autoComplete="off"
            onChange={(event) => setConfirmName(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="destructive"
          disabled={mutation.isPending || confirmName.trim() !== projectName.trim() || !projectName}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete this project
        </Button>
      </form>
    </div>
  );
}

