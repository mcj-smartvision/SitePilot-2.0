import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen, CheckCircle2, Lightbulb, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getPmMetricGuide,
  listPmMetricGuides,
  type PmMetricGuideId,
} from '@/lib/project-manager/pm-metric-guides'

export function generateStaticParams() {
  return listPmMetricGuides().map((g) => ({ metricId: g.id }))
}

export default function PmMetricHelpPage({
  params,
}: {
  params: { metricId: string }
}) {
  const guide = getPmMetricGuide(params.metricId)
  if (!guide) notFound()

  const others = listPmMetricGuides().filter((g) => g.id !== guide.id)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6 px-4" dir="rtl">
      <div className="space-y-2">
        <p className="text-xs font-medium text-primary inline-flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          راهنمای شاخص‌های مدیر پروژه
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{guide.titleFa}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{guide.subtitleFa}</p>
        <p className="text-xs text-muted-foreground border-t pt-2">
          این صفحه جدا باز شده تا داشبوردتان بسته نشود. هر وقت خواستید برگردید، تب قبلی را ببینید.
        </p>
      </div>

      <Section title="این چیست؟" icon={<Lightbulb className="h-4 w-4 text-amber-600" />}>
        <p>{guide.whatFa}</p>
      </Section>

      <Section title="داده از کجا می‌آید؟" icon={<BookOpen className="h-4 w-4 text-sky-600" />}>
        <p>{guide.sourceFa}</p>
      </Section>

      <Section title="چطور حساب می‌کنیم؟" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}>
        <p className="whitespace-pre-wrap">{guide.howFa}</p>
      </Section>

      <Section title="عدد خوب است یا بد؟" icon={<TriangleAlert className="h-4 w-4 text-orange-600" />}>
        <p>{guide.goodBadFa}</p>
      </Section>

      <Section title="چرا ممکن است همین عدد را ببینید؟">
        <p>{guide.whyFa}</p>
      </Section>

      <Section title="برای پیشرفت چه چیزهایی را تغییر دهید؟">
        <ol className="list-decimal ps-5 space-y-2">
          {guide.improveFa.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="نکته‌ها و اشتباه‌های رایج">
        <ul className="list-disc ps-5 space-y-2">
          {guide.caveatsFa.map((item) => (
            <li key={item} className="leading-relaxed text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-semibold">سایر راهنماها</p>
        <div className="flex flex-wrap gap-2">
          {others.map((g) => (
            <Button key={g.id} asChild variant="outline" size="sm">
              <Link href={`/help/pm-metrics/${g.id as PmMetricGuideId}`} target="_blank">
                {g.titleFa}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pb-8">
        <Button asChild variant="secondary">
          <Link href="/dashboard/project-manager">
            بازگشت به داشبورد مدیر پروژه
            <ArrowRight className="h-4 w-4 ms-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  icon,
}: {
  title: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
      <h2 className="font-semibold text-base flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="text-sm leading-7 text-foreground/90">{children}</div>
    </section>
  )
}
