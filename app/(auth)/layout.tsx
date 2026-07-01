import { AuthHeader } from '@/components/layout/auth-header'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <AuthHeader />
      <main>{children}</main>
    </div>
  )
}
