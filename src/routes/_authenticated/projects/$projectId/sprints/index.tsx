import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gauge, Plus, Play, CheckCircle2, Pencil, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  createSprint,
  listSprints,
  startSprint,
  completeSprint,
  updateSprint,
  deleteSprint,
} from "@/lib/sprints.functions";

type SprintRow = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  itemCount: number;
  committedPoints: number;
  doneCount: number;
};

export const Route = createFileRoute("/_authenticated/projects/$projectId/sprints/")({
  head: () => ({
    meta: [
      { title: "Sprints — GameSprint AI" },
      {
        name: "description",
        content:
          "Plan, start and complete sprints for this game project: goals, dates, committed story points and progress toward done.",
      },
      { property: "og:title", content: "Sprints — GameSprint AI" },
      {
        property: "og:description",
        content: "One active sprint at a time, with planned and completed sprint history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SprintsPage,
});

function SprintsPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchSprints = useServerFn(listSprints);
  const create = useServerFn(createSprint);
  const start = useServerFn(startSprint);
  const complete = useServerFn(completeSprint);
  const update = useServerFn(updateSprint);
  const remove = useServerFn(deleteSprint);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [pendingComplete, setPendingComplete] = useState<SprintRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SprintRow | null>(null);
  const [editing, setEditing] = useState<SprintRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  const openEditor = (sprint: SprintRow) => {
    setEditing(sprint);
    setEditName(sprint.name);
    setEditGoal(sprint.goal ?? "");
    setEditStart(sprint.start_date ?? "");
    setEditEnd(sprint.end_date ?? "");
    setEditCapacity(sprint.capacity ? String(sprint.capacity) : "");
  };

  const sprintsQuery = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => fetchSprints({ data: { projectId } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprint-board", projectId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          projectId,
          name,
          goal,
          startDate,
          endDate,
          ...(capacity ? { capacity: Number(capacity) } : {}),
        },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Sprint created as planned");
      setOpen(false);
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setCapacity("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startMutation = useMutation({
    mutationFn: (sprintId: string) => start({ data: { projectId, sprintId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Sprint started");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeMutation = useMutation({
    mutationFn: (sprintId: string) => complete({ data: { projectId, sprintId } }),
    onSuccess: (result) => {
      invalidate();
      setPendingComplete(null);
      toast.success(
        result.unfinished > 0
          ? `Sprint completed. ${result.unfinished} unfinished item${result.unfinished === 1 ? "" : "s"} stayed with the sprint.`
          : "Sprint completed",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      update({
        data: {
          projectId,
          sprintId: editing!.id,
          name: editName,
          goal: editGoal,
          startDate: editStart,
          endDate: editEnd,
          capacity: editCapacity ? Number(editCapacity) : null,
        },
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Sprint updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (sprintId: string) => remove({ data: { projectId, sprintId } }),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("Sprint deleted. Its work returned to the backlog as unplanned.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sprints = (sprintsQuery.data ?? []) as SprintRow[];
  const active = sprints.filter((sprint) => sprint.status === "ACTIVE");
  const planned = sprints.filter((sprint) => sprint.status === "PLANNED");
  const completed = sprints.filter((sprint) => sprint.status === "COMPLETED");
  const hasActive = active.length > 0;

  const renderGroup = (title: string, rows: SprintRow[], hint: string) =>
    rows.length === 0 ? null : (
      <section>
        <div className="flex items-baseline justify-between pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title} ({rows.length})
          </h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((sprint) => (
            <li key={sprint.id} className="surface-card flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/projects/$projectId/sprints/$sprintId"
                  params={{ projectId, sprintId: sprint.id }}
                  className="text-sm font-semibold hover:text-primary"
                >
                  {sprint.name}
                </Link>
                <StatusPill status={sprint.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {sprint.goal || "No sprint goal set."}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {sprint.start_date ?? "No start"} — {sprint.end_date ?? "No end"}
              </p>
              <p className="mt-2 text-sm font-medium">
                {sprint.doneCount}/{sprint.itemCount} done · {sprint.committedPoints} pts committed
                {sprint.capacity ? ` of ${sprint.capacity}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/projects/$projectId/sprints/$sprintId"
                    params={{ projectId, sprintId: sprint.id }}
                  >
                    Open board
                  </Link>
                </Button>
                {sprint.status === "PLANNED" ? (
                  <Button
                    size="sm"
                    disabled={hasActive || startMutation.isPending}
                    onClick={() => startMutation.mutate(sprint.id)}
                    title={
                      hasActive
                        ? "Complete the active sprint before starting another one."
                        : undefined
                    }
                  >
                    <Play className="size-4" aria-hidden />
                    Start sprint
                  </Button>
                ) : null}
                {sprint.status === "ACTIVE" ? (
                  <Button size="sm" variant="secondary" onClick={() => setPendingComplete(sprint)}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    Complete sprint
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => openEditor(sprint)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setPendingDelete(sprint)}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <AppShell
      projectId={projectId}
      title="Sprints"
      subtitle="One sprint is active at a time. Work only enters a sprint when someone puts it there."
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New sprint
        </Button>
      }
    >
      {sprintsQuery.isPending ? (
        <LoadingState label="Loading sprints" />
      ) : sprintsQuery.error ? (
        <ErrorState
          message={(sprintsQuery.error as Error).message}
          onRetry={() => sprintsQuery.refetch()}
        />
      ) : sprints.length === 0 ? (
        <EmptyState
          title="No sprints yet"
          description="Create a sprint, pull approved backlog items into it, then start it when the team is ready."
          icon={<Gauge className="size-5" aria-hidden />}
          action={<Button onClick={() => setOpen(true)}>Create sprint</Button>}
        />
      ) : (
        <div className="space-y-7">
          {!hasActive ? (
            <p className="surface-card px-5 py-4 text-sm text-muted-foreground">
              No active sprint. Start a planned sprint to begin development.
            </p>
          ) : null}
          {renderGroup("Active", active, "At most one per project")}
          {renderGroup("Planned", planned, "Ready to start")}
          {renderGroup("Completed", completed, "History is preserved")}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New sprint</DialogTitle>
            <DialogDescription>
              Give the sprint a goal so the team knows what success looks like. It starts as planned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sprint-name">Sprint name</Label>
              <Input
                id="sprint-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Sprint 4 — Traversal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sprint-goal">Sprint goal</Label>
              <Textarea
                id="sprint-goal"
                rows={2}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Ship grappling traversal in a playable vertical slice."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sprint-start">Start</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sprint-end">End</Label>
                <Input
                  id="sprint-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sprint-capacity">Capacity (pts)</Label>
                <Input
                  id="sprint-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                />
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
              Create sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingComplete !== null}
        onOpenChange={(value) => (value ? null : setPendingComplete(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete {pendingComplete?.name}?</DialogTitle>
            <DialogDescription>
              The sprint becomes read-only history and the project will have no active sprint.
              Unfinished items stay attached to this sprint — nothing is deleted and nothing is moved
              without you.
            </DialogDescription>
          </DialogHeader>
          {pendingComplete ? (
            <p className="text-sm text-muted-foreground">
              {pendingComplete.itemCount - pendingComplete.doneCount} of {pendingComplete.itemCount}{" "}
              items are not done yet.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingComplete(null)}>
              Cancel
            </Button>
            <Button
              disabled={completeMutation.isPending}
              onClick={() => pendingComplete && completeMutation.mutate(pendingComplete.id)}
            >
              Complete sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editing !== null} onOpenChange={(value) => (value ? null : setEditing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit sprint</DialogTitle>
            <DialogDescription>
              Change the sprint name, goal, dates or capacity. The work assigned to it is untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Sprint name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-goal">Sprint goal</Label>
              <Textarea
                id="edit-goal"
                rows={2}
                value={editGoal}
                onChange={(event) => setEditGoal(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Start</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editStart}
                  onChange={(event) => setEditStart(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">End</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editEnd}
                  onChange={(event) => setEditEnd(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-capacity">Capacity (pts)</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  value={editCapacity}
                  onChange={(event) => setEditCapacity(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || editName.trim().length < 2}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(value) => (value ? null : setPendingDelete(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              The sprint is removed, but no work is deleted. Its{" "}
              {pendingDelete?.itemCount ?? 0} item
              {(pendingDelete?.itemCount ?? 0) === 1 ? "" : "s"} return to the backlog as unplanned,
              ready to be scheduled again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "border-success/30 bg-success-soft text-success",
    PLANNED: "border-dev/30 bg-dev-soft text-dev",
    COMPLETED: "border-border-strong bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide",
        map[status] ?? map["PLANNED"],
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
