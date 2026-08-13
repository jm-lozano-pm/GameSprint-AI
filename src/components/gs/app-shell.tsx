import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Lightbulb,
  ListChecks,
  Gauge,
  Gamepad2,
  ChevronsUpDown,
  LogOut,
  Users,
  Settings,
  UserCircle2,
  Menu,
  Search,
  X,
} from "lucide-react";
import { listProjects, getMyProfile } from "@/lib/projects.functions";
import { searchProject, type SearchResult } from "@/lib/search.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/gs/user-avatar";
import { IconGlyph } from "@/components/gs/icon-glyph";
import { ProjectIcon } from "@/components/gs/project-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GameSprintLogo } from "@/components/gs/gamesprint-logo";

/**
 * The top bar label is contextual page information, never a control.
 * It is derived from the current location so it always matches the page.
 */
function usePageLabel(): string {
  const pathname = useLocation({ select: (location) => location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "dashboard") return "Dashboard";
  if (segments[0] === "profile") return "Profile";
  if (segments[0] !== "projects") return "GameSprint AI";
  if (segments.length <= 1) return "Projects";
  if (segments.length === 2) return "Overview";

  const section = segments[2];
  const hasChild = segments.length > 3;
  if (section === "ideas") {
    if (!hasChild) return "Ideas";
    return segments[3] === "new" ? "New idea" : "Idea";
  }
  if (section === "backlog") return "Backlog";
  if (section === "sprints") return hasChild ? "Sprint" : "Sprints";
  if (section === "members") return "Team";
  if (section === "settings") return "Settings";
  return "Projects";
}

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; params?: Record<string, string> };

