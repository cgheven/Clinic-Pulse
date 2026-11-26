import { AlertTriangle, Clock } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt?: string | null;
  frozen?: boolean;
}

/**
 * Thin status bar shown under the navbar while the clinic is on its free trial
 * (or once its account is frozen pending billing). Billing isn't wired yet —
 * this is the surface a future paywall plugs into. Renders nothing for a healthy,
 * non-trial account.
 */
export function TrialBanner({ trialEndsAt, frozen }: TrialBannerProps) {
  if (frozen) {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          Your account is frozen. Contact support to restore access.
        </span>
      </div>
    );
  }

  if (!trialEndsAt) return null;

  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;

  const msLeft = end - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  // Trial already elapsed — show an ended state (billing paywall goes here later).
  if (daysLeft <= 0) {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Your free trial has ended.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-primary/20 bg-primary/[0.06] px-4 py-2 text-center text-xs font-medium text-primary">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>
        Free trial — {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </span>
    </div>
  );
}
