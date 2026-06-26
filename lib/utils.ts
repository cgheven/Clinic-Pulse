import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PKT_TIMEZONE = "Asia/Karachi";

/**
 * Convert a date to PKT timezone using TZDate.
 */
function toPKT(date: string | Date): TZDate {
  const d = typeof date === "string" ? new Date(date) : date;
  return new TZDate(d, PKT_TIMEZONE);
}

/**
 * Convert paisas (BIGINT stored in DB) to PKR display string.
 * e.g. 50000 paisas → "Rs. 500.00"
 */
export function formatCurrencyPaisas(
  paisas: number | bigint | null | undefined
): string {
  if (paisas === null || paisas === undefined) return "Rs. 0.00";
  const pkr = Number(paisas) / 100;
  return `Rs. ${pkr.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a PKR amount directly (not from paisas).
 * e.g. 500 → "Rs. 500.00"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Rs. 0.00";
  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date in PKT timezone.
 * Default format: "dd MMM yyyy"
 */
export function formatDate(
  date: string | Date | null | undefined,
  fmt: string = "dd MMM yyyy"
): string {
  if (!date) return "—";
  try {
    return format(toPKT(date), fmt);
  } catch {
    return "—";
  }
}

/**
 * Format a date in PKT timezone (explicit alias).
 */
export function formatDatePKT(
  date: string | Date | null | undefined,
  fmt: string = "dd MMM yyyy"
): string {
  return formatDate(date, fmt);
}

/**
 * Format a datetime in PKT timezone.
 * Default format: "dd MMM yyyy, hh:mm a"
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  fmt: string = "dd MMM yyyy, hh:mm a"
): string {
  if (!date) return "—";
  try {
    return format(toPKT(date), fmt);
  } catch {
    return "—";
  }
}

/**
 * Get the current date/time as a TZDate in PKT.
 */
export function getCurrentDatePKT(): TZDate {
  return new TZDate(new Date(), PKT_TIMEZONE);
}

/**
 * Get today's date string in PKT timezone formatted as "yyyy-MM-dd".
 */
export function getTodayPKT(): string {
  return format(new TZDate(new Date(), PKT_TIMEZONE), "yyyy-MM-dd");
}

/**
 * Convert basis points (0–10000) to a percentage string.
 * e.g. 3000 → "30.00%"
 */
export function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(2)}%`;
}

/**
 * Truncate text to a given length with ellipsis.
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

/**
 * Generate initials from a full name (up to 2 chars).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
