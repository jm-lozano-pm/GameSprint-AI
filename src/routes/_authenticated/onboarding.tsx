import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GameSprintLogo } from "@/components/gs/gamesprint-logo";
import {
  getOnboardingState,
  saveOnboardingProgress,
  finishOnboarding,
} from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your studio — GameSprint AI" },
      {
        name: "description",
        content:
          "Set up your studio, first game project and sprint workflow so GameSprint AI can plan development with you.",
      },
      { property: "og:title", content: "Set up your studio — GameSprint AI" },
      {
        property: "og:description",
        content: "A short four-step setup: studio, project, workflow, ready to sprint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Studio", "Project", "Workflow", "Ready"] as const;

const TEAM_SIZES = [
  { value: "1", label: "Just me" },
  { value: "2-5", label: "2–5 people" },
  { value: "6-15", label: "6–15 people" },
  { value: "16-50", label: "16–50 people" },
  { value: "50+", label: "50+ people" },
];

const GENRES = [
  "Action",
  "Adventure",
  "RPG",
  "Shooter",
  "Platformer",
  "Puzzle",
  "Strategy",
  "Simulation",
  "Racing",
  "Sports",
  "Roguelike",
  "Survival",
  "Horror",
  "Metroidvania",
  "Card / Deckbuilder",
  "MMO",
  "Casual / Mobile",
];

const SPRINT_LENGTHS = [
  { value: 1, label: "1 week" },
  { value: 2, label: "2 weeks" },
  { value: 3, label: "3 weeks" },
  { value: 4, label: "4 weeks" },
];

const PLANNING_TOOLS = ["None", "Jira", "Trello", "Linear", "Notion", "Other"];

