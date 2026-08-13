import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Plus,
  ListChecks,
  ShieldAlert,
  BookOpen,
  AlertTriangle,
  Loader2,
  Undo2,
  Save,
  Scissors,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { ErrorState, LoadingState, SectionCard } from "@/components/gs/states";
import {
  BoardStatusBadge,
  ContentMetaBadge,
  NeedsReviewBadge,
  PointsBadge,
  PriorityBadge,
  SourceBadge,
  WorkflowStatusBadge,
} from "@/components/gs/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getFeatureDetail,
  generateBreakdownForFeature,
  regenerateSection,
  updateRequirement,
  addRequirement,
  deleteRequirement,
  updateTask,
  addTask,
  deleteTask,
  updateFeatureEstimates,
  approveFeature,
  updateIdeaBasics,
  rejectFeature,
  moveIdeaToDrafts,
  deleteFeature,
  setFeatureAssignee,
  setRequirementAssignee,
  setTaskAssignee,
  createIdeasFromSplit,
  dismissSplitSuggestion,
} from "@/lib/features.functions";
import { getProjectMembers } from "@/lib/projects.functions";
import { assignToSprint, listSprints, setItemStatus } from "@/lib/sprints.functions";
import { useProjectAccessGuard } from "@/lib/use-project-access";
import {
  BOARD_STATUSES,
  BOARD_STATUS_LABELS,
  PRIORITIES,
  STORY_POINT_SCALE,
  hasBreakdown,
  workflowStatus,
  type BoardStatus,
  type ContentSource,
  type FeatureStatus,
  type Priority,
  type RequirementKind,
  type StoryPoints,
} from "@/lib/gamesprint";

