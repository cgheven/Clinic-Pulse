import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase native email-confirmation callback.
 *
 * The confirmation link sent by `supabase.auth.signUp({ options: { emailRedirectTo } })`
 * lands here with `token_hash` + `type`. We verify the OTP, which establishes the
 * session (cookies are written by the SSR client), then redirect the now-confirmed
 * user to their dashboard. The provisioning trigger (fn_handle_new_user) already
 * created their clinic + profile at signUp time, so the dashboard loads ready.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Only ever redirect to a same-origin path — never an attacker-supplied URL.
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  // Invalid or expired link.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "confirmation_failed");
  return NextResponse.redirect(loginUrl);
}
