import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { ExpenseManagement } from '@/components/finance/expense-management'

/** Dedicated Expense Management — micro expenses live here, not on the accountant dashboard. */
export default async function FinanceExpensesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context, projectOptions, activeProjectId } = await loadRolePageData(
    supabase,
    user.id,
    user.email
  )

  if (context.isFirstLogin) redirect('/first-login')

  const canAccess =
    context.isSystemAdmin ||
    hasRoleDashboardAccess(context, 'accountant') ||
    context.positionKeys.includes('project_manager')

  if (!canAccess) redirect('/dashboard')

  const canEdit =
    context.isSystemAdmin ||
    context.positionKeys.includes('project_accountant') ||
    context.positionKeys.includes('finance_admin')

  return (
    <ExpenseManagement
      key={activeProjectId ?? 'no-project'}
      initialContext={context}
      projectOptions={projectOptions}
      initialProjectId={activeProjectId}
      canEdit={canEdit}
    />
  )
}
