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

  const settingResult = await supabase
    .from("cp_settings")
    .select("setting_value")
    .eq("setting_key", "clinic.clinic_name")
    .maybeSingle();

  const clinicName =
    (settingResult.data?.setting_value as string | null) ?? "ClinicPulse";

  return (
    <DashboardShell user={profile} clinicName={clinicName}>
      {children}
    </DashboardShell>
  );
}