export const Route = createFileRoute("/_authenticated/projects/$projectId/ideas/$featureId")({
  head: () => ({
    meta: [
      { title: "Review AI breakdown — GameSprint AI" },
      {
        name: "description",
        content:
          "Review, edit and approve the AI-generated user story, acceptance criteria, edge cases and development tasks for this game idea.",
      },
      { property: "og:title", content: "Review AI breakdown — GameSprint AI" },
      {
        property: "og:description",
        content: "AI recommends, humans decide: edit and approve before anything becomes work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdeaDetailPage,
});

type Member = { user_id: string; display_name: string | null; email: string | null };

function IdeaDetailPage() {
  const { projectId, featureId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchDetail = useServerFn(getFeatureDetail);
  const fetchMembers = useServerFn(getProjectMembers);
  const generate = useServerFn(generateBreakdownForFeature);
  const regenerate = useServerFn(regenerateSection);
  const editRequirement = useServerFn(updateRequirement);
  const createRequirement = useServerFn(addRequirement);
  const removeRequirement = useServerFn(deleteRequirement);
  const editTask = useServerFn(updateTask);
  const createTask = useServerFn(addTask);
  const removeTask = useServerFn(deleteTask);
  const saveEstimates = useServerFn(updateFeatureEstimates);
  const approve = useServerFn(approveFeature);
  const saveBasics = useServerFn(updateIdeaBasics);
  const reject = useServerFn(rejectFeature);
  const moveToDrafts = useServerFn(moveIdeaToDrafts);
  const removeIdea = useServerFn(deleteFeature);
  const assignIdea = useServerFn(setFeatureAssignee);
  const assignRequirement = useServerFn(setRequirementAssignee);
  const assignTask = useServerFn(setTaskAssignee);
  const splitAll = useServerFn(createIdeasFromSplit);
  const dismissSplit = useServerFn(dismissSplitSuggestion);
  const changeExecutionStatus = useServerFn(setItemStatus);
  const changeSprint = useServerFn(assignToSprint);
  const fetchSprints = useServerFn(listSprints);

  const detailKey = ["feature", projectId, featureId];
  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => fetchDetail({ data: { projectId, featureId } }),
  });
  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => fetchMembers({ data: { projectId } }),
  });
  const sprintsQuery = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => fetchSprints({ data: { projectId } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: detailKey });
    queryClient.invalidateQueries({ queryKey: ["features", projectId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
    queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
  };

  const run = <TArgs,>(fn: (args: TArgs) => Promise<unknown>, success: string) =>
    useMutationFactory(fn, success, invalidate);

  const generateMutation = useMutation({
    mutationFn: (mode: "initial" | "regenerate") =>
      generate({ data: { projectId, featureId, mode } }),
    onSuccess: (result) => {
      invalidate();
      const kept =
        result.keptEditedPriority || result.keptEditedPoints
          ? " Your manual priority/estimate overrides were kept."
          : "";
      toast.success(`Breakdown updated.${kept}`);
      if (result.tooLarge) {
        toast.warning("The AI thinks this idea may be too large — see its split suggestion.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sectionMutation = useMutation({
    mutationFn: (section: "USER_STORY" | "ACCEPTANCE_CRITERION" | "EDGE_CASE" | "TASKS") =>
      regenerate({ data: { projectId, featureId, section } }),
    onSuccess: () => {
      invalidate();
      toast.success("Section regenerated. Everything else was left untouched.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const requirementMutation = run(
    (input: { requirementId: string; content: string }) =>
      editRequirement({ data: { projectId, ...input } }),
    "Requirement updated",
  );
  const addRequirementMutation = run(
    (input: { kind: RequirementKind; content: string }) =>
      createRequirement({ data: { projectId, featureId, ...input } }),
    "Added",
  );
  const deleteRequirementMutation = run(
    (requirementId: string) => removeRequirement({ data: { projectId, requirementId } }),
    "Removed",
  );
  const taskMutation = run(
    (input: { taskId: string; title: string; description: string }) =>
      editTask({ data: { projectId, ...input } }),
    "Task updated",
  );
  const addTaskMutation = run(
    (title: string) => createTask({ data: { projectId, featureId, title } }),
    "Task added",
  );
  const deleteTaskMutation = run(
    (taskId: string) => removeTask({ data: { projectId, taskId } }),
    "Task removed",
  );
  const estimatesMutation = run(
    (input: { priority?: Priority; storyPoints?: StoryPoints }) =>
      saveEstimates({ data: { projectId, featureId, ...input } }),
    "Saved your override",
  );
  const ideaAssigneeMutation = run(
    (assigneeId: string | null) => assignIdea({ data: { projectId, featureId, assigneeId } }),
    "Assignment updated",
  );
  const requirementAssigneeMutation = run(
    (input: { requirementId: string; assigneeId: string | null }) =>
      assignRequirement({ data: { projectId, ...input } }),
    "Assignment updated",
  );
  const taskAssigneeMutation = run(
    (input: { taskId: string; assigneeId: string | null }) =>
      assignTask({ data: { projectId, ...input } }),
    "Assignment updated",
  );
  const executionMutation = run(
    (input: { itemId: string; status: BoardStatus }) =>
      changeExecutionStatus({ data: { projectId, ...input } }),
    "Execution status updated",
  );
  const sprintMutation = run(
    (input: { itemId: string; sprintId: string | null }) =>
      changeSprint({ data: { projectId, ...input } }),
    "Sprint assignment updated",
  );
  const dismissSplitMutation = run(
    () => dismissSplit({ data: { projectId, featureId } }),
    "Split suggestion dismissed",
  );

  const splitMutation = useMutation({
    mutationFn: () => splitAll({ data: { projectId, featureId } }),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        `Created ${result.created} draft ideas. The original oversized idea was removed.`,
      );
      navigate({ to: "/projects/$projectId/ideas", params: { projectId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const basicsMutation = useMutation({
    mutationFn: (input: { name: string; description: string; context: string }) =>
      saveBasics({ data: { projectId, featureId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Idea updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approveMutation = useMutation({
    mutationFn: () => approve({ data: { projectId, featureId } }),
    onSuccess: (result) => {
      invalidate();
      toast.success(`Approved (v${result.version}). Added to the backlog.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const rejectMutation = run(() => reject({ data: { projectId, featureId } }), "Idea rejected");
  const moveToDraftsMutation = run(
    () => moveToDrafts({ data: { projectId, featureId } }),
    "Moved back to drafts",
  );

  const deleteMutation = useMutation({
    mutationFn: () => removeIdea({ data: { projectId, featureId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Idea deleted");
      navigate({ to: "/projects/$projectId/ideas", params: { projectId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useProjectAccessGuard(projectId, detailQuery.error, { fallback: "ideas" });

  if (detailQuery.isPending) {
    return (
      <AppShell projectId={projectId} title="Idea">
        <LoadingState label="Loading idea" />
      </AppShell>
    );
  }

  if (detailQuery.error) {
    return (
      <AppShell projectId={projectId} title="Idea">
        <ErrorState
          message={(detailQuery.error as Error).message}
          onRetry={() => detailQuery.refetch()}
        />
      </AppShell>
    );
  }

  const detail = detailQuery.data!;
  const feature = detail.feature;
  const status = feature.status as FeatureStatus;
  const approved = status === "APPROVED";
  const rejected = status === "REJECTED";
  const members = (membersQuery.data ?? []) as Member[];

  const requirements = detail.requirements as Array<{
    id: string;
    kind: RequirementKind;
    content: string;
    source: ContentSource;
    assignee_id: string | null;
  }>;
  const byKind = (kind: RequirementKind) => requirements.filter((item) => item.kind === kind);
  const tasks = detail.tasks as Array<{
    id: string;
    title: string;
    description: string | null;
    source: ContentSource;
    assignee_id: string | null;
  }>;
  const generating = generateMutation.isPending;
  const generated = detail.generations.length > 0;
  const userStories = byKind("USER_STORY");
  const hasHumanEdits = [...requirements, ...tasks].some((item) => item.source !== "AI");
  const backlogItem =
    (detail.backlogItems as Array<{ id: string; status: string; sprint_id: string | null }>)[0] ??
    null;
  const splitSuggestions = (feature.split_suggestions ?? []) as Array<{
    name: string;
    description: string;
  }>;

  const regenerateAllButton = approved ? null : (
    <ConfirmAction
      trigger={
        <Button variant="outline" size="sm" disabled={generating}>
          {generating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {generated ? "Regenerate all" : "Generate breakdown"}
        </Button>
      }
      skip={!generated || !hasHumanEdits}
      title="Replace the whole breakdown?"
      description="This idea contains content you edited or wrote yourself. Regenerating everything replaces the user story, acceptance criteria, edge cases and tasks with a fresh AI draft. Your priority and story-point overrides are kept."
      confirmLabel="Replace everything"
      onConfirm={() => generateMutation.mutate(generated ? "regenerate" : "initial")}
    />
  );

  return (
    <AppShell
      projectId={projectId}
      title={feature.name}
      subtitle="AI recommends. You decide what becomes work."
    >
      <div className="space-y-5">
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <WorkflowStatusBadge status={workflowStatus(status)} />
            <ContentMetaBadge status={status} />
            {status === "AI_GENERATED" ? <NeedsReviewBadge /> : null}
            {feature.priority || feature.ai_priority ? (
              <PriorityBadge
                priority={(feature.priority ?? feature.ai_priority) as Priority}
                recommendation={!feature.priority}
              />
            ) : null}
            <PointsBadge points={feature.story_points ?? feature.ai_story_points ?? null} />
            {backlogItem ? <BoardStatusBadge status={backlogItem.status as BoardStatus} /> : null}
          </div>
          <IdeaBasics
            name={feature.name}
            description={feature.description}
            context={feature.context ?? ""}
            saving={basicsMutation.isPending}
            onSave={(input) => basicsMutation.mutate(input)}
          />
          {feature.last_error ? (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              The last AI breakdown failed: {feature.last_error}. Your idea is safe — try
              regenerating.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="priority-select">
                Priority (your decision)
              </label>
              <Select
                value={(feature.priority ?? feature.ai_priority ?? "") as string}
                onValueChange={(value) =>
                  estimatesMutation.mutate({ priority: value as Priority })
                }
              >
                <SelectTrigger id="priority-select">
                  <SelectValue placeholder="Set priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="points-select">
                Story points (your decision)
              </label>
              <Select
                value={String(feature.story_points ?? feature.ai_story_points ?? "")}
                onValueChange={(value) =>
                  estimatesMutation.mutate({ storyPoints: Number(value) as StoryPoints })
                }
              >
                <SelectTrigger id="points-select">
                  <SelectValue placeholder="Set estimate" />
                </SelectTrigger>
                <SelectContent>
                  {STORY_POINT_SCALE.map((points) => (
                    <SelectItem key={points} value={String(points)}>
                      {points} points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Assigned to</span>
              <AssigneeSelect
                members={members}
                value={(feature.assignee_id as string | null) ?? null}
                onChange={(assigneeId) => ideaAssigneeMutation.mutate(assigneeId)}
                ariaLabel="Assign this idea to a member"
              />
            </div>
            {backlogItem ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Sprint</span>
                <Select
                  value={backlogItem.sprint_id ?? "none"}
                  onValueChange={(value) =>
                    sprintMutation.mutate({
                      itemId: backlogItem.id,
                      sprintId: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger aria-label="Sprint">
                    <SelectValue placeholder="Unplanned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unplanned</SelectItem>
                    {(sprintsQuery.data ?? []).map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {backlogItem ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Execution status</span>
                <Select
                  value={backlogItem.status}
                  onValueChange={(value) =>
                    executionMutation.mutate({
                      itemId: backlogItem.id,
                      status: value as BoardStatus,
                    })
                  }
                >
                  <SelectTrigger aria-label="Execution status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_STATUSES.filter(
                      (value) => backlogItem.sprint_id || value === "UNPLANNED",
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {BOARD_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {feature.ai_priority || feature.ai_story_points ? (
            <p className="mt-3 text-xs text-muted-foreground">
              AI recommended {feature.ai_priority?.toLowerCase() ?? "—"} priority and{" "}
              {feature.ai_story_points ?? "—"} story points.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">{regenerateAllButton}</div>
        </div>

        {feature.split_reason && !approved ? (
          <SectionCard
            title="This idea may be too large"
            hint="An idea carries exactly one user story. Split it into smaller ideas to keep it sprint-ready."
            icon={<Scissors className="size-4 text-warning" aria-hidden />}
          >
            <p className="text-sm text-body">{feature.split_reason}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Suggested ideas
            </p>
            <ul className="mt-2 space-y-2">
              {splitSuggestions.map((suggestion) => (
                <li
                  key={suggestion.name}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <p className="text-sm font-medium">{suggestion.name}</p>
                  {suggestion.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{suggestion.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                disabled={splitMutation.isPending || splitSuggestions.length === 0}
                onClick={() => splitMutation.mutate()}
              >
                {splitMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Create all ideas
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => dismissSplitMutation.mutate(undefined as never)}
            >
              Keep as one idea
            </Button>
          </SectionCard>
        ) : null}

        {requirements.length === 0 && tasks.length === 0 ? (
          <SectionCard
            title="No breakdown yet"
            hint="Your idea is saved. Generate the AI breakdown when you're ready — approval needs one."
          >
            <Button onClick={() => generateMutation.mutate("initial")} disabled={generating}>
              {generating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              Generate breakdown
            </Button>
          </SectionCard>
        ) : (
          <>
            <RequirementSection
              title="User story"
              icon={<BookOpen className="size-4 text-primary" aria-hidden />}
              hint="Exactly one user story per idea — who wants what, and why."
              items={userStories}
              members={members}
              allowAdd={userStories.length === 0}
              regenerate={
                approved
                  ? null
                  : {
                      pending: sectionMutation.isPending,
                      hasEdits: userStories.some((item) => item.source !== "AI"),
                      onRun: () => sectionMutation.mutate("USER_STORY"),
                    }
              }
              onSave={(requirementId, content) => requirementMutation.mutate({ requirementId, content })}
              onAdd={(content) => addRequirementMutation.mutate({ kind: "USER_STORY", content })}
              onDelete={(requirementId) => deleteRequirementMutation.mutate(requirementId)}
              onAssign={(requirementId, assigneeId) =>
                requirementAssigneeMutation.mutate({ requirementId, assigneeId })
              }
            />
            {userStories.length > 1 ? (
              <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                This idea has more than one user story. Keep one and move the others into separate
                ideas before approving.
              </p>
            ) : null}
            <RequirementSection
              title="Acceptance criteria"
              icon={<ListChecks className="size-4 text-success" aria-hidden />}
              hint="Testable conditions that must hold before this is done."
              items={byKind("ACCEPTANCE_CRITERION")}
              members={members}
              allowAdd
              regenerate={
                approved
                  ? null
                  : {
                      pending: sectionMutation.isPending,
                      hasEdits: byKind("ACCEPTANCE_CRITERION").some((item) => item.source !== "AI"),
                      onRun: () => sectionMutation.mutate("ACCEPTANCE_CRITERION"),
                    }
              }
              onSave={(requirementId, content) => requirementMutation.mutate({ requirementId, content })}
              onAdd={(content) =>
                addRequirementMutation.mutate({ kind: "ACCEPTANCE_CRITERION", content })
              }
              onDelete={(requirementId) => deleteRequirementMutation.mutate(requirementId)}
            />
            <RequirementSection
              title="Potential edge cases"
              icon={<ShieldAlert className="size-4 text-warning" aria-hidden />}
              hint="Risky situations worth handling before they become bugs."
              items={byKind("EDGE_CASE")}
              members={members}
              allowAdd
              regenerate={
                approved
                  ? null
                  : {
                      pending: sectionMutation.isPending,
                      hasEdits: byKind("EDGE_CASE").some((item) => item.source !== "AI"),
                      onRun: () => sectionMutation.mutate("EDGE_CASE"),
                    }
              }
              onSave={(requirementId, content) => requirementMutation.mutate({ requirementId, content })}
              onAdd={(content) => addRequirementMutation.mutate({ kind: "EDGE_CASE", content })}
              onDelete={(requirementId) => deleteRequirementMutation.mutate(requirementId)}
            />

            <SectionCard
              title="Development tasks"
              hint="Concrete work items derived from the requirements. Each task can have its own owner."
              icon={<ListChecks className="size-4 text-dev" aria-hidden />}
              actions={
                approved ? null : (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm" disabled={sectionMutation.isPending}>
                        <RefreshCw className="size-4" aria-hidden />
                        Regenerate tasks
                      </Button>
                    }
                    skip={!tasks.some((task) => task.source !== "AI")}
                    title="Replace the development tasks?"
                    description="Some tasks were edited or written by you. Regenerating this section replaces all tasks with a fresh AI draft. Nothing else in the idea changes."
                    confirmLabel="Replace tasks"
                    onConfirm={() => sectionMutation.mutate("TASKS")}
                  />
                )
              }
            >
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onSave={(title, description) =>
                      taskMutation.mutate({ taskId: task.id, title, description })
                    }
                    onDelete={() => deleteTaskMutation.mutate(task.id)}
                    onAssign={(assigneeId) =>
                      taskAssigneeMutation.mutate({ taskId: task.id, assigneeId })
                    }
                  />
                ))}
              </ul>
              <AddRow
                placeholder="Add a development task…"
                onAdd={(value) => addTaskMutation.mutate(value)}
              />
            </SectionCard>
          </>
        )}

        <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {approved
                ? "Approved and in the backlog"
                : rejected
                  ? "Rejected — kept for reference"
                  : "Ready to approve?"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {approved
                ? "Assign it to a sprint from the backlog whenever your team is ready. It stays editable, and edits sync to the backlog."
                : rejected
                  ? "Nothing was lost. Move it back to drafts to keep working on it — the AI breakdown is not re-run."
                  : hasBreakdown(status)
                    ? "Approving snapshots the current state and creates a backlog item. Nothing is assigned to a sprint automatically."
                    : "Generate the AI breakdown first — an idea cannot be approved without one."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {approved ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/projects/$projectId/backlog" params={{ projectId }}>
                  Open backlog
                </Link>
              </Button>
            ) : rejected ? (
              <Button
                size="sm"
                disabled={moveToDraftsMutation.isPending}
                onClick={() => moveToDraftsMutation.mutate(undefined as never)}
              >
                <Undo2 className="size-4" aria-hidden />
                Move to drafts
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    rejectMutation.mutate(undefined as never);
                    navigate({ to: "/projects/$projectId/ideas", params: { projectId } });
                  }}
                >
                  <XCircle className="size-4" aria-hidden />
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    toast.success("Saved as a draft. You can come back to it any time.");
                    navigate({ to: "/projects/$projectId/ideas", params: { projectId } });
                  }}
                >
                  <Save className="size-4" aria-hidden />
                  Save as draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending || !hasBreakdown(status)}
                  title={
                    hasBreakdown(status)
                      ? undefined
                      : "Generate the AI breakdown before approving this idea."
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  Approve
                </Button>
              </>
            )}
            <ConfirmAction
              trigger={
                <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete idea
                </Button>
              }
              title="Delete this idea?"
              description={
                approved
                  ? "This idea is approved. Deleting it permanently removes the idea, its user story, acceptance criteria, edge cases, tasks, AI history AND its approved backlog item — including any sprint assignment. This cannot be undone."
                  : "This permanently removes the idea, its breakdown and its AI history. This cannot be undone."
              }
              confirmLabel="Delete permanently"
              destructive
              onConfirm={() => deleteMutation.mutate()}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function useMutationFactory<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  success: string,
  invalidate: () => void,
) {
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate();
      toast.success(success);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/** Runs the action immediately when `skip` is true, otherwise asks for confirmation first. */
function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  skip = false,
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  skip?: boolean;
  destructive?: boolean;
}) {
  if (skip) {
    return (
      <span
        onClick={onConfirm}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onConfirm();
        }}
      >
        {trigger}
      </span>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function memberLabel(member: Member) {
  return member.display_name ?? member.email ?? "Member";
}

function AssigneeSelect({
  members,
  value,
  onChange,
  ariaLabel,
}: {
  members: Member[];
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(next) => onChange(next === "none" ? null : next)}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full min-w-40">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            {memberLabel(member)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


type RequirementItem = {
  id: string;
  content: string;
  source: ContentSource;
  assignee_id: string | null;
};

function RequirementSection({
  title,
  hint,
  icon,
  items,
  members,
  allowAdd,
  regenerate,
  onSave,
  onAdd,
  onDelete,
  onAssign,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  items: RequirementItem[];
  members: Member[];
  allowAdd: boolean;
  regenerate: { pending: boolean; hasEdits: boolean; onRun: () => void } | null;
  onSave: (id: string, content: string) => void;
  onAdd: (content: string) => void;
  onDelete: (id: string) => void;
  onAssign?: (id: string, assigneeId: string | null) => void;
}) {
  return (
    <SectionCard
      title={title}
      hint={hint}
      icon={icon}
      actions={
        regenerate ? (
          <ConfirmAction
            trigger={
              <Button variant="ghost" size="sm" disabled={regenerate.pending}>
                {regenerate.pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-4" aria-hidden />
                )}
                Regenerate
              </Button>
            }
            skip={!regenerate.hasEdits}
            title={`Replace ${title.toLowerCase()}?`}
            description={`Some of this section was edited or written by you. Regenerating replaces only ${title.toLowerCase()} with a fresh AI draft — every other section stays exactly as it is.`}
            confirmLabel="Replace section"
            onConfirm={regenerate.onRun}
          />
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <RequirementRow
              key={item.id}
              item={item}
              members={members}
              onSave={(content) => onSave(item.id, content)}
              onDelete={() => onDelete(item.id)}
              {...(onAssign
                ? { onAssign: (assigneeId: string | null) => onAssign(item.id, assigneeId) }
                : {})}
            />
          ))}
        </ul>
      )}
      {allowAdd ? <AddRow placeholder={`Add to ${title.toLowerCase()}…`} onAdd={onAdd} /> : null}
    </SectionCard>
  );
}

function RequirementRow({
  item,
  members,
  onSave,
  onDelete,
  onAssign,
}: {
  item: RequirementItem;
  members: Member[];
  onSave: (content: string) => void;
  onDelete: () => void;
  onAssign?: (assigneeId: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.content);

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      {editing ? (
        <div className="space-y-2">
          <Textarea rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(value.trim());
                setEditing(false);
              }}
              disabled={value.trim().length < 3}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setValue(item.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-body">{item.content}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={item.source} />
            {onAssign ? (
              <AssigneeSelect
                members={members}
                value={item.assignee_id}
                onChange={onAssign}
                ariaLabel="Assign this user story"
              />
            ) : null}
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function TaskRow({
  task,
  members,
  onSave,
  onDelete,
  onAssign,
}: {
  task: {
    title: string;
    description: string | null;
    source: ContentSource;
    assignee_id: string | null;
  };
  members: Member[];
  onSave: (title: string, description: string) => void;
  onDelete: () => void;
  onAssign: (assigneeId: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Implementation notes (optional)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(title.trim(), description.trim());
                setEditing(false);
              }}
              disabled={title.trim().length < 3}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{task.title}</p>
            {task.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={task.source} />
            <AssigneeSelect
              members={members}
              value={task.assignee_id}
              onChange={onAssign}
              ariaLabel="Assign this task"
            />
            <Button size="icon" variant="ghost" aria-label="Edit task" onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete task" onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}


function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(value.trim());
        setValue("");
      }}
    >
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
      <Button type="submit" variant="outline" disabled={value.trim().length < 3}>
        <Plus className="size-4" aria-hidden />
        Add
      </Button>
    </form>
  );
}

function IdeaBasics({
  name,
  description,
  context,
  saving,
  onSave,
}: {
  name: string;
  description: string;
  context: string;
  saving: boolean;
  onSave: (input: { name: string; description: string; context: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftContext, setDraftContext] = useState(context);

  if (!editing) {
    return (
      <div className="mt-3.5">
        <p className="text-sm text-body">{description}</p>
        {context ? (
          <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-body">
            {context}
          </p>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setDraftName(name);
            setDraftDescription(description);
            setDraftContext(context);
            setEditing(true);
          }}
        >
          <Pencil className="size-4" aria-hidden />
          Edit idea
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-3.5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ name: draftName, description: draftDescription, context: draftContext });
        setEditing(false);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="idea-edit-name">Idea name</Label>
        <Input
          id="idea-edit-name"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="idea-edit-description">What should it do?</Label>
        <Textarea
          id="idea-edit-description"
          rows={5}
          value={draftDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="idea-edit-context">Extra context (optional)</Label>
        <Textarea
          id="idea-edit-context"
          rows={3}
          value={draftContext}
          onChange={(event) => setDraftContext(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={saving || draftName.trim().length < 3 || draftDescription.trim().length < 10}
        >
          Save idea
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
