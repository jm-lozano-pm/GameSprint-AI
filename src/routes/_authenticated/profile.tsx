import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { UserCircle2, ShieldCheck, TriangleAlert, Loader2, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { ErrorState, LoadingState, SectionCard } from "@/components/gs/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyAccount,
  updateMyAccount,
  deleteMyAccount,
  setMyAvatar,
  removeMyAvatar,
} from "@/lib/account.functions";
import { UserAvatar } from "@/components/gs/user-avatar";
import { AvatarCropper } from "@/components/gs/avatar-cropper";
import { IconPickerField } from "@/components/gs/emoji-icon-picker";
import { IconGlyph } from "@/components/gs/icon-glyph";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & account — GameSprint AI" },
      {
        name: "description",
        content:
          "Manage your personal GameSprint AI account: your name, email, password and account deletion. These settings apply to your account, not to a single project.",
      },
      { property: "og:title", content: "Profile & account — GameSprint AI" },
      {
        property: "og:description",
        content: "Personal account settings for your GameSprint AI user.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const saveAccount = useServerFn(updateMyAccount);
  const deleteAccount = useServerFn(deleteMyAccount);
  const saveAvatar = useServerFn(setMyAvatar);
  const clearAvatar = useServerFn(removeMyAvatar);

  const accountQuery = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });

  const [displayName, setDisplayName] = useState("");
  const [nameIcon, setNameIcon] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const invalidateAvatar = () => {
    queryClient.invalidateQueries({ queryKey: ["account"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(error.message);
      await saveAvatar({ data: { path } });
    },
    onSuccess: () => {
      setPhotoFile(null);
      invalidateAvatar();
      toast.success("Profile picture updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removePhotoMutation = useMutation({
    mutationFn: () => clearAvatar(),
    onSuccess: () => {
      invalidateAvatar();
      toast.success("Profile picture removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pickPhoto = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setPhotoFile(file);
  };

  useEffect(() => {
    if (accountQuery.data) {
      setDisplayName(accountQuery.data.display_name ?? "");
      setNameIcon(accountQuery.data.icon ?? null);
    }
  }, [accountQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveAccount({ data: { displayName, icon: nameIcon } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Your personal details were updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: async () => {
      toast.success("Your account has been deleted");
      await supabase.auth.signOut();
      navigate({ to: "/" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const changePassword = async () => {
    if (password.length < 6) {
      toast.error("Use at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("The two passwords do not match.");
      return;
    }
    setPasswordPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  return (
    <AppShell
      title="Profile & account"
      subtitle="These settings belong to your personal account — not to any single project."
    >
      {accountQuery.isPending ? (
        <LoadingState label="Loading your account" />
      ) : accountQuery.error ? (
        <ErrorState
          message={(accountQuery.error as Error).message}
          onRetry={() => accountQuery.refetch()}
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <SectionCard
            title="Profile picture"
            hint="Your photo appears on assignments, sprint boards and the team list. Without one, your initials are used."
            icon={<Camera className="size-4 text-primary" aria-hidden />}
          >
            <div className="flex flex-wrap items-center gap-5">
              <UserAvatar
                name={accountQuery.data?.display_name ?? accountQuery.data?.email ?? null}
                imageUrl={accountQuery.data?.avatar_url}
                className="size-20"
                fallbackClassName="text-lg"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {accountQuery.data?.avatar_url ? "Change photo" : "Upload photo"}
                  </Button>
                  {accountQuery.data?.avatar_url ? (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removePhotoMutation.mutate()}
                      disabled={removePhotoMutation.isPending}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or WebP up to 5 MB. You can reposition and zoom before saving.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  pickPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Personal information"
            hint="Your name is shown to teammates in the projects you share."
            icon={<UserCircle2 className="size-4 text-primary" aria-hidden />}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Your name</Label>
                <div className="flex items-center gap-2">
                  <IconPickerField
                    value={nameIcon}
                    onChange={setNameIcon}
                    label="profile icon"
                    buttonId="account-icon"
                  />
                  <Input
                    id="account-name"
                    className="flex-1"
                    value={displayName}
                    maxLength={120}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Alex Rivera"
                  />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Shown as
                  <span className="inline-flex items-center gap-1 font-medium text-body">
                    <IconGlyph value={nameIcon} className="size-3.5 text-xs" />
                    {displayName || "your name"}
                  </span>
                  · your profile icon is separate from your photo.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-email">Email</Label>
                <Input id="account-email" value={accountQuery.data?.email ?? ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Your email is your sign-in identity and cannot be changed here.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                You are a member of {accountQuery.data?.projectCount ?? 0} project
                {accountQuery.data?.projectCount === 1 ? "" : "s"}.
              </p>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || displayName.trim().length < 2}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Save changes
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Security"
            hint="Set a new password for email sign-in. If you use Google, you can set a password here too."
            icon={<ShieldCheck className="size-4 text-success" aria-hidden />}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>
              <Button variant="outline" onClick={changePassword} disabled={passwordPending}>
                {passwordPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Update password
              </Button>
            </div>
          </SectionCard>

          <section className="surface-card border-destructive/30 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <TriangleAlert className="size-4" aria-hidden />
              Delete account
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Deleting your account is permanent. Projects you own — including their ideas,
              approvals, backlog and sprints — are deleted with it.
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => {
                setConfirmDelete("");
                setDialogOpen(true);
              }}
            >
              Delete account
            </Button>
          </section>
        </div>
      )}

      <AvatarCropper
        file={photoFile}
        open={photoFile !== null}
        pending={uploadMutation.isPending}
        onCancel={() => setPhotoFile(null)}
        onConfirm={(blob) => uploadMutation.mutate(blob)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">Confirmation</Label>
            <Input
              id="confirm-delete"
              value={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmDelete !== "DELETE" || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
