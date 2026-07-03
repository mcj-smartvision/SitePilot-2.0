import { Suspense } from 'react'
import LoginPage from './login-page-client'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>}>
      <LoginPage />
    </Suspense>
  )
}
