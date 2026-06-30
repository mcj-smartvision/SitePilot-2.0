import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold tracking-tight">SitePilot 2.0</h1>
        <p className="text-xl text-muted-foreground">سیستم پایش کارگاه ساختمانی</p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg"><Link href="/reports">گزارش‌ها</Link></Button>
          <Button asChild variant="outline" size="lg"><Link href="/login">ورود</Link></Button>
        </div>
      </div>
    </main>
  )
}
