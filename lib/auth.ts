import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CpUser, UserRole } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  profile: CpUser;
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user together with their cp_users profile.
 * Returns null if there is no session or if the profile doesn't exist / is inactive.
 * Safe to call from any Server Component or Server Action.
 */
// React.cache() deduplicates calls within the same server render tree.
// The layout, every page's requireAuth(), and any server action calling
// getCurrentUser() in the same request all share one result at zero cost.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) return null;

  const { data: profileData, error: profileError } = await supabase
    .from("cp_users")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as CpUser | null;

  if (profileError || !profile) return null;
  if (!profile.is_active) return null;

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile,
  };
})

// ─── getUserRole ──────────────────────────────────────────────────────────────
/**
 * Returns the user's role, or null if the user is not authenticated or the
 * profile cannot be found.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const authUser = await getCurrentUser();
  return authUser?.profile.role ?? null;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────
/**
 * Asserts that a valid session exists.
 * Redirects to /login when the check fails.
 * Returns the AuthUser on success.
 */
export async function requireAuth(): Promise<AuthUser> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect("/login");
  }

  return authUser;
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────
/**
 * Asserts that a valid session exists AND that the user is an admin.
 * Redirects to /login if unauthenticated, or to /dashboard if role is insufficient.
 * Returns the AuthUser on success.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.profile.role !== "admin") {
    redirect("/dashboard?error=insufficient_permissions");
  }

  return authUser;
}
