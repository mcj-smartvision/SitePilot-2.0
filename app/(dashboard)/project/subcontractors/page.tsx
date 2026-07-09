import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PageHeader } from '@/components/admin/shared'
import { PmSubcontractorsPageClient } from '@/components/project-manager/pm-subcontractors-page-client'

export default async function ProjectSubcontractorsPage() {
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
    hasRoleDashboardAccess(context, 'project-manager') ||
    context.positionKeys.includes('finance_admin')

  if (!canAccess) redirect('/dashboard')

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="پیمانکاران و قراردادها"
        description="معرفی پیمانکار، ضمیمه قرارداد، و خروجی استاندارد خلاصه قرارداد — توسط مدیر پروژه."
      />
      <PmSubcontractorsPageClient
        initialContext={context}
        projectOptions={projectOptions}
        initialProjectId={activeProjectId}
      />
    </div>
  )
}
