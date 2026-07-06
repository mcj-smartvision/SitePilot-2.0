import type { AiActionType, DailyReportInput, PurchaseRequestPayload } from '@/lib/supervisor/types'

/** Stub AI text generator — replace with Edge Function / OpenAI. */
export async function generateAiActionText(
  type: AiActionType,
  payload: Record<string, unknown>,
  locale: 'fa' | 'en' = 'fa'
): Promise<string> {
  const fa = locale === 'fa'

  switch (type) {
    case 'subcontractor_instruction': {
      const activity = String(payload.activity_name ?? 'فعالیت')
      const instruction = String(payload.instruction ?? payload.notes ?? '')
      return fa
        ? `با سلام،\n\nبدینوسیله دستور کار مربوط به «${activity}» ابلاغ می‌گردد:\n${instruction}\n\nلطفاً طبق برنامه زمان‌بندی پروژه اقدام فرمایید.\n\nبا تشکر،\nسرپرست کارگاه`
        : `Dear subcontractor,\n\nPlease proceed with "${activity}":\n${instruction}\n\nRegards,\nSite Supervisor`
    }
    case 'purchase_request': {
      const p = payload as unknown as PurchaseRequestPayload
      return fa
        ? `درخواست خرید مواد\n\nماده: ${p.material_name}\nمقدار: ${p.quantity} ${p.unit}\nتاریخ نیاز: ${p.needed_date}\nاولویت: ${p.priority}\n\nتوضیحات:\n${p.reason}\n\n— سرپرست کارگاه`
        : `Purchase Request\n\nMaterial: ${p.material_name}\nQty: ${p.quantity} ${p.unit}\nNeeded: ${p.needed_date}\nPriority: ${p.priority}\n\n${p.reason}`
    }
    case 'pm_comment': {
      const category = String(payload.category ?? 'general')
      const note = String(payload.note ?? '')
      return fa
        ? `یادداشت به مدیر پروژه (${category})\n\n${note}\n\n— سرپرست کارگاه`
        : `Note to Project Manager (${category})\n\n${note}`
    }
    case 'hse_alert': {
      const desc = String(payload.description ?? '')
      const severity = String(payload.severity ?? 'warning')
      return fa
        ? `⚠️ هشدار HSE/کیفیت\n\nشدت: ${severity}\n\n${desc}\n\nاقدام فوری درخواست می‌شود.\n\n— سرپرست کارگاه`
        : `HSE/Quality Alert\n\nSeverity: ${severity}\n\n${desc}`
    }
    default:
      return fa ? 'متن پیش‌نویس AI' : 'AI draft text'
  }
}

export async function generateDailyReportSummary(input: DailyReportInput, locale: 'fa' | 'en' = 'fa'): Promise<string> {
  const fa = locale === 'fa'
  const activityCount = input.activities.length
  const finished = input.activities.filter((a) => a.actualStatus === 'finished').length
  const issues = input.activities.flatMap((a) => a.issues)
  const note = input.supervisorNote?.trim() ?? ''

  if (fa) {
    return [
      `گزارش روزانه کارگاه — ${input.date} (${input.shift})`,
      '',
      `تعداد فعالیت‌های گزارش‌شده: ${activityCount}`,
      `اتمام یافته: ${finished}`,
      issues.length > 0 ? `مسائل ثبت‌شده: ${issues.length}` : 'بدون مسئله ثبت‌شده',
      input.hse.hasIncident ? `⚠️ حادثه HSE: ${input.hse.description ?? '—'}` : '',
      note ? `\nیادداشت سرپرست:\n${note}` : '',
      '',
      '— متن رسمی تولیدشده توسط AI (پیش‌نویس)',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    `Daily Site Report — ${input.date} (${input.shift})`,
    `Activities reported: ${activityCount}`,
    `Completed: ${finished}`,
    issues.length > 0 ? `Issues logged: ${issues.length}` : 'No issues logged',
    input.hse.hasIncident ? `HSE incident: ${input.hse.description ?? '—'}` : '',
    note ? `Supervisor note: ${note}` : '',
    '',
    '— AI-generated draft (requires approval)',
  ]
    .filter(Boolean)
    .join('\n')
}
