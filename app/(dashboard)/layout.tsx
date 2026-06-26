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

  // getSession() reads from cookies — no network round-trip to Supabase auth servers.
  // Safe here because middleware.ts already called getUser() (which validates the JWT)
  // on every request before we reach this layout.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  // Fetch profile + clinic name in parallel (two independent queries)
  const [profileResult, settingResult] = await Promise.all([
    supabase.from("cp_users").select("*").eq("id", session.user.id).single(),
    supabase
      .from("cp_settings")
      .select("setting_value")
      .eq("setting_key", "clinic.clinic_name")
      .maybeSingle(),
  ]);

  const profile = profileResult.data as CpUser | null;

  if (profileResult.error || !profile || !profile.is_active) {
    redirect("/login");
  }

  const clinicName =
    (settingResult.data?.setting_value as string | null) ?? "ClinicPulse";

  return (
    <DashboardShell user={profile} clinicName={clinicName}>
      {children}
    </DashboardShell>
  );
}
