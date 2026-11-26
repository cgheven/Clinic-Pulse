import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Per-clinic metadata for the shell: display name + billing state. Queried per
 * request (not statically cached) because this is multi-tenant — a static cache
 * key would serve one clinic's data to every tenant. RLS scopes both reads to the
 * caller's own clinic. The clinic name lives in cp_settings['clinic.clinic_name']
 * (what the Settings page edits); cp_clinics.name is the signup fallback.
 */
async function getClinicMeta(clinicId: string) {
  const supabase = await createClient();
  const [nameRes, clinicRes] = await Promise.all([
    supabase
      .from("cp_settings")
      .select("setting_value")
      .eq("setting_key", "clinic.clinic_name")
      .maybeSingle(),
    supabase
      .from("cp_clinics")
      .select("name, trial_ends_at, frozen")
      .eq("id", clinicId)
      .maybeSingle(),
  ]);

  const clinic = clinicRes.data as
    | { name: string; trial_ends_at: string | null; frozen: boolean }
    | null;
  const settingName = nameRes.data?.setting_value as string | null | undefined;

  return {
    name: settingName || clinic?.name || "ClinicPulse",
    trialEndsAt: clinic?.trial_ends_at ?? null,
    frozen: clinic?.frozen ?? false,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser() is memoized via React.cache — layout + every page's
  // requireAuth() within the same render share exactly one getUser() round-trip.
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/login");

  const { name, trialEndsAt, frozen } = await getClinicMeta(
    authUser.profile.clinic_id
  );

  return (
    <DashboardShell
      user={authUser.profile}
      clinicName={name}
      trialEndsAt={trialEndsAt}
      frozen={frozen}
    >
      {children}
    </DashboardShell>
  );
}