const PROJECT_KEY = "gamesprint.lastProjectId";

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadState = useServerFn(getOnboardingState);
  const saveProgress = useServerFn(saveOnboardingProgress);
  const finish = useServerFn(finishOnboarding);

  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [studioName, setStudioName] = useState("");
  const [website, setWebsite] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [projectName, setProjectName] = useState("");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [sprintLength, setSprintLength] = useState<number | null>(2);
  const [planningTool, setPlanningTool] = useState("None");

  // Anything already saved is restored so nothing is retyped.
  useEffect(() => {
    let active = true;
    loadState()
      .then((state) => {
        if (!active) return;
        if (state.status !== "PENDING") {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setStudioName(state.studioName);
        setWebsite(state.studioWebsite);
        setTeamSize(state.teamSize);
        if (state.sprintLengthWeeks) setSprintLength(state.sprintLengthWeeks);
        if (state.planningTool) setPlanningTool(state.planningTool);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [loadState, navigate]);

  const resolvedGenre = genre === "Other" ? customGenre.trim() : genre;

  const payload = () => ({
    studioName,
    studioWebsite: website,
    teamSize,
    sprintLengthWeeks: sprintLength,
    planningTool,
  });

  const goNext = async () => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (studioName.trim().length < 2) next["studioName"] = "Please enter your studio name.";
      if (!teamSize) next["teamSize"] = "Please select your team size.";
    }
    if (step === 1) {
      if (projectName.trim().length < 2) next["projectName"] = "Please enter your game name.";
      if (!resolvedGenre) next["genre"] = "Please choose a genre.";
    }
    if (step === 2) {
      if (!sprintLength) next["sprintLength"] = "Please choose a default sprint length.";
      if (!planningTool) next["planningTool"] = "Please choose your current planning tool.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (pending) return;
    setPending(true);
    try {
      await saveProgress({ data: payload() });
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your setup.");
    } finally {
      setPending(false);
    }
  };

  const complete = async (outcome: "COMPLETED" | "SKIPPED") => {
    if (pending) return;
    setPending(true);
    try {
      const result = await finish({
        data: {
          ...payload(),
          outcome,
          // Skipping before the project step must not create an empty project.
          projectName: outcome === "COMPLETED" || step > 1 ? projectName.trim() : "",
          genre: resolvedGenre,
        },
      });
      if (result.projectId) {
        window.localStorage.setItem(PROJECT_KEY, result.projectId);
      }
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      setPending(false);
      toast.error(error instanceof Error ? error.message : "Could not finish setup.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 py-10">
      <div className="w-full max-w-xl">
        <div className="flex justify-center">
          <GameSprintLogo variant="full" height={44} />
        </div>

        <ol className="mt-8 flex items-center gap-2" aria-label="Setup progress">
          {STEPS.map((label, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li key={label} className="flex flex-1 flex-col gap-2">
                <span
                  className={
                    "h-1.5 w-full rounded-full " +
                    (done || active ? "bg-primary" : "bg-muted")
                  }
                />
                <span
                  className={
                    "flex items-center gap-1 text-xs font-semibold " +
                    (active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")
                  }
                >
                  {done ? <Check className="size-3" aria-hidden /> : <span>{index + 1}.</span>}
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="surface-card mt-6 p-6 sm:p-8">
          {step === 0 ? (
            <StepShell
              title="Let's set up your studio"
              subtitle="Tell us a little about your team so GameSprint AI can adapt to your workflow."
            >
              <Field label="Studio name" htmlFor="studioName" error={errors["studioName"]}>
                <Input
                  id="studioName"
                  value={studioName}
                  onChange={(event) => setStudioName(event.target.value)}
                  placeholder="Nova Interactive"
                  maxLength={120}
                />
              </Field>
              <Field label="Website (optional)" htmlFor="website">
                <Input
                  id="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="novainteractive.com"
                  maxLength={255}
                />
              </Field>
              <Field label="Team size" htmlFor="teamSize" error={errors["teamSize"]}>
                <Select value={teamSize} onValueChange={setTeamSize}>
                  <SelectTrigger id="teamSize">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </StepShell>
          ) : null}

          {step === 1 ? (
            <StepShell
              title="Tell us about your game"
              subtitle="Start with the project you want to plan with GameSprint AI."
            >
              <Field label="Game / project name" htmlFor="projectName" error={errors["projectName"]}>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Skyward Drift"
                  maxLength={120}
                />
              </Field>
              <Field label="Genre" htmlFor="genre" error={errors["genre"]}>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other (type your own)</SelectItem>
                  </SelectContent>
                </Select>
                {genre === "Other" ? (
                  <Input
                    className="mt-2"
                    value={customGenre}
                    onChange={(event) => setCustomGenre(event.target.value)}
                    placeholder="Tactical roguelite"
                    maxLength={80}
                  />
                ) : null}
              </Field>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell
              title="How does your team work?"
              subtitle="These settings help GameSprint AI understand how you plan development."
            >
              <Field label="Default sprint length" htmlFor="sprintLength" error={errors["sprintLength"]}>
                <Select
                  value={sprintLength ? String(sprintLength) : ""}
                  onValueChange={(value) => setSprintLength(Number(value))}
                >
                  <SelectTrigger id="sprintLength">
                    <SelectValue placeholder="Select sprint length" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPRINT_LENGTHS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current planning tool" htmlFor="planningTool" error={errors["planningTool"]}>
                <Select value={planningTool} onValueChange={setPlanningTool}>
                  <SelectTrigger id="planningTool">
                    <SelectValue placeholder="Select a tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANNING_TOOLS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell
              title="You're ready to sprint."
              subtitle="Your workspace is ready. You can change these settings later."
            >
              <dl className="divide-y divide-border rounded-lg border border-border">
                <SummaryRow label="Studio" value={studioName} />
                <SummaryRow
                  label="Team"
                  value={TEAM_SIZES.find((option) => option.value === teamSize)?.label ?? teamSize}
                />
                <SummaryRow label="Project" value={projectName} />
                <SummaryRow label="Genre" value={resolvedGenre} />
                <SummaryRow
                  label="Sprint length"
                  value={SPRINT_LENGTHS.find((option) => option.value === sprintLength)?.label ?? ""}
                />
                <SummaryRow label="Planning tool" value={planningTool} />
              </dl>
            </StepShell>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {step === 3 ? (
              <Button className="sm:flex-1" disabled={pending} onClick={() => complete("COMPLETED")}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Enter GameSprint AI
              </Button>
            ) : (
              <Button className="sm:flex-1" disabled={pending} onClick={goNext}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Continue
              </Button>
            )}
            {step > 0 ? (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
              >
                Back
              </Button>
            ) : null}
            {step < 3 ? (
              <Button variant="ghost" disabled={pending} onClick={() => complete("SKIPPED")}>
                Skip for now
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value || "—"}</dd>
    </div>
  );
}
