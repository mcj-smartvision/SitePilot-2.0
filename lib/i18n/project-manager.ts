import type { FormLocale } from '@/lib/project-init/i18n/types'
import { getPmRouteCopy } from '@/lib/shared/ai-action-routing'
import type { AiDraftLabels } from '@/lib/shared/ai-types'
import type { ApprovalItemType } from '@/lib/project-manager/types'

const EN = {
  title: 'Project Manager Dashboard',
  description: 'Project health, approvals, and cross-department coordination.',
  progressVsPlan: 'Progress vs Plan',
  scheduleDelay: 'Schedule Delay',
  pendingApprovals: 'Pending Approvals',
  materialShortage: 'Material Shortage',
  hseAlerts: 'HSE Alerts',
  riskLevel: 'Risk Level',
  criticalDelayed: 'Critical Delayed',
  projectHealth: 'Project Health',
  planned: 'Planned',
  actual: 'Actual',
  daysLate: 'days late',
  onTime: 'On time',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  approvalCenter: 'Approval Center',
  noPending: 'No pending items for review.',
  view: 'View',
  approve: 'Approve',
  reject: 'Reject',
  approving: 'Approving…',
  departments: 'Departments',
  activityFeed: 'Recent Activity',
  dailyReports: 'Daily Reports',
  criticalAlerts: 'Critical Alerts',
  noAlerts: 'No open alerts.',
  selectProject: 'Project',
  loadError: 'Failed to load dashboard.',
  saving: 'Saving…',
  draftByAi: 'AI Draft',
  confirmed: 'Confirmed',
  approveSend: 'Approve & Send',
  editText: 'Edit',
  regenerate: 'Regenerate',
  rejectionReason: 'Rejection reason (optional)',
  pendingYourReview: 'Awaiting your review',
  fromSiteSupervisor: 'From Site Supervisor',
  aiInsight: 'AI Project Insight',
  generateInsight: 'Generate risk summary',
  departmentSite: 'Site',
  departmentWarehouse: 'Warehouse',
  departmentProcurement: 'Procurement',
  departmentQc: 'QC',
  departmentHse: 'HSE',
  openDashboard: 'Open dashboard',
  typeInstruction: 'Work instruction → Subcontractor',
  typePurchase: 'Purchase request → Procurement',
  typeHse: 'HSE alert',
  typeDailyReport: 'Daily report',
}

export type ProjectManagerMessages = typeof EN

const FA = {
  title: 'داشبورد مدیر پروژه',
  description: 'سلامت پروژه، تأیید درخواست‌ها و هماهنگی بین واحدها.',
  progressVsPlan: 'پیشرفت در برابر برنامه',
  scheduleDelay: 'تأخیر برنامه',
  pendingApprovals: 'در انتظار تأیید',
  materialShortage: 'کمبود مصالح',
  hseAlerts: 'هشدار HSE',
  riskLevel: 'سطح ریسک',
  criticalDelayed: 'بحرانی تأخیردار',
  projectHealth: 'سلامت پروژه',
  planned: 'برنامه',
  actual: 'واقعی',
  daysLate: 'روز تأخیر',
  onTime: 'طبق برنامه',
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
  approvalCenter: 'مرکز تأیید',
  noPending: 'مورد جدیدی برای بررسی نیست.',
  view: 'مشاهده',
  approve: 'تأیید',
  reject: 'رد',
  approving: 'در حال تأیید…',
  departments: 'واحدها',
  activityFeed: 'فعالیت‌های اخیر',
  dailyReports: 'گزارش‌های روزانه',
  criticalAlerts: 'هشدارهای بحرانی',
  noAlerts: 'هشدار باز وجود ندارد.',
  selectProject: 'پروژه',
  loadError: 'بارگذاری داشبورد ناموفق بود.',
  saving: 'در حال ذخیره…',
  draftByAi: 'پیش‌نویس AI',
  confirmed: 'تأیید شده',
  approveSend: 'تأیید و ارسال',
  editText: 'ویرایش',
  regenerate: 'تولید مجدد',
  rejectionReason: 'دلیل رد (اختیاری)',
  pendingYourReview: 'در انتظار بررسی شما',
  fromSiteSupervisor: 'از سرپرست کارگاه',
  aiInsight: 'تحلیل ریسک AI',
  generateInsight: 'تولید خلاصه ریسک',
  departmentSite: 'کارگاه',
  departmentWarehouse: 'انبار',
  departmentProcurement: 'تدارکات',
  departmentQc: 'QC',
  departmentHse: 'HSE',
  openDashboard: 'باز کردن داشبورد',
  typeInstruction: 'دستور کار → پیمانکار',
  typePurchase: 'درخواست خرید → تدارکات',
  typeHse: 'هشدار HSE',
  typeDailyReport: 'گزارش روزانه',
} as const satisfies Record<keyof typeof EN, string>

export function getProjectManagerMessages(locale: FormLocale): typeof EN {
  if (locale === 'fa' || locale === 'ar') return FA as typeof EN
  return EN
}

export function pmAiLabels(t: ProjectManagerMessages): AiDraftLabels {
  return {
    draftByAi: t.draftByAi,
    confirmed: t.confirmed,
    approveSend: t.approveSend,
    editText: t.editText,
    reject: t.reject,
    regenerate: t.regenerate,
    saving: t.saving,
  }
}

export function pmAiLabelsForItem(
  t: ProjectManagerMessages,
  type: ApprovalItemType,
  locale: FormLocale
): AiDraftLabels {
  const route = getPmRouteCopy(type, locale === 'fa' || locale === 'ar' ? 'fa' : 'en')
  return {
    ...pmAiLabels(t),
    approveSend: route.approveSend,
    whatIsThis: route.whatIsThis,
    destinationHint: route.destinationHint,
    statusBadge: t.pendingYourReview,
  }
}

export function pmApprovalTitle(
  type: ApprovalItemType,
  t: ProjectManagerMessages
): string {
  switch (type) {
    case 'subcontractor_instruction':
      return t.typeInstruction
    case 'purchase_request':
      return t.typePurchase
    case 'hse_alert':
      return t.typeHse
    case 'daily_report':
      return t.typeDailyReport
    default:
      return t.approvalCenter
  }
}
