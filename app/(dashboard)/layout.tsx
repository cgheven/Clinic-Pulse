import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { CpUser } from "@/types/index";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify the current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user profile from cp_users
  const profileResult = await supabase
    .from("cp_users")
    .select("*")
    .eq("id", user.id)
    .single();

  const error = profileResult.error;
  const profile = profileResult.data as CpUser | null;

  if (error || !profile) {
    // Profile missing — redirect to login
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/login");
  }

  return <DashboardShell user={profile}>{children}</DashboardShell>;
}
