"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { Metadata } from "next";

// Note: metadata must be in a server component; exported here for reference only.
// Set page title via the (auth) segment's layout or root layout if needed.

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: error.message,
        });
        return;
      }

      if (!data.user) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "No user returned. Please try again.",
        });
        return;
      }

      // Fetch user profile to verify access
      type UserProfile = { role: "admin" | "accountant"; is_active: boolean };
      const profileResult = await supabase
        .from("cp_users")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      const profileError = profileResult.error;
      const profile = profileResult.data as UserProfile | null;

      if (profileError || !profile) {
        toast({
          variant: "destructive",
          title: "Account not found",
          description:
            "Your account was not found in the system. Contact your administrator.",
        });
        await supabase.auth.signOut();
        return;
      }

      if (!profile.is_active) {
        toast({
          variant: "destructive",
          title: "Account disabled",
          description:
            "Your account has been disabled. Contact your administrator.",
        });
        await supabase.auth.signOut();
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Redirecting to dashboard…",
      });

      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-4">
      {/* Amber ambient glow — top center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
      >
        <div className="h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      {/* Subtle secondary glows at corners */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-amber-600/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-1/4 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & branding */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          {/* Amber icon circle with glow ring */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-md" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/40">
              <Activity className="h-8 w-8 text-[#07070d]" strokeWidth={2.5} />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ClinicPulse
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Medical Center Management
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
          {/* Card inner glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
          />

          <div className="mb-6">
            <h2 className="text-base font-semibold text-white/90">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-white/40">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-white/60"
              >
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/[0.08] bg-white/[0.04] pl-9 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-white/60"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/[0.08] bg-white/[0.04] pl-9 pr-10 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-amber-500 font-semibold text-[#07070d] shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          ClinicPulse &copy; {new Date().getFullYear()} — All rights reserved
        </p>
      </div>
    </div>
  );
}
