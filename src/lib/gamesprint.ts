// Shared, client-safe GameSprint AI domain constants and types.

export const STORY_POINT_SCALE = [1, 2, 3, 5, 8, 13] as const;
export type StoryPoints = (typeof STORY_POINT_SCALE)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const BOARD_STATUSES = [
  "UNPLANNED",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

/** Sprint boards only ever show work that belongs to a sprint, so UNPLANNED is excluded. */
export const SPRINT_BOARD_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type SprintBoardStatus = (typeof SPRINT_BOARD_STATUSES)[number];

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  UNPLANNED: "Unplanned",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

/** Human-readable, useful empty state copy per backlog group. */
export const BOARD_STATUS_EMPTY: Record<BoardStatus, string> = {
  UNPLANNED: "No approved work is waiting to be planned.",
  TODO: "No work is ready to start.",
  IN_PROGRESS: "No work is currently in progress.",
  IN_REVIEW: "No work is waiting for review.",
  DONE: "No completed work yet.",
};

/**
 * ONE semantic colour per execution status, reused everywhere in the app:
 * Unplanned = slate, To Do = blue, In Progress = purple, In Review = amber, Done = green.
 * Colours are accents only — never a strongly filled column background.
 */
export const BOARD_STATUS_COLORS: Record<
  BoardStatus,
  { text: string; dot: string; edge: string; badge: string; count: string; drop: string }
> = {
  UNPLANNED: {
    text: "text-muted-foreground",
    dot: "bg-border-strong",
    edge: "border-l-border-strong",
    badge: "border-border-strong bg-muted text-muted-foreground",
    count: "bg-muted text-muted-foreground",
    drop: "border-border-strong bg-muted/60",
  },
  TODO: {
    text: "text-dev",
    dot: "bg-dev",
    edge: "border-l-dev",
    badge: "border-dev/30 bg-dev-soft text-dev",
    count: "bg-dev-soft text-dev",
    drop: "border-dev bg-dev-soft/60",
  },
  IN_PROGRESS: {
    text: "text-primary",
    dot: "bg-primary",
    edge: "border-l-primary",
    badge: "border-primary/30 bg-primary-soft text-primary",
    count: "bg-primary-soft text-primary",
    drop: "border-primary bg-primary-soft/60",
  },
  IN_REVIEW: {
    text: "text-warning",
    dot: "bg-warning",
    edge: "border-l-warning",
    badge: "border-warning/30 bg-warning-soft text-warning",
    count: "bg-warning-soft text-warning",
    drop: "border-warning bg-warning-soft/60",
  },
  DONE: {
    text: "text-success",
    dot: "bg-success",
    edge: "border-l-success",
    badge: "border-success/30 bg-success-soft text-success",
    count: "bg-success-soft text-success",
    drop: "border-success bg-success-soft/60",
  },
};


export type FeatureStatus = "DRAFT" | "AI_GENERATED" | "USER_EDITED" | "APPROVED" | "REJECTED";

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  DRAFT: "Draft",
  AI_GENERATED: "AI Generated",
  USER_EDITED: "User Edited",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/**
 * Workflow status is the ONE primary state of an idea: Draft, Approved or Rejected.
 * "AI Generated" / "User Edited" are metadata about the content, not workflow states.
 */
export type WorkflowStatus = "DRAFT" | "APPROVED" | "REJECTED";

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function workflowStatus(status: FeatureStatus): WorkflowStatus {
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  return "DRAFT";
}

/** Content metadata badge, or null when the idea has no AI breakdown yet. */
export function contentMeta(status: FeatureStatus): "AI_GENERATED" | "USER_EDITED" | null {
  if (status === "AI_GENERATED") return "AI_GENERATED";
  if (status === "USER_EDITED") return "USER_EDITED";
  return null;
}

export function hasBreakdown(status: FeatureStatus): boolean {
  return status !== "DRAFT";
}


export type RequirementKind = "USER_STORY" | "ACCEPTANCE_CRITERION" | "EDGE_CASE";
export type ContentSource = "AI" | "USER_EDITED" | "USER_CREATED";

export const PLATFORMS = ["PC", "Console", "Mobile", "Web", "VR/AR"] as const;

export const GENERATION_STEPS = [
  "Understanding the feature",
  "Generating user stories",
  "Defining acceptance criteria",
  "Identifying edge cases",
  "Breaking work into tasks",
  "Estimating priority and effort",
] as const;

export function isValidStoryPoints(value: unknown): value is StoryPoints {
  return typeof value === "number" && (STORY_POINT_SCALE as readonly number[]).includes(value);
}
