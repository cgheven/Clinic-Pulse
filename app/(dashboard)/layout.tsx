import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Cached for 1 hour; busted by revalidateTag('settings-clinic') in updateGeneralSettings()
const getClinicName = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cp_settings")
      .select("setting_value")
      .eq("setting_key", "clinic.clinic_name")
      .maybeSingle();
    return (data?.setting_value as string | null) ?? "ClinicPulse";
  },
  ["clinic-name"],
  { revalidate: 3600, tags: ["settings-clinic"] }
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getCurrentUser() is memoized via React.cache — layout + every page's
  // requireAuth() within the same render share exactly one getUser() round-trip.
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/login");

  const clinicName = await getClinicName();

  return (
    <DashboardShell user={authUser.profile} clinicName={clinicName}>
      {children}
    </DashboardShell>
  );
}