export function AppShell({
  children,
  projectId,
  title,
  titleIcon,
  subtitle,
  actions,
}: {
  children: ReactNode;
  projectId?: string;
  title: string;
  titleIcon?: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const pageLabel = usePageLabel();
  const fetchProjects = useServerFn(listProjects);
  const fetchProfile = useServerFn(getMyProfile);
  const [navOpen, setNavOpen] = useState(true);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const projects = projectsQuery.data ?? [];
  const currentProject = projects.find((project) => project.id === projectId);

  // Projects first, then the project-scoped dashboard.
  const workspaceNav: NavItem[] = [
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const projectNav: NavItem[] = projectId
    ? [
        { to: "/projects/$projectId", label: "Overview", icon: Gamepad2, params: { projectId } },
        { to: "/projects/$projectId/ideas", label: "Ideas", icon: Lightbulb, params: { projectId } },
        { to: "/projects/$projectId/backlog", label: "Backlog", icon: ListChecks, params: { projectId } },
        { to: "/projects/$projectId/sprints", label: "Sprints", icon: Gauge, params: { projectId } },
      ]
    : [];

  const teamNav: NavItem[] = projectId
    ? [{ to: "/projects/$projectId/members", label: "Members", icon: Users, params: { projectId } }]
    : [];

  const settingsNav: NavItem[] = projectId
    ? [{ to: "/projects/$projectId/settings", label: "Settings", icon: Settings, params: { projectId } }]
    : [];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const profileName = profileQuery.data?.display_name ?? profileQuery.data?.email ?? null;

  return (
    <div className="flex min-h-screen bg-background">
      {navOpen ? (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
          <Link to="/dashboard" className="flex items-center gap-2 px-5 py-3">
            <GameSprintLogo variant="full" height={40} />
          </Link>

          <nav className="flex-1 space-y-6 px-3 py-2" aria-label="Main">
            <NavGroup label="Workspace" items={workspaceNav} />
            {projectId ? (
              <>
                <NavGroup
                  label={currentProject?.name ?? "Current project"}
                  icon={currentProject?.icon ?? null}
                  items={projectNav}
                />
                <NavGroup label="Team" items={teamNav} />
                <NavGroup label="Settings" items={settingsNav} />
              </>
            ) : null}
          </nav>

          <div className="border-t border-border p-3">
            <AccountMenu
              icon={profileQuery.data?.icon ?? null}
              label={profileQuery.data?.display_name ?? profileQuery.data?.email ?? "Your account"}
              email={profileQuery.data?.email ?? null}
              onProfile={() => navigate({ to: "/profile" })}
              onSignOut={signOut}
            />
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5 lg:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={navOpen ? "Hide navigation" : "Show navigation"}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <Menu className="size-4" aria-hidden />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-48 shrink-0">
                {currentProject ? (
                  <ProjectIcon icon={currentProject.icon} name={currentProject.name} size="sm" />
                ) : (
                  <FolderKanban className="size-4" aria-hidden />
                )}
                <span className="truncate">{currentProject?.name ?? "Select project"}</span>
                <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>Your projects</DropdownMenuLabel>
              {projects.length === 0 ? (
                <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() =>
                      navigate({
                        to: "/projects/$projectId",
                        params: { projectId: project.id },
                      })
                    }
                  >
                    <ProjectIcon icon={project.icon} name={project.name} size="sm" />
                    <span className="truncate">{project.name}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/projects" })}>
                Manage projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Contextual page information — intentionally not interactive. */}
          <span className="hidden shrink-0 px-1.5 text-sm font-medium text-muted-foreground select-none sm:block">
            {pageLabel}
          </span>

          <ProjectSearch projectId={projectId} />

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Account menu"
                >
                  <UserAvatar
                    name={profileName}
                    imageUrl={profileQuery.data?.avatar_url}
                    className="size-8"
                    fallbackClassName="text-xs"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profileQuery.data?.email ?? "Signed in"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <UserCircle2 className="size-4" aria-hidden />
                  Profile &amp; account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {!navOpen ? (
          <nav
            className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-3 py-2 lg:px-4"
            aria-label="Project"
          >
            {[...workspaceNav, ...projectNav, ...teamNav, ...settingsNav].map((item) => (
              <Link
                key={item.label}
                to={item.to as never}
                params={(item.params ?? {}) as never}
                activeOptions={{ exact: item.to === "/projects/$projectId" }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3.5 lg:px-8">
          {titleIcon}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function AccountMenu({
  label,
  icon,
  email,
  onProfile,
  onSignOut,
}: {
  label: string;
  icon?: string | null;
  email: string | null;
  onProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex min-w-0 items-center gap-2">
            {icon ? (
              <IconGlyph value={icon} className="size-4 text-sm" />
            ) : (
              <UserCircle2 className="size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="truncate">{email ?? "Signed in"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile}>
          <UserCircle2 className="size-4" aria-hidden />
          Profile &amp; account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const RESULT_LABELS: Record<SearchResult["kind"], string> = {
  IDEA: "Idea",
  BACKLOG: "Backlog",
  SPRINT: "Sprint",
};

/** Search results are always scoped to the currently selected project. */
function ProjectSearch({ projectId }: { projectId?: string | undefined }) {
  const navigate = useNavigate();
  const runSearch = useServerFn(searchProject);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const enabled = Boolean(projectId) && debounced.length >= 2;
  const query = useQuery({
    queryKey: ["search", projectId, debounced],
    queryFn: () => runSearch({ data: { projectId: projectId as string, query: debounced } }),
    enabled,
  });

  const results = query.data ?? [];

  const go = (result: SearchResult) => {
    if (!projectId) return;
    setOpen(false);
    setTerm("");
    if (result.kind === "SPRINT") {
      navigate({
        to: "/projects/$projectId/sprints/$sprintId",
        params: { projectId, sprintId: result.id },
      });
      return;
    }
    if (result.kind === "BACKLOG") {
      if (result.featureId) {
        navigate({
          to: "/projects/$projectId/ideas/$featureId",
          params: { projectId, featureId: result.featureId },
        });
      } else {
        navigate({ to: "/projects/$projectId/backlog", params: { projectId } });
      }
      return;
    }
    navigate({
      to: "/projects/$projectId/ideas/$featureId",
      params: { projectId, featureId: result.id },
    });
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <label htmlFor="project-search" className="sr-only">
        Search this project
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="project-search"
          value={term}
          disabled={!projectId}
          placeholder={projectId ? "Search ideas, backlog, sprints…" : "Select a project to search"}
          className="h-9 pl-8"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
        />
        {term ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setTerm("");
              setDebounced("");
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open && enabled ? (
        <div className="absolute top-11 right-0 left-0 z-50 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg">
          {query.isPending ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              No matches in this project.
            </p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => go(result)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-muted"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{result.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {RESULT_LABELS[result.kind]}
                      </span>
                    </span>
                    {result.subtitle ? (
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NavGroup({
  label,
  items,
  icon,
}: {
  label: string;
  items: NavItem[];
  icon?: string | null;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <IconGlyph value={icon} className="size-3.5 text-xs" />
        <span className="truncate">{label}</span>
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              to={item.to as never}
              params={(item.params ?? {}) as never}
              activeOptions={{ exact: item.to === "/projects/$projectId" }}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
