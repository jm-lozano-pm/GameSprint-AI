import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameSprintLogo } from "@/components/gs/gamesprint-logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — GameSprint AI" },
      {
        name: "description",
        content:
          "Sign in or create your GameSprint AI account to turn game ideas into sprint-ready development work.",
      },
      { property: "og:title", content: "Sign in — GameSprint AI" },
      {
        property: "og:description",
        content: "Access your GameSprint AI workspace: ideas, AI breakdowns, backlog and sprints.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/dashboard" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        // Deliberately does not reveal whether the email belongs to an account.
        setNotice("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then log in.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  };

  const google = async () => {
    setPending(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPending(false);
      toast.error("Google sign-in failed. Please try again or use email.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const switchMode = (next: "login" | "signup" | "forgot") => {
    setNotice(null);
    setMode(next);
  };

  const heading =
    mode === "login"
      ? "Log in to your studio"
      : mode === "signup"
        ? "Create your studio account"
        : "Reset your password";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <GameSprintLogo variant="full" height={40} />
        </Link>

        <div className="surface-card p-6">
          <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we'll send you a link to set a new password."
              : "Turn game ideas into sprint-ready development work."}
          </p>

          {notice ? (
            <p className="mt-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
              {notice}
            </p>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Your name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Alex Rivera"
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@studio.com"
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot your password?
                    </button>
                  ) : null}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {mode === "login"
                ? "Log in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
            </Button>
          </form>

          {mode !== "forgot" ? (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={google} disabled={pending}>
                Continue with Google
              </Button>
            </>
          ) : null}

          <div className="mt-5 space-y-1.5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <p>
                New to GameSprint AI?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => switchMode("signup")}
                >
                  Create an account
                </button>
              </p>
            ) : null}
            {mode === "signup" ? (
              <>
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                    onClick={() => switchMode("login")}
                  >
                    Log in
                  </button>
                </p>
                <p>
                  Lost access?{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                    onClick={() => switchMode("forgot")}
                  >
                    Reset your password
                  </button>
                </p>
              </>
            ) : null}
            {mode === "forgot" ? (
              <p>
                Remembered it?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => switchMode("login")}
                >
                  Back to log in
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
