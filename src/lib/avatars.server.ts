/**
 * Profile pictures live in the private "avatars" bucket, one folder per user.
 * The stored value in profiles.avatar_url is the object path, never a URL, so
 * we hand out short-lived signed URLs from the server instead.
 */
export const AVATAR_BUCKET = "avatars";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Resolves storage object paths to signed URLs. Unknown/failed paths resolve to null. */
export async function signAvatarPaths(
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const signed = new Map<string, string>();
  if (unique.length === 0) return signed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  for (const entry of data ?? []) {
    const path = (entry as { path?: string | null }).path;
    if (path && entry.signedUrl) signed.set(path, entry.signedUrl);
  }
  return signed;
}

export async function signAvatarPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const map = await signAvatarPaths([path]);
  return map.get(path) ?? null;
}
