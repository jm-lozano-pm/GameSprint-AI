import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const STORAGE_KEY = "gamesprint.lastProjectId";

type Options = {
  /** Where to send the user; defaults to the project list. */
  fallback?: "projects" | "ideas";
  message?: string;
};

/**
 * A project (or an idea inside it) can disappear underneath an open tab:
 * deleted, split into new ideas, or membership removed. The server function then
 * throws FORBIDDEN, which would otherwise leave a stuck/blank screen. Send the
 * user somewhere valid and drop the stale "last project" selection.
 */
export function useProjectAccessGuard(projectId: string, error: unknown, options: Options = {}) {
  const navigate = useNavigate();
  const { fallback = "projects", message } = options;

  useEffect(() => {
    if (!error) return;
    const text = error instanceof Error ? error.message : String(error);
    if (!text.includes("FORBIDDEN")) return;

    if (fallback === "ideas") {
      toast.error(message ?? "That idea is no longer available.");
      navigate({ to: "/projects/$projectId/ideas", params: { projectId }, replace: true });
      return;
    }

    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === projectId) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    toast.error(message ?? "That project is no longer available.");
    navigate({ to: "/projects", replace: true });
  }, [error, projectId, navigate, fallback, message]);
}
