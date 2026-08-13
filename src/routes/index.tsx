import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Lightbulb,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  Gamepad2,
  ListChecks,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameSprintLogo } from "@/components/gs/gamesprint-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameSprint AI — Turn game ideas into sprint-ready work" },
      {
        name: "description",
        content:
          "GameSprint AI turns rough game ideas into user stories, acceptance criteria, edge cases and sprint-ready tasks. AI recommends, humans decide.",
      },
      { property: "og:title", content: "GameSprint AI — From game idea to sprint-ready work" },
      {
        property: "og:description",
        content:
          "AI breakdowns for indie and small game teams: user stories, acceptance criteria, edge cases, tasks, priority and story points — reviewed and approved by humans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI breakdowns",
    body: "One rough idea becomes user stories, acceptance criteria, edge cases and tasks — plus a priority and story-point recommendation.",
  },
  {
    icon: ClipboardCheck,
    title: "Human approval gate",
    body: "Nothing becomes development work until a person edits, regenerates or explicitly approves it. Every approval is snapshotted.",
  },
  {
    icon: ListChecks,
    title: "Backlog that stays true",
    body: "Approved ideas flow into a backlog. Later edits to the idea sync into the backlog item, so the two never drift apart.",
  },
  {
    icon: Gauge,
    title: "Sprints and boards",
    body: "Plan a sprint, start it explicitly, and drag work across To Do, In Progress, In Review and Done.",
  },
  {
    icon: Users,
    title: "Roles per project",
    body: "Owners, admins, designers, developers and QA. Access is enforced in the database, not in the browser.",
  },
  {
    icon: ShieldCheck,
    title: "Your concepts stay yours",
    body: "Projects are isolated and AI requests run server-side with only the minimum authorised context for that one project.",
  },
];

const STEPS = [
  { icon: Lightbulb, title: "Game Idea", body: "Capture a rough feature idea in plain language." },
  { icon: Sparkles, title: "AI Breakdown", body: "Structured stories, criteria, edge cases and tasks." },
  { icon: ClipboardCheck, title: "Human Review", body: "Edit, regenerate and explicitly approve." },
  { icon: Gauge, title: "Sprint", body: "Approved work moves to backlog, sprint and board." },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "For solo devs testing the workflow.",
    features: ["1 project", "AI breakdowns", "Backlog and one sprint", "Single member"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "per month",
    blurb: "For small teams shipping regularly.",
    features: [
      "Unlimited projects",
      "Unlimited AI breakdowns",
      "Sprint lifecycle and boards",
      "Up to 10 members",
      "Role-based access",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Studio",
    price: "$49",
    cadence: "per month",
    blurb: "For studios running multiple teams.",
    features: [
      "Everything in Pro",
      "Unlimited members",
      "Approval history and snapshots",
      "Priority support",
    ],
    cta: "Get started",
    featured: false,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2">
          <GameSprintLogo variant="full" height={60} />
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Gamepad2 className="size-3.5" aria-hidden />
              For indie and small game teams
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Ship better games.
              <span className="block text-primary">Sprint smarter.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-body">
              GameSprint AI turns a rough game idea into clear, sprint-ready development work — user
              stories, acceptance criteria, potential edge cases, tasks, a priority recommendation
              and a story-point estimate. AI recommends. Humans decide.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">AI Breakdown</p>
                <p className="text-xs text-muted-foreground">Double jump with coyote time</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  User stories
                </p>
                <ul className="mt-2 space-y-2">
                  {[
                    "As a player, I can jump a second time while airborne so I can reach higher platforms.",
                    "As a player, I get a short grace window after leaving a ledge so jumps feel fair.",
                  ].map((line) => (
                    <li
                      key={line}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-body"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Acceptance criteria
                </p>
                <ul className="mt-2 space-y-2">
                  {[
                    "Second jump is consumed once and resets on ground contact.",
                    "Coyote window is 120ms and configurable per character.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-body">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Priority: High
                </span>
                <span className="rounded-full border border-border-strong bg-muted px-2.5 py-1 text-[11px] font-semibold text-body">
                  5 points
                </span>
                <span className="text-xs text-muted-foreground">Awaiting human review</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Everything your team needs to plan faster
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
              From the first rough idea to a running sprint board — without the copy-paste planning
              busywork.
            </p>
            <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="surface-card p-5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <feature.icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            From idea to sprint in four steps
          </h2>
          <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="surface-card p-5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <step.icon className="size-4" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-semibold text-muted-foreground">Step {index + 1}</p>
                <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-surface py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Simple pricing for small teams
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
              Start free. Upgrade when your team grows.
            </p>
            <ul className="mt-9 grid gap-4 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <li
                  key={plan.name}
                  className={
                    plan.featured
                      ? "surface-card relative border-primary/50 p-6 shadow-lg"
                      : "surface-card p-6"
                  }
                >
                  {plan.featured ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.cadence}</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-body">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-6 w-full"
                    variant={plan.featured ? "default" : "outline"}
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {plan.cta}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="surface-card flex flex-col items-center gap-4 p-10 text-center">
            <GameSprintLogo variant="symbol" height={44} decorative />
            <h2 className="text-2xl font-semibold tracking-tight">
              Turn your next idea into sprint-ready work
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Capture an idea, let AI do the structured breakdown, then approve what your team should
              actually build.
            </p>
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        GameSprint AI — AI recommends, humans decide.
      </footer>
    </div>
  );
}
