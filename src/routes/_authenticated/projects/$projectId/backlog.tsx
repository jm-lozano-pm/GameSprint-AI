import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/gs/states";
import { PointsBadge, PriorityBadge } from "@/components/gs/badges";
import { StatusDot, StatusHeader } from "@/components/gs/status";
import { UserChip } from "@/components/gs/user-avatar";
import { iconTextLabel } from "@/components/gs/icon-glyph";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignToSprint,
  listBacklog,
  listSprints,
  setItemAssignee,
  setItemStatus,
} from "@/lib/sprints.functions";
import { getProjectMembers } from "@/lib/projects.functions";
import { useProjectAccessGuard } from "@/lib/use-project-access";
import {
  BOARD_STATUSES,
  BOARD_STATUS_COLORS,
  BOARD_STATUS_EMPTY,
  BOARD_STATUS_LABELS,
  PRIORITIES,
  type BoardStatus,
  type Priority,
} from "@/lib/gamesprint";

export const Route = createFileRoute("/_authenticated/projects/$projectId/backlog")({
  head: () => ({
    meta: [
      { title: "Backlog — GameSprint AI" },
      {
        name: "description",
        content:
          "Human-approved work items for this game project, grouped by execution status with unplanned work first, searchable and filterable.",
      },
      { property: "og:title", content: "Backlog — GameSprint AI" },
      {
        property: "og:description",
        content: "Approved, sprint-ready work items with priority, estimates, owners and progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BacklogPage,
});

type Snapshot = {
  user_stories?: string[];
  acceptance_criteria?: string[];
  edge_cases?: string[];
  development_tasks?: Array<{ title: string; description: string | null }>;
};

type BacklogRow = {
  id: string;
  feature_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  story_points: number | null;
  status: string;
  sprint_id: string | null;
  assignee_id: string | null;
  snapshot: Snapshot | null;
};

type Member = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  professionalRoles?: Array<{ id: string; name: string; icon?: string | null }>;
};


function memberName(members: Member[], id: string | null): string | null {
  if (!id) return null;
  const member = members.find((entry) => entry.user_id === id);
  return member ? (member.display_name ?? member.email ?? "Member") : null;
}

function searchText(item: BacklogRow, assignee: string | null): string {
  const snapshot = item.snapshot ?? {};
  return [
    item.title,
    item.description ?? "",
    assignee ?? "",
    ...(snapshot.user_stories ?? []),
    ...(snapshot.acceptance_criteria ?? []),
    ...(snapshot.edge_cases ?? []),
    ...(snapshot.development_tasks ?? []).flatMap((task) => [task.title, task.description ?? ""]),
  ]
    .join(" ")
    .toLowerCase();
}

function BacklogPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchBacklog = useServerFn(listBacklog);
  const fetchSprints = useServerFn(listSprints);
  const fetchMembers = useServerFn(getProjectMembers);
  const assign = useServerFn(assignToSprint);
  const assignOwner = useServerFn(setItemAssignee);
  const changeStatus = useServerFn(setItemStatus);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | BoardStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");
  const [sprintFilter, setSprintFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  const backlogQuery = useQuery({
    queryKey: ["backlog", projectId],
    queryFn: () => fetchBacklog({ data: { projectId } }),
  });
  useProjectAccessGuard(projectId, backlogQuery.error);
  const sprintsQuery = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => fetchSprints({ data: { projectId } }),
  });
  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => fetchMembers({ data: { projectId } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
    queryClient.invalidateQueries({ queryKey: ["sprint-board", projectId] });
    queryClient.invalidateQueries({ queryKey: ["feature"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
  };

  const assignMutation = useMutation({
    mutationFn: (input: { itemId: string; sprintId: string | null }) =>
      assign({ data: { projectId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Sprint assignment updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ownerMutation = useMutation({
    mutationFn: (input: { itemId: string; assigneeId: string | null }) =>
      assignOwner({ data: { projectId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Owner updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { itemId: string; status: BoardStatus }) =>
      changeStatus({ data: { projectId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Execution status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = (backlogQuery.data ?? []) as unknown as BacklogRow[];
  const sprints = sprintsQuery.data ?? [];
  const members = (membersQuery.data ?? []) as Member[];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const assignee = memberName(members, item.assignee_id);
      if (needle && !searchText(item, assignee).includes(needle)) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
      if (sprintFilter === "NONE" && item.sprint_id) return false;
      if (sprintFilter !== "ALL" && sprintFilter !== "NONE" && item.sprint_id !== sprintFilter)
        return false;
      if (assigneeFilter === "NONE" && item.assignee_id) return false;
      if (assigneeFilter !== "ALL" && assigneeFilter !== "NONE" && item.assignee_id !== assigneeFilter)
        return false;
      return true;
    });
  }, [items, members, query, statusFilter, priorityFilter, sprintFilter, assigneeFilter]);

  const activeFilters =
    (statusFilter !== "ALL" ? 1 : 0) +
    (priorityFilter !== "ALL" ? 1 : 0) +
    (sprintFilter !== "ALL" ? 1 : 0) +
    (assigneeFilter !== "ALL" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSprintFilter("ALL");
    setAssigneeFilter("ALL");
  };

  return (
    <AppShell
      projectId={projectId}
      title="Backlog"
      subtitle="Approved work is not necessarily planned work. Unplanned items come first."
    >
      {backlogQuery.isPending ? (
        <LoadingState label="Loading backlog" />
      ) : backlogQuery.error ? (
        <ErrorState
          message={(backlogQuery.error as Error).message}
          onRetry={() => backlogQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing approved yet"
          description="Approve an idea's reviewed breakdown and it will appear here as unplanned work, ready to be scheduled into a sprint."
          icon={<ListChecks className="size-5" aria-hidden />}
        />
      ) : (
        <div className="space-y-6">
          <div className="surface-card flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex min-w-56 flex-1 items-center gap-2.5">
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search backlog..."
                aria-label="Search backlog"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "ALL" | BoardStatus)}
            >
              <SelectTrigger className="h-9 w-36 rounded-full" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {BOARD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {BOARD_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full">
                  <SlidersHorizontal className="size-4" aria-hidden />
                  Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Priority</span>
                  <Select
                    value={priorityFilter}
                    onValueChange={(value) => setPriorityFilter(value as "ALL" | Priority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Any priority</SelectItem>
                      {PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority.charAt(0) + priority.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Sprint</span>
                  <Select value={sprintFilter} onValueChange={setSprintFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Any sprint</SelectItem>
                      <SelectItem value="NONE">Unplanned (no sprint)</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Assignee</span>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Anyone</SelectItem>
                      <SelectItem value="NONE">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.display_name ?? member.email ?? "Member"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilters === 0}>
                  Clear filters
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {filtered.length === 0 ? (
            <p className="surface-card px-6 py-12 text-center text-sm text-muted-foreground">
              No backlog items found.
            </p>
          ) : (
            <div className="space-y-8">
              {BOARD_STATUSES.map((status) => {
                const group = filtered.filter((item) => item.status === status);
                return (
                  <section key={status} aria-labelledby={`group-${status}`}>
                    <StatusHeader
                      status={status}
                      count={group.length}
                      id={`group-${status}`}
                      className="mb-3"
                    />
                    {group.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        {BOARD_STATUS_EMPTY[status]}
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {group.map((item) => (
                          <li
                            key={item.id}
                            className={`surface-card border-l-4 p-5 ${BOARD_STATUS_COLORS[status].edge}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                {item.feature_id ? (
                                  <Link
                                    to="/projects/$projectId/ideas/$featureId"
                                    params={{ projectId, featureId: item.feature_id }}
                                    className="text-sm font-semibold hover:text-primary"
                                  >
                                    {item.title}
                                  </Link>
                                ) : (
                                  <h3 className="text-sm font-semibold">{item.title}</h3>
                                )}
                                {item.description ? (
                                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {item.sprint_id
                                      ? (sprints.find((sprint) => sprint.id === item.sprint_id)
                                          ?.name ?? "Sprint")
                                      : "No sprint"}
                                  </span>
                                  <UserChip
                                    name={memberName(members, item.assignee_id)}
                                    imageUrl={
                                      members.find(
                                        (member) => member.user_id === item.assignee_id,
                                      )?.avatar_url ?? null
                                    }
                                    roles={members
                                      .find((member) => member.user_id === item.assignee_id)
                                      ?.professionalRoles?.map((role) => iconTextLabel(role))}
                                    compact
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <PriorityBadge priority={item.priority as Priority} />
                                <PointsBadge points={item.story_points} />
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <label className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">
                                  Sprint
                                </span>
                                <Select
                                  value={item.sprint_id ?? "none"}
                                  onValueChange={(value) =>
                                    assignMutation.mutate({
                                      itemId: item.id,
                                      sprintId: value === "none" ? null : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unplanned" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Unplanned</SelectItem>
                                    {sprints.map((sprint) => (
                                      <SelectItem key={sprint.id} value={sprint.id}>
                                        {sprint.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>

                              <label className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">
                                  Owner
                                </span>
                                <Select
                                  value={item.assignee_id ?? "none"}
                                  onValueChange={(value) =>
                                    ownerMutation.mutate({
                                      itemId: item.id,
                                      assigneeId: value === "none" ? null : value,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {members.map((member) => (
                                      <SelectItem key={member.user_id} value={member.user_id}>
                                        {member.display_name ?? member.email ?? "Member"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>

                              <label className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">
                                  Execution status
                                </span>
                                <Select
                                  value={item.status}
                                  onValueChange={(value) =>
                                    statusMutation.mutate({
                                      itemId: item.id,
                                      status: value as BoardStatus,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BOARD_STATUSES.filter(
                                      (value) => item.sprint_id || value === "UNPLANNED",
                                    ).map((value) => (
                                      <SelectItem key={value} value={value}>
                                        <span className="flex items-center gap-2">
                                          <StatusDot status={value} />
                                          {BOARD_STATUS_LABELS[value]}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
