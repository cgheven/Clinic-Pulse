import { format } from 'date-fns'
import { TZDate } from '@date-fns/tz'

/**
 * SECURITY FIX (FINDING-006): Backdating prevention for financial records.
 *
 * All server actions that accept a user-supplied date for financial records
 * (expenses, visits, sales, lab tests, x-ray revenue) MUST call this helper
 * before inserting data.
 *
 * Default policy:
 *  - No future dates allowed (evaluated in PKT so "today" in Pakistan is never rejected).
 *  - Dates more than MAX_BACKDATE_DAYS in the past are rejected.
 */

/** Maximum number of calendar days a record may be backdated. */
export const MAX_BACKDATE_DAYS = 30

const PKT_TIMEZONE = 'Asia/Karachi'

/**
 * Validates a YYYY-MM-DD date string for financial record creation.
 *
 * @param dateStr - ISO date string in YYYY-MM-DD format
 * @param maxBackdateDays - Override the default 30-day window (optional)
 * @returns `{ valid: true }` or `{ valid: false; error: string }`
 */
export function validateFinancialDate(
  dateStr: string,
  maxBackdateDays: number = MAX_BACKDATE_DAYS
): { valid: true } | { valid: false; error: string } {
  // Use PKT timezone — server runs UTC but records are dated in Pakistan time.
  // Without this, dates that are "today" in PKT (UTC+5) look like "tomorrow" to UTC.
  const nowPKT = new TZDate(new Date(), PKT_TIMEZONE)
  const todayISO = format(nowPKT, 'yyyy-MM-dd')

  const minAllowedPKT = new TZDate(new Date(), PKT_TIMEZONE)
  minAllowedPKT.setDate(minAllowedPKT.getDate() - maxBackdateDays)
  const minAllowedISO = format(minAllowedPKT, 'yyyy-MM-dd')

  if (dateStr > todayISO) {
    return { valid: false, error: 'Future dates are not allowed for financial records' }
  }

  if (dateStr < minAllowedISO) {
    return {
      valid: false,
      error: `Date cannot be more than ${maxBackdateDays} days in the past. Earliest allowed: ${minAllowedISO}`,
    }
  }

  return { valid: true }
}
