import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users, UserPlus, MoreHorizontal, Briefcase, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/gs/app-shell";
import { EmptyState, ErrorState, LoadingState, SectionCard } from "@/components/gs/states";
import { UserAvatar } from "@/components/gs/user-avatar";
import { IconGlyph } from "@/components/gs/icon-glyph";
import { IconPickerField } from "@/components/gs/emoji-icon-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjectAccessGuard } from "@/lib/use-project-access";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeProjectMember,
} from "@/lib/projects.functions";
import {
  listProfessionalRoles,
  createProfessionalRole,
  renameProfessionalRole,
  deleteProfessionalRole,
  setMemberProfessionalRoles,
} from "@/lib/team.functions";

const ASSIGNABLE_ROLES = ["ADMIN", "DESIGNER", "DEVELOPER", "QA"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  DESIGNER: "Designer",
  DEVELOPER: "Developer",
  QA: "QA",
};

export const Route = createFileRoute("/_authenticated/projects/$projectId/members")({
  head: () => ({
    meta: [
      { title: "Team & roles — GameSprint AI" },
      {
        name: "description",
        content:
          "Add teammates, set what each person does on the team (artist, programmer, designer and more) and control their project permissions.",
      },
      { property: "og:title", content: "Team & roles — GameSprint AI" },
      {
        property: "og:description",
        content:
          "Manage your game team: professional roles for who does what, permissions for what they may change.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchMembers = useServerFn(getProjectMembers);
  const addMember = useServerFn(addProjectMember);
  const changeRole = useServerFn(updateMemberRole);
  const removeMember = useServerFn(removeProjectMember);
  const fetchRoles = useServerFn(listProfessionalRoles);
  const createRole = useServerFn(createProfessionalRole);
  const renameRole = useServerFn(renameProfessionalRole);
  const deleteRole = useServerFn(deleteProfessionalRole);
  const saveMemberRoles = useServerFn(setMemberProfessionalRoles);

  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("DEVELOPER");
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; label: string } | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleIcon, setNewRoleIcon] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<{
    id: string;
    name: string;
    icon: string | null;
  } | null>(null);
  const [deletingRole, setDeletingRole] = useState<{ id: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    label: string;
    roleIds: string[];
  } | null>(null);

  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => fetchMembers({ data: { projectId } }),
  });
  useProjectAccessGuard(projectId, membersQuery.error);

  const rolesQuery = useQuery({
    queryKey: ["professional-roles", projectId],
    queryFn: () => fetchRoles({ data: { projectId } }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["members", projectId] });
    queryClient.invalidateQueries({ queryKey: ["professional-roles", projectId] });
  };
  const failed = (error: Error) => toast.error(error.message.replace("FORBIDDEN: ", ""));

  const addMutation = useMutation({
    mutationFn: () => addMember({ data: { projectId, email, role } }),
    onSuccess: () => {
      invalidate();
      toast.success("Member added to this project");
      setAddOpen(false);
      setEmail("");
      setRole("DEVELOPER");
    },
    onError: failed,
  });

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: string; role: AssignableRole }) =>
      changeRole({ data: { projectId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Permissions updated");
    },
    onError: failed,
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember({ data: { projectId, memberId } }),
    onSuccess: () => {
      invalidate();
      setPendingRemoval(null);
      toast.success("Member removed from this project");
    },
    onError: failed,
  });

  const createRoleMutation = useMutation({
    mutationFn: () =>
      createRole({ data: { projectId, name: newRoleName.trim(), icon: newRoleIcon } }),
    onSuccess: () => {
      invalidate();
      setNewRoleName("");
      setNewRoleIcon(null);
      toast.success("Professional role added");
    },
    onError: failed,
  });

  const renameRoleMutation = useMutation({
    mutationFn: () =>
      renameRole({
        data: {
          projectId,
          roleId: editingRole!.id,
          name: editingRole!.name.trim(),
          icon: editingRole!.icon,
        },
      }),
    onSuccess: () => {
      invalidate();
      setEditingRole(null);
      toast.success("Professional role renamed");
    },
    onError: failed,
  });

  const deleteRoleMutation = useMutation({
    mutationFn: () => deleteRole({ data: { projectId, roleId: deletingRole!.id } }),
    onSuccess: () => {
      invalidate();
      setDeletingRole(null);
      toast.success("Professional role deleted");
    },
    onError: failed,
  });

  const memberRolesMutation = useMutation({
    mutationFn: () =>
      saveMemberRoles({
        data: { projectId, memberId: editingMember!.id, roleIds: editingMember!.roleIds },
      }),
    onSuccess: () => {
      invalidate();
      setEditingMember(null);
      toast.success("Roles updated");
    },
    onError: failed,
  });

  const members = membersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const canManage = members.some((member) => member.isMe && member.canManage);
  const unassignedCount = members.filter(
    (member) => member.professionalRoles.length === 0,
  ).length;

  return (
    <AppShell
      projectId={projectId}
      title="Team & roles"
      subtitle="Professional roles describe what people do. Permissions decide what they may change."
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" aria-hidden />
            Add member
          </Button>
        ) : null
      }
    >
      {membersQuery.isPending ? (
        <LoadingState label="Loading your team" />
      ) : membersQuery.error ? (
        <ErrorState
          message={(membersQuery.error as Error).message}
          onRetry={() => membersQuery.refetch()}
        />
      ) : members.length === 0 ? (
        <EmptyState
          title="No members in this project yet"
          description="Project members can capture ideas, review AI breakdowns, approve work and run sprints."
          icon={<Users className="size-5" aria-hidden />}
        />
      ) : (
        <div className="space-y-5">
          <SectionCard
            title="Team composition"
            hint="How many people hold each professional role in this project."
            icon={<Briefcase className="size-4 text-primary" aria-hidden />}
          >
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No professional roles yet. Add roles like Programmer, Artist or Producer below to see
                your team composition at a glance.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {roles.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-2 text-2xl leading-none font-semibold">
                      <IconGlyph value={entry.icon} className="size-5 text-xl" />
                      {entry.memberCount}
                    </p>
                    <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">
                      {entry.name}
                      {entry.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border-strong p-3">
                  <p className="text-2xl font-semibold leading-none text-muted-foreground">
                    {unassignedCount}
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                    Without a role
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Project team"
            hint="Each person can hold several professional roles, e.g. Artist and Designer."
            icon={<Users className="size-4 text-primary" aria-hidden />}
          >
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const label = member.display_name ?? member.email ?? "Team member";
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={label} imageUrl={member.avatar_url} className="size-9" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <IconGlyph value={member.icon} className="size-4 text-sm" />
                          <span className="truncate">
                            {label}
                            {member.isMe ? " (you)" : ""}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email ? `${member.email} · ` : ""}Joined{" "}
                          {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {member.professionalRoles.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground">
                              No professional role set
                            </span>
                          ) : (
                            member.professionalRoles.map((professional) => (
                              <span
                                key={professional.id}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-semibold leading-none text-primary"
                              >
                                <IconGlyph value={professional.icon} className="size-3 text-[11px]" />
                                {professional.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-border-strong bg-muted px-2.5 py-1 text-[11px] font-semibold leading-none text-body">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                      {member.canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Manage ${label}`}
                              className="size-8"
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() =>
                                setEditingMember({
                                  id: member.id,
                                  label,
                                  roleIds: member.professionalRoles.map(
                                    (professional) => professional.id,
                                  ),
                                })
                              }
                            >
                              Set professional roles
                            </DropdownMenuItem>
                            {member.role !== "OWNER" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                                {ASSIGNABLE_ROLES.map((option) => (
                                  <DropdownMenuItem
                                    key={option}
                                    disabled={member.role === option || roleMutation.isPending}
                                    onClick={() =>
                                      roleMutation.mutate({ memberId: member.id, role: option })
                                    }
                                  >
                                    {ROLE_LABELS[option]}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setPendingRemoval({ id: member.id, label })}
                                >
                                  Remove member
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          {canManage ? (
            <SectionCard
              title="Professional roles"
              hint="Roles are specific to this project. Deleting a role never removes anyone from the team."
              icon={<Briefcase className="size-4 text-dev" aria-hidden />}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-role-icon">Icon</Label>
                    <IconPickerField
                      value={newRoleIcon}
                      onChange={setNewRoleIcon}
                      label="role icon"
                      buttonId="new-role-icon"
                    />
                  </div>
                  <div className="min-w-48 flex-1 space-y-1.5">
                    <Label htmlFor="new-role">Role name</Label>
                    <Input
                      id="new-role"
                      value={newRoleName}
                      maxLength={60}
                      placeholder="Gameplay Programmer"
                      onChange={(event) => setNewRoleName(event.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => createRoleMutation.mutate()}
                    disabled={newRoleName.trim().length < 2 || createRoleMutation.isPending}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add role
                  </Button>
                </div>

                {roles.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {roles.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                            <IconGlyph value={entry.icon} className="size-4 text-sm" />
                            {entry.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.memberCount} member{entry.memberCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Edit ${entry.name}`}
                            onClick={() =>
                              setEditingRole({
                                id: entry.id,
                                name: entry.name,
                                icon: entry.icon ?? null,
                              })
                            }
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label={`Delete ${entry.name}`}
                            onClick={() => setDeletingRole({ id: entry.id, name: entry.name })}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a member</DialogTitle>
            <DialogDescription>
              Enter the email of someone who already has a GameSprint AI account. They only gain
              access to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@studio.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Permissions</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AssignableRole)}>
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can set what they do on the team — their professional roles — right after adding
                them.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !email.includes("@")}
            >
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingMember !== null}
        onOpenChange={(open) => (open ? null : setEditingMember(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Professional roles</DialogTitle>
            <DialogDescription>
              Choose everything {editingMember?.label} does on this project. This does not change
              their permissions.
            </DialogDescription>
          </DialogHeader>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add professional roles to this project first.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {roles.map((entry) => {
                const checked = editingMember?.roleIds.includes(entry.id) ?? false;
                return (
                  <li key={entry.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`role-${entry.id}`}
                      checked={checked}
                      onCheckedChange={(next) =>
                        setEditingMember((current) =>
                          current
                            ? {
                                ...current,
                                roleIds:
                                  next === true
                                    ? [...current.roleIds, entry.id]
                                    : current.roleIds.filter((id) => id !== entry.id),
                              }
                            : current,
                        )
                      }
                    />
                    <Label
                      htmlFor={`role-${entry.id}`}
                      className="flex items-center gap-1.5 text-sm font-normal"
                    >
                      <IconGlyph value={entry.icon} className="size-4 text-sm" />
                      {entry.name}
                    </Label>
                  </li>
                );
              })}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => memberRolesMutation.mutate()}
              disabled={memberRolesMutation.isPending || roles.length === 0}
            >
              Save roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRole !== null}
        onOpenChange={(open) => (open ? null : setEditingRole(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit professional role</DialogTitle>
            <DialogDescription>
              Everyone who holds this role keeps it under the new name and icon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-role-icon">Icon</Label>
              <IconPickerField
                value={editingRole?.icon ?? null}
                onChange={(next) =>
                  setEditingRole((current) => (current ? { ...current, icon: next } : current))
                }
                label="role icon"
                buttonId="edit-role-icon"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rename-role">Role name</Label>
              <Input
                id="rename-role"
                maxLength={60}
                value={editingRole?.name ?? ""}
                onChange={(event) =>
                  setEditingRole((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => renameRoleMutation.mutate()}
              disabled={
                renameRoleMutation.isPending || (editingRole?.name.trim().length ?? 0) < 2
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingRole !== null}
        onOpenChange={(open) => (open ? null : setDeletingRole(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deletingRole?.name}”?</DialogTitle>
            <DialogDescription>
              The role is removed from everyone who holds it. Nobody loses project access, and no
              work is deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRole(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRoleMutation.isPending}
              onClick={() => deleteRoleMutation.mutate()}
            >
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => (open ? null : setPendingRemoval(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this member from the project?</DialogTitle>
            <DialogDescription>
              {pendingRemoval?.label} will immediately lose access to this project's ideas, backlog
              and sprints. Their work stays in the project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => pendingRemoval && removeMutation.mutate(pendingRemoval.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
