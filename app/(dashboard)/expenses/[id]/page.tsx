import { redirect } from 'next/navigation'

export default async function ExpenseDetailPage() {
  redirect('/expenses')
}
