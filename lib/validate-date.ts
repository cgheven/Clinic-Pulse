/**
 * SECURITY FIX (FINDING-006): Backdating prevention for financial records.
 *
 * All server actions that accept a user-supplied date for financial records
 * (expenses, visits, sales, lab tests, x-ray revenue) MUST call this helper
 * before inserting data.
 *
 * Default policy:
 *  - No future dates allowed.
 *  - Dates more than MAX_BACKDATE_DAYS in the past are rejected.
 *
 * The MAX_BACKDATE_DAYS window accommodates legitimate use-cases such as
 * entering yesterday's paper receipts while preventing large-scale historical
 * manipulation of financial reports.
 */

/** Maximum number of calendar days a record may be backdated. */
export const MAX_BACKDATE_DAYS = 30

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
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayISO = today.toISOString().split('T')[0]!

  const minAllowed = new Date(today)
  minAllowed.setDate(minAllowed.getDate() - maxBackdateDays)
  const minAllowedISO = minAllowed.toISOString().split('T')[0]!

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
