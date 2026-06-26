import { redirect } from 'next/navigation'

/**
 * /reports — redirects to the Daily Revenue tab.
 */
export default function ReportsPage() {
  redirect('/reports/daily')
}
