import { redirect } from 'next/navigation'

/**
 * /reports has no report of its own — it previously rendered a pill strip that
 * simply duplicated the tab bar in reports/layout.tsx, so the user landed on an
 * empty screen and had to click again to see any data.
 *
 * Land straight on Daily Revenue instead. The layout's tab bar renders on the
 * destination and highlights "Daily Revenue", so navigation is unchanged —
 * one click fewer to the first number on screen.
 *
 * Nothing is rendered here, so there is no data to guard; /reports/daily runs
 * its own requireAuth() and the route is gated by middleware regardless.
 */
export default function ReportsPage() {
  redirect('/reports/daily')
}
