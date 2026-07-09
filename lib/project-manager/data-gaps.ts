export type DataGapSeverity = 'critical' | 'warning' | 'info'

export interface PmDataGap {
  id: string
  titleFa: string
  titleEn: string
  status: 'missing' | 'partial' | 'ok'
  severity: DataGapSeverity
  detailFa: string
  detailEn: string
  whereFa: string
  whereEn: string
  href?: string
}

export interface PmDataGapInput {
  projectId: string | null
  taskCount: number
  actualStart: string | null
  baselineStart: string | null
  inventoryCount: number
  lowStockCount: number
  reportCount: number
  alertCount: number
  hasProgressCostRows: boolean
  hasFinancialCosts: boolean
  planComplianceAvailable: boolean
}

/** Detect missing inputs that prevent accurate PM control KPIs. */
export function buildPmDataGaps(input: PmDataGapInput): PmDataGap[] {
  const gaps: PmDataGap[] = []
  const scheduleHref = input.projectId
    ? `/admin/projects/${input.projectId}/schedule`
    : '/admin'

  if (input.taskCount === 0) {
    gaps.push({
      id: 'schedule',
      titleFa: 'برنامه زمان‌بندی',
      titleEn: 'Project schedule',
      status: 'missing',
      severity: 'critical',
      detailFa: 'هیچ فعالیتی در برنامه ثبت نشده — شاخص پیشرفت و چک‌لیست تا امروز قابل محاسبه نیست.',
      detailEn: 'No schedule activities found — progress and plan checklist cannot be computed.',
      whereFa: 'ادمین پروژه → زمان‌بندی → وارد کردن فایل MSP / XML',
      whereEn: 'Project admin → Schedule → Import MSP / XML',
      href: scheduleHref,
    })
  } else {
    gaps.push({
      id: 'schedule',
      titleFa: 'برنامه زمان‌بندی',
      titleEn: 'Project schedule',
      status: 'ok',
      severity: 'info',
      detailFa: `${input.taskCount} فعالیت در برنامه موجود است.`,
      detailEn: `${input.taskCount} activities loaded.`,
      whereFa: 'ادمین پروژه → زمان‌بندی',
      whereEn: 'Project admin → Schedule',
      href: scheduleHref,
    })
  }

  if (!input.actualStart) {
    gaps.push({
      id: 'actual_start',
      titleFa: 'تاریخ واقعی شروع پروژه',
      titleEn: 'Actual project start',
      status: 'missing',
      severity: 'critical',
      detailFa:
        'زمان واقعی شروع ثبت نشده — چک‌لیست «آیا کارها تا امروز مطابق برنامه است؟» فعال نمی‌شود و برنامه جاری جابه‌جا نمی‌شود.',
      detailEn:
        'Actual start is not set — the until-today compliance checklist stays off and the live schedule is not shifted.',
      whereFa: 'ادمین پروژه → زمان‌بندی → تأیید تاریخ واقعی شروع',
      whereEn: 'Project admin → Schedule → Confirm actual start date',
      href: scheduleHref,
    })
  } else {
    gaps.push({
      id: 'actual_start',
      titleFa: 'تاریخ واقعی شروع پروژه',
      titleEn: 'Actual project start',
      status: 'ok',
      severity: 'info',
      detailFa: `شروع واقعی: ${input.actualStart}`,
      detailEn: `Actual start: ${input.actualStart}`,
      whereFa: 'ادمین پروژه → زمان‌بندی',
      whereEn: 'Project admin → Schedule',
      href: scheduleHref,
    })
  }

  if (!input.baselineStart && input.taskCount > 0) {
    gaps.push({
      id: 'baseline',
      titleFa: 'Baseline برنامه',
      titleEn: 'Schedule baseline',
      status: 'partial',
      severity: 'warning',
      detailFa:
        'Baseline اولیه مشخص نیست — مقایسه با برنامه اولیه (SPI واقعی) دقیق نیست.',
      detailEn: 'Baseline start missing — true SPI vs original plan is less accurate.',
      whereFa: 'با وارد کردن MSP و تأیید شروع، baseline ذخیره می‌شود',
      whereEn: 'Import MSP and confirm start to snapshot baseline',
      href: scheduleHref,
    })
  }

  if (input.inventoryCount === 0) {
    gaps.push({
      id: 'inventory',
      titleFa: 'موجودی انبار / مصالح',
      titleEn: 'Warehouse inventory',
      status: 'missing',
      severity: 'warning',
      detailFa: 'داده انبار نیست — شاخص آمادگی مصالح (MRS) تقریبی یا صفر می‌ماند.',
      detailEn: 'No inventory rows — Material Readiness (MRS) stays approximate/empty.',
      whereFa: 'داشبورد انباردار → ثبت اقلام و حداقل موجودی',
      whereEn: 'Storekeeper dashboard → Add items & min stock',
      href: '/dashboard/storekeeper',
    })
  } else if (input.lowStockCount > 0) {
    gaps.push({
      id: 'inventory',
      titleFa: 'موجودی انبار / مصالح',
      titleEn: 'Warehouse inventory',
      status: 'partial',
      severity: 'warning',
      detailFa: `${input.lowStockCount} قلم زیر حداقل موجودی — MRS تحت فشار است.`,
      detailEn: `${input.lowStockCount} items below min stock — MRS under pressure.`,
      whereFa: 'داشبورد انباردار / تدارکات',
      whereEn: 'Storekeeper / Procurement dashboards',
      href: '/dashboard/storekeeper',
    })
  } else {
    gaps.push({
      id: 'inventory',
      titleFa: 'موجودی انبار / مصالح',
      titleEn: 'Warehouse inventory',
      status: 'ok',
      severity: 'info',
      detailFa: `${input.inventoryCount} قلم ثبت شده.`,
      detailEn: `${input.inventoryCount} items on file.`,
      whereFa: 'داشبورد انباردار',
      whereEn: 'Storekeeper dashboard',
      href: '/dashboard/storekeeper',
    })
  }

  if (input.reportCount === 0) {
    gaps.push({
      id: 'daily_reports',
      titleFa: 'گزارش روزانه کارگاه',
      titleEn: 'Site daily reports',
      status: 'missing',
      severity: 'warning',
      detailFa:
        'گزارش روزانه نیست — پیشرفت واقعی فعالیت‌ها و تأیید مدیر پروژه به‌روز نمی‌شود.',
      detailEn: 'No daily reports — actual progress and PM approvals stay stale.',
      whereFa: 'داشبورد سرپرست کارگاه → گزارش روزانه',
      whereEn: 'Site Supervisor dashboard → Daily report',
      href: '/dashboard/site-supervisor',
    })
  } else {
    gaps.push({
      id: 'daily_reports',
      titleFa: 'گزارش روزانه کارگاه',
      titleEn: 'Site daily reports',
      status: 'ok',
      severity: 'info',
      detailFa: `${input.reportCount} گزارش اخیر بارگذاری شد.`,
      detailEn: `${input.reportCount} recent reports loaded.`,
      whereFa: 'داشبورد سرپرست کارگاه',
      whereEn: 'Site Supervisor dashboard',
      href: '/dashboard/site-supervisor',
    })
  }

  if (!input.hasProgressCostRows) {
    gaps.push({
      id: 'progress_cost',
      titleFa: 'منحنی پیشرفت / هزینه (Earned Value)',
      titleEn: 'Progress–cost curve (EV)',
      status: 'missing',
      severity: 'warning',
      detailFa:
        'جدول project_progress_cost خالی است — SPI/CPI و پیشرفت برنامه‌ای دقیق در دسترس نیست (الان از زمان‌بندی خطی تخمین زده می‌شود).',
      detailEn:
        'project_progress_cost is empty — true SPI/CPI unavailable (linear schedule estimate used instead).',
      whereFa:
        'فعلاً از زمان‌بندی محاسبه می‌شود. برای دقت کامل: وارد کردن خروجی پیشرفت MSP یا پر کردن جدول پیشرفت/هزینه توسط حسابداری',
      whereEn:
        'Computed from schedule for now. For full accuracy: import MSP progress or fill progress/cost table via accounting',
      href: '/finance/expenses',
    })
  }

  if (!input.hasFinancialCosts) {
    gaps.push({
      id: 'financial_costs',
      titleFa: 'هزینه‌های واقعی پروژه',
      titleEn: 'Actual project costs',
      status: 'missing',
      severity: 'info',
      detailFa:
        'هزینه واقعی ثبت نشده — شاخص هزینه در داشبورد مدیر پروژه کامل نیست (در حسابداری موجود است).',
      detailEn:
        'No actual costs linked — cost KPIs incomplete on PM dashboard (available in accounting).',
      whereFa: 'مدیریت هزینه‌ها / داشبورد حسابدار → ثبت سند هزینه',
      whereEn: 'Expense Management / Accountant dashboard → register costs',
      href: '/finance/expenses',
    })
  }

  if (!input.planComplianceAvailable && input.taskCount > 0) {
    gaps.push({
      id: 'compliance_gate',
      titleFa: 'چک‌لیست انطباق تا امروز',
      titleEn: 'Until-today compliance checklist',
      status: 'missing',
      severity: 'critical',
      detailFa: 'برای فعال شدن جدول تیک/چک، تاریخ واقعی شروع باید ثبت و قبل از امروز باشد.',
      detailEn: 'Set actual start (on/before today) to unlock the checkmark compliance table.',
      whereFa: 'ادمین پروژه → زمان‌بندی → تاریخ واقعی شروع',
      whereEn: 'Project admin → Schedule → Actual start',
      href: scheduleHref,
    })
  }

  return gaps
}

export function countBlockingGaps(gaps: PmDataGap[]): number {
  return gaps.filter((g) => g.status === 'missing' && g.severity === 'critical').length
}
