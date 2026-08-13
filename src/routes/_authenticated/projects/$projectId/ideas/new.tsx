import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { SectionCard } from "@/components/gs/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createIdea, generateBreakdownForFeature } from "@/lib/features.functions";
import { GENERATION_STEPS } from "@/lib/gamesprint";

export const Route = createFileRoute("/_authenticated/projects/$projectId/ideas/new")({
  head: () => ({
    meta: [
      { title: "New idea — GameSprint AI" },
      {
        name: "description",
        content:
          "Describe a game feature idea in plain language and let GameSprint AI draft the user stories, acceptance criteria, edge cases and tasks.",
      },
      { property: "og:title", content: "New idea — GameSprint AI" },
      {
        property: "og:description",
        content: "Capture a game idea and generate a reviewable AI breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewIdeaPage,
});

function NewIdeaPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const create = useServerFn(createIdea);
  const generate = useServerFn(generateBreakdownForFeature);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [step, setStep] = useState(0);

  const draftMutation = useMutation({
    mutationFn: () => create({ data: { projectId, name, description, context } }),
    onSuccess: (idea) => {
      toast.success("Idea saved as a draft");
      navigate({
        to: "/projects/$projectId/ideas/$featureId",
        params: { projectId, featureId: idea.id },
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const idea = await create({ data: { projectId, name, description, context } });
      setStep(1);
      const timer = window.setInterval(
        () => setStep((current) => Math.min(current + 1, GENERATION_STEPS.length - 1)),
        1600,
      );
      try {
        await generate({ data: { projectId, featureId: idea.id, mode: "initial" } });
      } catch (error) {
        window.clearInterval(timer);
        // The idea is already saved: send the user to it so nothing is lost.
        toast.error(
          error instanceof Error ? error.message : "The AI breakdown failed. Your idea was saved.",
        );
        navigate({
          to: "/projects/$projectId/ideas/$featureId",
          params: { projectId, featureId: idea.id },
        });
        throw error;
      }
      window.clearInterval(timer);
      return idea;
    },
    onSuccess: (idea) => {
      toast.success("AI breakdown ready for review");
      navigate({
        to: "/projects/$projectId/ideas/$featureId",
        params: { projectId, featureId: idea.id },
      });
    },
  });

  const canSubmit = name.trim().length >= 3 && description.trim().length >= 10;

  return (
    <AppShell
      projectId={projectId}
      title="New idea"
      subtitle="Save the raw idea now — run the AI breakdown whenever you are ready."
    >
      <div className="mx-auto max-w-2xl">
        <SectionCard
          title="Describe the feature"
          hint="Plain language is fine — no need to write requirements yourself."
          icon={<Sparkles className="size-4 text-primary" aria-hidden />}
        >
          {mutation.isPending ? (
            <div className="py-4" role="status" aria-live="polite">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                {GENERATION_STEPS[step]}…
              </p>
              <ol className="mt-4 space-y-2">
                {GENERATION_STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={
                      index <= step
                        ? "text-sm font-medium text-primary"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {label}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                This usually takes under a minute. Nothing becomes development work until you
                approve it.
              </p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="idea-name">Idea name</Label>
                <Input
                  id="idea-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Grappling hook traversal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-description">What should it do?</Label>
                <Textarea
                  id="idea-description"
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Players can fire a grappling hook at marked surfaces to swing across gaps and reach rooftops. It should feel fast and forgiving, with a short cooldown."
                />
                <p className="text-xs text-muted-foreground">
                  At least a couple of sentences gives the AI enough to work with. You can save a
                  draft now and generate the breakdown later.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-context">Extra context (optional)</Label>
                <Textarea
                  id="idea-context"
                  rows={3}
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Constraints, engine details, related systems…"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!canSubmit}>
                  <Sparkles className="size-4" aria-hidden />
                  Save and generate breakdown
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canSubmit || draftMutation.isPending}
                  onClick={() => draftMutation.mutate()}
                >
                  <Save className="size-4" aria-hidden />
                  Save as draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/projects/$projectId/ideas", params: { projectId } })}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
