import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { MoreHorizontal, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { ErrorState, LoadingState } from "@/components/gs/states";
import { PointsBadge, PriorityBadge } from "@/components/gs/badges";
import { iconTextLabel } from "@/components/gs/icon-glyph";
import { UserAvatar } from "@/components/gs/user-avatar";
import { StatusDot, StatusHeader } from "@/components/gs/status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSprintBoard, setItemStatus } from "@/lib/sprints.functions";
import { getProjectMembers } from "@/lib/projects.functions";
import { useProjectAccessGuard } from "@/lib/use-project-access";
import {
  BOARD_STATUS_COLORS,
  BOARD_STATUS_LABELS,
  SPRINT_BOARD_STATUSES,
  type BoardStatus,
  type Priority,
  type SprintBoardStatus,
} from "@/lib/gamesprint";

export const Route = createFileRoute("/_authenticated/projects/$projectId/sprints/$sprintId")({
  head: () => ({
    meta: [
      { title: "Sprint board — GameSprint AI" },
      {
        name: "description",
        content:
          "Sprint board for this game project: drag approved work through To Do, In Progress, In Review and Done.",
      },
      { property: "og:title", content: "Sprint board — GameSprint AI" },
      {
        property: "og:description",
        content: "Track sprint work across To Do, In Progress, In Review and Done.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SprintBoardPage,
});

type BoardItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  story_points: number | null;
  feature_id: string | null;
  assignee_id: string | null;
};

type Member = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  professionalRoles?: Array<{ id: string; name: string; icon?: string | null }>;
};

function SprintBoardPage() {
  const { projectId, sprintId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getSprintBoard);
  const fetchMembers = useServerFn(getProjectMembers);
  const updateStatus = useServerFn(setItemStatus);
  const [pending, setPending] = useState<Record<string, BoardStatus>>({});

  const boardQuery = useQuery({
    queryKey: ["sprint-board", projectId, sprintId],
    queryFn: () => fetchBoard({ data: { projectId, sprintId } }),
  });
  useProjectAccessGuard(projectId, boardQuery.error);

  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => fetchMembers({ data: { projectId } }),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { itemId: string; status: BoardStatus }) =>
      updateStatus({ data: { projectId, ...input } }),
    onSuccess: async (result, variables) => {
      // Patch the cached board first so the card stays visible in its new column.
      queryClient.setQueryData(
        ["sprint-board", projectId, sprintId],
        (previous: { sprint: unknown; items: BoardItem[] } | undefined) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((item) =>
                  item.id === variables.itemId
                    ? { ...item, status: (result?.status ?? variables.status) as BoardStatus }
                    : item,
                ),
              }
            : previous,
      );
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
      // Refetch the board and only then drop the optimistic status, so the card
      // never lands in a gap between the optimistic and server state.
      await queryClient.invalidateQueries({
        queryKey: ["sprint-board", projectId, sprintId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: (_data, _error, variables) =>
      setPending((current) => {
        const next = { ...current };
        delete next[variables.itemId];
        return next;
      }),
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const move = (itemId: string, status: BoardStatus, currentStatus: string) => {
    if (status === currentStatus) return;
    setPending((current) => ({ ...current, [itemId]: status }));
    statusMutation.mutate({ itemId, status });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    const itemId = String(event.active.id);
    const currentStatus = String(event.active.data.current?.["status"] ?? "");
    // Ignore drops that did not land on a real column.
    const status = SPRINT_BOARD_STATUSES.find((candidate) => candidate === overId);
    if (!status) return;
    move(itemId, status, currentStatus);
  };

  if (boardQuery.isPending) {
    return (
      <AppShell projectId={projectId} title="Sprint board">
        <LoadingState label="Loading board" />
      </AppShell>
    );
  }
  if (boardQuery.error) {
    return (
      <AppShell projectId={projectId} title="Sprint board">
        <ErrorState
          message={(boardQuery.error as Error).message}
          onRetry={() => boardQuery.refetch()}
        />
      </AppShell>
    );
  }

  const { sprint, items } = boardQuery.data!;
  const members = (membersQuery.data ?? []) as Member[];
  const boardItems = (items as BoardItem[]).map((item) => {
    const status = (pending[item.id] ?? item.status) as BoardStatus;
    // Sprint work always belongs to a board column; anything else shows in To Do
    // so a card can never end up invisible.
    const columnStatus: SprintBoardStatus = SPRINT_BOARD_STATUSES.includes(
      status as SprintBoardStatus,
    )
      ? (status as SprintBoardStatus)
      : "TODO";
    return { ...item, status: columnStatus };
  });
  const committed = boardItems.reduce((sum, item) => sum + (item.story_points ?? 0), 0);

  return (
    <AppShell
      projectId={projectId}
      title={sprint.name}
      subtitle={sprint.goal || "No sprint goal set."}
    >
      <div className="space-y-5">
        <div className="surface-card flex flex-wrap items-center gap-4 p-4 text-sm">
          <span className="text-muted-foreground">
            {sprint.start_date ?? "No start"} — {sprint.end_date ?? "No end"}
          </span>
          <span className="font-medium">
            {committed} pts committed{sprint.capacity ? ` of ${sprint.capacity}` : ""}
          </span>
          <span className="font-medium">
            {boardItems.filter((item) => item.status === "DONE").length}/{boardItems.length} done
          </span>
        </div>

        {boardItems.length === 0 ? (
          <p className="surface-card px-6 py-12 text-center text-sm text-muted-foreground">
            No work in this sprint yet. Assign approved backlog items to it from the backlog.
          </p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="grid gap-3 lg:grid-cols-4">
              {SPRINT_BOARD_STATUSES.map((status) => (
                <Column
                  key={status}
                  status={status}
                  items={boardItems.filter((item) => item.status === status)}
                  projectId={projectId}
                  members={members}
                  onMove={move}
                />
              ))}
            </div>
          </DndContext>
        )}
        <p className="text-xs text-muted-foreground">
          Drag a card between columns, or use its actions menu to move it without a mouse.
        </p>
      </div>
    </AppShell>
  );
}

function Column({
  status,
  items,
  projectId,
  members,
  onMove,
}: {
  status: SprintBoardStatus;
  items: BoardItem[];
  projectId: string;
  members: Member[];
  onMove: (itemId: string, status: BoardStatus, currentStatus: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "surface-card overflow-hidden p-3 pt-0 transition-colors",
        isOver ? BOARD_STATUS_COLORS[status].drop : "",
      )}
    >
      <div className={cn("-mx-3 mb-2 h-1", BOARD_STATUS_COLORS[status].dot)} aria-hidden />
      <StatusHeader status={status} count={items.length} className="px-1 pb-2" />
      <ul className="min-h-16 space-y-2">
        {items.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground">
            Drop work here
          </li>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              item={item}
              projectId={projectId}
              members={members}
              onMove={onMove}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function Card({
  item,
  projectId,
  members,
  onMove,
}: {
  item: BoardItem;
  projectId: string;
  members: Member[];
  onMove: (itemId: string, status: BoardStatus, currentStatus: string) => void;
}) {
  const owner = members.find((member) => member.user_id === item.assignee_id);
  const ownerName = owner ? (owner.display_name ?? owner.email ?? "Member") : null;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
  });

  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "rounded-lg border border-border bg-surface p-3",
        isDragging ? "opacity-70 shadow-lg" : "",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`Drag ${item.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          {item.feature_id ? (
            <Link
              to="/projects/$projectId/ideas/$featureId"
              params={{ projectId, featureId: item.feature_id }}
              className="text-sm font-medium hover:text-primary"
            >
              {item.title}
            </Link>
          ) : (
            <p className="text-sm font-medium">{item.title}</p>
          )}
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {item.feature_id ? "Feature" : "Work item"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={item.priority as Priority} />
            <PointsBadge points={item.story_points} />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <UserAvatar
              name={ownerName}
              imageUrl={owner?.avatar_url}
              className="size-6"
              fallbackClassName="text-[9px]"
            />
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {ownerName ?? "Unassigned"}
              {owner?.professionalRoles?.length
                ? ` · ${owner.professionalRoles.map((role) => iconTextLabel(role)).join(", ")}`
                : ""}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={`Actions for ${item.title}`}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {SPRINT_BOARD_STATUSES.filter((next) => next !== item.status).map((next) => (
              <DropdownMenuItem key={next} onClick={() => onMove(item.id, next, item.status)}>
                <StatusDot status={next} />
                {BOARD_STATUS_LABELS[next]}
              </DropdownMenuItem>
            ))}
            {item.feature_id ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/projects/$projectId/ideas/$featureId"
                    params={{ projectId, featureId: item.feature_id }}
                  >
                    Open idea
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
