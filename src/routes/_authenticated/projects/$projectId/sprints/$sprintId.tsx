import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
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

/**
 * Column model — the board renders whatever list of statuses it is given, so
 * extra project statuses can be appended later without layout changes.
 */
const COLUMNS: readonly SprintBoardStatus[] = SPRINT_BOARD_STATUSES;

/** Prefer the column under the pointer; fall back to rect overlap for keyboard drags. */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args);
};

function SprintBoardPage() {
  const { projectId, sprintId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getSprintBoard);
  const fetchMembers = useServerFn(getProjectMembers);
  const updateStatus = useServerFn(setItemStatus);
  /** Confirmed-but-not-yet-refetched statuses. Never applied before the drop resolves. */
  const [overrides, setOverrides] = useState<Record<string, BoardStatus>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
    mutationFn: (input: { itemId: string; status: BoardStatus; from: BoardStatus }) =>
      updateStatus({ data: { projectId, itemId: input.itemId, status: input.status } }),
    onSuccess: async (result, variables) => {
      const resolved = (result?.status ?? variables.status) as BoardStatus;
      // Patch the cache so the card renders in the destination immediately.
      queryClient.setQueryData(
        ["sprint-board", projectId, sprintId],
        (previous: { sprint: unknown; items: BoardItem[] } | undefined) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((item) =>
                  item.id === variables.itemId ? { ...item, status: resolved } : item,
                ),
              }
            : previous,
      );
      setOverrides((current) => ({ ...current, [variables.itemId]: resolved }));
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      queryClient.invalidateQueries({ queryKey: ["backlog", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["sprint-board", projectId, sprintId],
      });
      setOverrides((current) => {
        const next = { ...current };
        delete next[variables.itemId];
        return next;
      });
    },
    onError: (error: Error, variables) => {
      // Restore the original position; the card is never left invisible.
      setOverrides((current) => {
        const next = { ...current };
        delete next[variables.itemId];
        return next;
      });
      toast.error(error.message);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const move = (itemId: string, status: BoardStatus, currentStatus: string) => {
    if (status === currentStatus) return;
    statusMutation.mutate({ itemId, status, from: currentStatus as BoardStatus });
  };

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const overId = event.over?.id;
    const itemId = String(event.active.id);
    const currentStatus = String(event.active.data.current?.["status"] ?? "");
    const status = COLUMNS.find((candidate) => candidate === overId);
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
    const status = (overrides[item.id] ?? item.status) as BoardStatus;
    // Sprint work always belongs to a board column; anything else shows in the
    // first column so a card can never end up invisible.
    const columnStatus: SprintBoardStatus = COLUMNS.includes(status as SprintBoardStatus)
      ? (status as SprintBoardStatus)
      : COLUMNS[0]!;
    return { ...item, status: columnStatus };
  });
  const committed = boardItems.reduce((sum, item) => sum + (item.story_points ?? 0), 0);
  const draggingItem = boardItems.find((item) => item.id === draggingId) ?? null;

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
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDraggingId(null)}
          >
            {/* One continuous horizontal workspace: fixed-width columns, board scrolls. */}
            <div className="-mx-1 overflow-x-auto px-1 pb-2">
              <div className="flex min-w-max items-start gap-4">
                {COLUMNS.map((status) => (
                  <Column
                    key={status}
                    status={status}
                    items={boardItems.filter((item) => item.status === status)}
                    projectId={projectId}
                    members={members}
                    draggingId={draggingId}
                    onMove={move}
                  />
                ))}
              </div>
            </div>

            <DragOverlay dropAnimation={null}>
              {draggingItem ? (
                <CardBody item={draggingItem} projectId={projectId} members={members} overlay />
              ) : null}
            </DragOverlay>
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
  draggingId,
  onMove,
}: {
  status: SprintBoardStatus;
  items: BoardItem[];
  projectId: string;
  members: Member[];
  draggingId: string | null;
  onMove: (itemId: string, status: BoardStatus, currentStatus: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const tone = BOARD_STATUS_COLORS[status];

  return (
    <section
      className={cn(
        "flex w-[288px] shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors",
        isOver ? tone.drop : "",
      )}
    >
      <div className={cn("h-1 rounded-t-xl", tone.dot)} aria-hidden />
      <StatusHeader status={status} count={items.length} className="px-3 py-2.5" />
      <ul ref={setNodeRef} className="flex min-h-32 flex-col gap-2 px-3 pb-3">
        {items.length === 0 ? (
          <li
            className={cn(
              "rounded-lg border border-dashed border-border px-2 py-8 text-center text-xs text-muted-foreground",
              isOver ? "border-solid" : "",
            )}
          >
            Drop work here
          </li>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              item={item}
              projectId={projectId}
              members={members}
              isDragging={draggingId === item.id}
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
  isDragging,
  onMove,
}: {
  item: BoardItem;
  projectId: string;
  members: Member[];
  isDragging: boolean;
  onMove: (itemId: string, status: BoardStatus, currentStatus: string) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    data: { status: item.status },
  });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-40" : undefined}>
      <CardBody
        item={item}
        projectId={projectId}
        members={members}
        onMove={onMove}
        handleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function CardBody({
  item,
  projectId,
  members,
  onMove,
  handleProps,
  overlay,
}: {
  item: BoardItem;
  projectId: string;
  members: Member[];
  onMove?: (itemId: string, status: BoardStatus, currentStatus: string) => void;
  handleProps?: Record<string, unknown>;
  overlay?: boolean;
}) {
  const owner = members.find((member) => member.user_id === item.assignee_id);
  const ownerName = owner ? (owner.display_name ?? owner.email ?? "Member") : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 border-border bg-surface px-2.5 py-2",
        BOARD_STATUS_COLORS[item.status as BoardStatus]?.edge,
        overlay ? "w-[264px] rotate-1 shadow-xl" : "shadow-sm",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`Drag ${item.title}`}
          {...(handleProps ?? {})}
        >
          <GripVertical className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {item.feature_id && !overlay ? (
            <Link
              to="/projects/$projectId/ideas/$featureId"
              params={{ projectId, featureId: item.feature_id }}
              className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
            >
              {item.title}
            </Link>
          ) : (
            <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
          )}
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.feature_id ? "Feature" : "Work item"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={item.priority as Priority} />
            <PointsBadge points={item.story_points} />
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <UserAvatar
              name={ownerName}
              imageUrl={owner?.avatar_url}
              className="size-5 shrink-0"
              fallbackClassName="text-[8px]"
            />
            <span className="min-w-0 truncate text-[11px] text-muted-foreground">
              {ownerName ?? "Unassigned"}
              {owner?.professionalRoles?.length
                ? ` · ${owner.professionalRoles.map((role) => iconTextLabel(role)).join(", ")}`
                : ""}
            </span>
          </div>
        </div>
        {overlay || !onMove ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label={`Actions for ${item.title}`}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {COLUMNS.filter((next) => next !== item.status).map((next) => (
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
        )}
      </div>
    </div>
  );
}
