import { redirect } from 'next/navigation'

export default function ProjectAdminIndexPage({
  params,
}: {
  params: { projectId: string }
}) {
  redirect(`/admin/projects/${params.projectId}/members`)
}
