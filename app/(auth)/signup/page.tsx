"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntlPhoneInput } from "@/components/ui/phone-input";
import {
  SUPPORTED_COUNTRIES,
  getCountryConfig,
  DEFAULT_COUNTRY,
} from "@/lib/country-config";
import { toast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); // E.164, e.g. +923001234567
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Currency/locale derived live from the chosen country — the server re-derives
  // the same values from `country` at provisioning time, so this is just a preview.
  const config = useMemo(() => getCountryConfig(country), [country]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Use at least 8 characters.",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: fullName.trim(),
            clinic_name: clinicName.trim(),
            country: config.code,
            currency: config.currency,
            phone: phone || null,
          },
        },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Could not create account",
          description: error.message,
        });
        return;
      }

      setSubmitted(true);
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
    <div className="mobile-no-zoom relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070d] px-4 py-10">
      {/* Amber ambient glow — top center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
      >
        <div className="h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-amber-600/5 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & branding */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
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

        {submitted ? (
          /* ── Confirmation screen ─────────────────────────────────────── */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center shadow-2xl backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-white/50">
              We sent a confirmation link to{" "}
              <span className="font-medium text-white/80">{email}</span>. Click it
              to activate your clinic and sign in.
            </p>
            <p className="mt-4 text-xs text-white/30">
              Didn&apos;t get it? Check spam, or{" "}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          /* ── Signup form ─────────────────────────────────────────────── */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white/90">
                Create your clinic account
              </h2>
              <p className="mt-1 text-sm text-white/40">
                Free 14-day trial — no card required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-medium text-white/60">
                  Your name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Dr. Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.04] pl-9 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Clinic name */}
              <div className="space-y-1.5">
                <Label htmlFor="clinicName" className="text-xs font-medium text-white/60">
                  Clinic name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="clinicName"
                    type="text"
                    placeholder="Smith Family Clinic"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.04] pl-9 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-medium text-white/60">
                  Country
                </Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loading}
                  className="h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#0d0d14] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/30">
                  Currency:{" "}
                  <span className="font-medium text-white/50">
                    {config.currency} ({config.currencySymbol})
                  </span>
                </p>
              </div>

              {/* Phone — select code first, then number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-white/60">
                  Mobile number
                </Label>
                <IntlPhoneInput
                  value={phone}
                  onChange={setPhone}
                  defaultCountry={country}
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-white/60">
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
                <Label htmlFor="password" className="text-xs font-medium text-white/60">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.04] pl-9 pr-10 text-white placeholder:text-white/20 focus:border-amber-500/50 focus:ring-amber-500/20"
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 font-semibold text-[#07070d] shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
