import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Personal account information — global to the user, never project-scoped. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, email, created_at, avatar_url, icon")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: memberships } = await context.supabase
      .from("project_members")
      .select("id", { count: "exact" });

    const { signAvatarPath } = await import("./avatars.server");

    return {
      id: context.userId,
      display_name: profile?.display_name ?? null,
      icon: profile?.icon ?? null,
      email: profile?.email ?? (context.claims["email"] as string | undefined) ?? null,
      created_at: profile?.created_at ?? null,
      avatar_url: await signAvatarPath(profile?.avatar_url),
      projectCount: memberships?.length ?? 0,
    };
  });

/**
 * Records a newly uploaded profile picture. The image itself is uploaded from
 * the browser straight into the user's own folder in the private avatars
 * bucket; only the object path is stored here.
 */
export const setMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(3).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) {
      throw new Error("FORBIDDEN: you can only set your own profile picture.");
    }
    const { data: previous } = await context.supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.path })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    // Old images are removed so the bucket does not accumulate dead files.
    if (previous?.avatar_url && previous.avatar_url !== data.path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("avatars").remove([previous.avatar_url]);
    }
    return { ok: true };
  });

/** Removes the picture and falls back to initials everywhere. */
export const removeMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    if (profile?.avatar_url) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("avatars").remove([profile.avatar_url]);
    }
    return { ok: true };
  });


export const updateMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        displayName: z.string().trim().min(2).max(120),
        icon: z.string().trim().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName, icon: data.icon ?? null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Permanently deletes the signed-in user's own account. Projects they own are
 * removed with them; membership rows cascade from auth.users.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Owned projects are deleted with the account so no orphaned project data remains.
    const { data: owned } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("owner_id", context.userId);
    for (const project of owned ?? []) {
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
