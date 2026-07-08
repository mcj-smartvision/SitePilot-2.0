/**
 * UI Block Catalog — single registry for admin visibility control.
 *
 * Naming: {DASH}-{KIND}-{NN}
 *   DASH: GEN | PM | SS | SK | PR | QC | HSE | SEC | ADM
 *   KIND: WGT (widget) | KPI | CHT (chart) | TBL (table) | PNL (panel) | ACT (action) | REQ (request type)
 *
 * Phase 1: catalog + types (this file)
 * Phase 2: DB table `dashboard_ui_blocks` + `position_ui_block_visibility`
 * Phase 3: render guards in each role dashboard + admin matrix UI
 *
 * Admin path today (legacy widgets only): /admin/projects/[id]/widgets
 */

export type UiBlockKind = 'widget' | 'kpi' | 'chart' | 'table' | 'panel' | 'action' | 'request'
export type UiBlockLayer = 'executive' | 'analytical' | 'operational' | 'general'

export interface UiBlockDefinition {
  /** Stable code e.g. PM-CHT-01 — use in DB and admin UI */
  code: string
  /** Dot key for code lookup e.g. pm.chart.wsi_trend */
  key: string
  kind: UiBlockKind
  /** Role dashboard slug or GEN for /dashboard widgets */
  dashboard: string
  layer: UiBlockLayer
  titleFa: string
  titleEn: string
  descriptionFa: string
  /** Maps to existing widget key when applicable */
  legacyWidgetKey?: string
  sortOrder: number
  defaultVisible: boolean
}

export const UI_BLOCK_CATALOG: UiBlockDefinition[] = [
  // ─── GEN: Generic /dashboard widgets (existing system) ───
  { code: 'GEN-WGT-01', key: 'overview.stats', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'آمار کلی', titleEn: 'Overview Stats', descriptionFa: 'خلاصه آماری پروژه', legacyWidgetKey: 'overview.stats', sortOrder: 10, defaultVisible: true },
  { code: 'GEN-WGT-02', key: 'progress.overview', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'پیشرفت پروژه', titleEn: 'Progress Overview', descriptionFa: 'برنامه در مقابل واقعی', legacyWidgetKey: 'progress.overview', sortOrder: 20, defaultVisible: true },
  { code: 'GEN-WGT-03', key: 'inventory.stock', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'موجودی انبار', titleEn: 'Inventory', descriptionFa: 'سطح موجودی مواد', legacyWidgetKey: 'inventory.stock', sortOrder: 30, defaultVisible: true },
  { code: 'GEN-WGT-04', key: 'reports.recent', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'گزارش‌های اخیر', titleEn: 'Recent Reports', descriptionFa: 'آخرین گزارش‌های ثبت‌شده', legacyWidgetKey: 'reports.recent', sortOrder: 40, defaultVisible: true },
  { code: 'GEN-WGT-05', key: 'reports.daily', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'گزارش روزانه', titleEn: 'Daily Report', descriptionFa: 'ثبت گزارش روزانه', legacyWidgetKey: 'reports.daily', sortOrder: 50, defaultVisible: true },
  { code: 'GEN-WGT-06', key: 'security.alerts', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'هشدار امنیت', titleEn: 'Security Alerts', descriptionFa: 'اعلان‌های امنیتی', legacyWidgetKey: 'security.alerts', sortOrder: 60, defaultVisible: false },
  { code: 'GEN-WGT-07', key: 'security.entry_exit', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'ورود و خروج', titleEn: 'Entry/Exit', descriptionFa: 'لاگ گیت', legacyWidgetKey: 'security.entry_exit', sortOrder: 70, defaultVisible: false },
  { code: 'GEN-WGT-08', key: 'schedule.overview', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'زمان‌بندی', titleEn: 'Schedule', descriptionFa: 'مایلستون‌های پیش‌رو', legacyWidgetKey: 'schedule.overview', sortOrder: 80, defaultVisible: true },
  { code: 'GEN-WGT-09', key: 'safety.overview', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'ایمنی', titleEn: 'Safety', descriptionFa: 'خلاصه HSE', legacyWidgetKey: 'safety.overview', sortOrder: 90, defaultVisible: true },
  { code: 'GEN-WGT-10', key: 'financial.overview', kind: 'widget', dashboard: 'general', layer: 'general', titleFa: 'مالی', titleEn: 'Financial', descriptionFa: 'خلاصه هزینه و قرارداد', legacyWidgetKey: 'financial.overview', sortOrder: 100, defaultVisible: false },

  // ─── PM: Project Manager ───
  { code: 'PM-PNL-01', key: 'pm.panel.executive_summary', kind: 'panel', dashboard: 'project-manager', layer: 'executive', titleFa: 'خلاصه مدیریتی', titleEn: 'Executive Summary', descriptionFa: 'وضعیت کلی، فاز، جمع‌بندی روز', sortOrder: 110, defaultVisible: true },
  { code: 'PM-KPI-01', key: 'pm.kpi.wsi', kind: 'kpi', dashboard: 'project-manager', layer: 'executive', titleFa: 'شاخص WSI', titleEn: 'WSI', descriptionFa: 'کفایت نیروی کار', sortOrder: 111, defaultVisible: true },
  { code: 'PM-KPI-02', key: 'pm.kpi.mrs', kind: 'kpi', dashboard: 'project-manager', layer: 'executive', titleFa: 'شاخص MRS', titleEn: 'MRS', descriptionFa: 'آمادگی مصالح', sortOrder: 112, defaultVisible: true },
  { code: 'PM-KPI-03', key: 'pm.kpi.csi', kind: 'kpi', dashboard: 'project-manager', layer: 'executive', titleFa: 'شاخص CSI', titleEn: 'CSI', descriptionFa: 'یکپارچگی زمان‌بندی', sortOrder: 113, defaultVisible: true },
  { code: 'PM-PNL-02', key: 'pm.panel.top_risks', kind: 'panel', dashboard: 'project-manager', layer: 'executive', titleFa: '۳ ریسک اصلی', titleEn: 'Top 3 Risks', descriptionFa: 'ریسک‌های اولویت‌دار', sortOrder: 114, defaultVisible: true },
  { code: 'PM-PNL-03', key: 'pm.panel.immediate_actions', kind: 'panel', dashboard: 'project-manager', layer: 'executive', titleFa: '۳ اقدام فوری', titleEn: 'Immediate Actions', descriptionFa: 'اقدامات کوتاه‌مدت', sortOrder: 115, defaultVisible: true },
  { code: 'PM-ACT-01', key: 'pm.action.what_now', kind: 'action', dashboard: 'project-manager', layer: 'executive', titleFa: 'الان باید چه کار کنم؟', titleEn: 'What Should I Do Now', descriptionFa: 'اقدامات اولویت‌دار', sortOrder: 116, defaultVisible: true },
  { code: 'PM-CHT-01', key: 'pm.chart.wsi_mrs_trend', kind: 'chart', dashboard: 'project-manager', layer: 'analytical', titleFa: 'روند WSI و MRS', titleEn: 'WSI/MRS Trend', descriptionFa: 'نمودار خطی با آستانه', sortOrder: 120, defaultVisible: true },
  { code: 'PM-CHT-02', key: 'pm.chart.zone_progress', kind: 'chart', dashboard: 'project-manager', layer: 'analytical', titleFa: 'پیشرفت زون‌ها', titleEn: 'Zone Progress', descriptionFa: 'میله‌ای برنامه/واقعی', sortOrder: 121, defaultVisible: true },
  { code: 'PM-CHT-03', key: 'pm.chart.readiness_donut', kind: 'chart', dashboard: 'project-manager', layer: 'analytical', titleFa: 'آمادگی کلی', titleEn: 'Readiness Donut', descriptionFa: 'نمودار دونات ترکیبی', sortOrder: 122, defaultVisible: true },
  { code: 'PM-PNL-04', key: 'pm.panel.risk_alerts', kind: 'panel', dashboard: 'project-manager', layer: 'analytical', titleFa: 'هشدارهای ریسک', titleEn: 'Risk Alerts', descriptionFa: 'لیست هشدار رنگی', sortOrder: 123, defaultVisible: true },
  { code: 'PM-PNL-05', key: 'pm.panel.insights', kind: 'panel', dashboard: 'project-manager', layer: 'analytical', titleFa: 'بینش عملیاتی', titleEn: 'Insights', descriptionFa: 'تفسیر خودکار شاخص‌ها', sortOrder: 124, defaultVisible: true },
  { code: 'PM-TBL-01', key: 'pm.table.approval_center', kind: 'table', dashboard: 'project-manager', layer: 'operational', titleFa: 'مرکز تأیید', titleEn: 'Approval Center', descriptionFa: 'درخواست‌های معلق PM', sortOrder: 130, defaultVisible: true },
  { code: 'PM-PNL-06', key: 'pm.panel.critical_alerts', kind: 'panel', dashboard: 'project-manager', layer: 'operational', titleFa: 'هشدارهای بحرانی', titleEn: 'Critical Alerts', descriptionFa: 'اعلان‌های زمان‌بندی', sortOrder: 131, defaultVisible: true },
  { code: 'PM-PNL-07', key: 'pm.panel.activity_feed', kind: 'panel', dashboard: 'project-manager', layer: 'operational', titleFa: 'فعالیت اخیر', titleEn: 'Activity Feed', descriptionFa: 'رویدادهای اخیر', sortOrder: 132, defaultVisible: true },
  { code: 'PM-PNL-08', key: 'pm.panel.departments', kind: 'panel', dashboard: 'project-manager', layer: 'operational', titleFa: 'نمای واحدها', titleEn: 'Departments', descriptionFa: 'خلاصه دپارتمان‌ها', sortOrder: 133, defaultVisible: true },
  { code: 'PM-TBL-02', key: 'pm.table.recent_reports', kind: 'table', dashboard: 'project-manager', layer: 'operational', titleFa: 'گزارش‌های اخیر', titleEn: 'Recent Reports', descriptionFa: 'آرشیو کوتاه گزارش روزانه', sortOrder: 134, defaultVisible: true },

  // ─── SS: Site Supervisor ───
  { code: 'SS-KPI-01', key: 'ss.kpi.today', kind: 'kpi', dashboard: 'site-supervisor', layer: 'executive', titleFa: 'KPI امروز', titleEn: 'Today KPIs', descriptionFa: 'فعالیت، بحرانی، آمادگی', sortOrder: 210, defaultVisible: true },
  { code: 'SS-TBL-01', key: 'ss.table.today_activities', kind: 'table', dashboard: 'site-supervisor', layer: 'operational', titleFa: 'فعالیت‌های امروز', titleEn: 'Today Activities', descriptionFa: 'جدول فعالیت و وضعیت', sortOrder: 220, defaultVisible: true },
  { code: 'SS-PNL-01', key: 'ss.panel.lookahead', kind: 'panel', dashboard: 'site-supervisor', layer: 'analytical', titleFa: 'Lookahead', titleEn: 'Lookahead', descriptionFa: 'پیش‌بینی هفته', sortOrder: 221, defaultVisible: true },
  { code: 'SS-PNL-02', key: 'ss.panel.resources', kind: 'panel', dashboard: 'site-supervisor', layer: 'operational', titleFa: 'منابع', titleEn: 'Resources', descriptionFa: 'مصالح و نیرو', sortOrder: 222, defaultVisible: true },
  { code: 'SS-PNL-03', key: 'ss.panel.issues_alerts', kind: 'panel', dashboard: 'site-supervisor', layer: 'operational', titleFa: 'مسائل و هشدار', titleEn: 'Issues & Alerts', descriptionFa: 'مشکلات میدانی', sortOrder: 223, defaultVisible: true },
  { code: 'SS-PNL-04', key: 'ss.panel.ai_actions', kind: 'panel', dashboard: 'site-supervisor', layer: 'operational', titleFa: 'پیش‌نویس AI', titleEn: 'AI Drafts', descriptionFa: 'اقدامات AI در انتظار تأیید', sortOrder: 224, defaultVisible: true },
  { code: 'SS-ACT-01', key: 'ss.action.quick_report', kind: 'action', dashboard: 'site-supervisor', layer: 'operational', titleFa: 'گزارش سریع', titleEn: 'Quick Report', descriptionFa: 'ثبت گزارش روزانه ساختاریافته', sortOrder: 225, defaultVisible: true },

  // ─── SK: Storekeeper ───
  { code: 'SK-KPI-01', key: 'sk.kpi.inventory', kind: 'kpi', dashboard: 'storekeeper', layer: 'executive', titleFa: 'KPI انبار', titleEn: 'Inventory KPIs', descriptionFa: 'موجودی، کمبود، ورود/خروج', sortOrder: 310, defaultVisible: true },
  { code: 'SK-TBL-01', key: 'sk.table.stock', kind: 'table', dashboard: 'storekeeper', layer: 'operational', titleFa: 'جدول موجودی', titleEn: 'Stock Table', descriptionFa: 'اقلام انبار', sortOrder: 320, defaultVisible: true },
  { code: 'SK-TBL-02', key: 'sk.table.transactions', kind: 'table', dashboard: 'storekeeper', layer: 'operational', titleFa: 'تراکنش‌ها', titleEn: 'Transactions', descriptionFa: 'ورود و خروج', sortOrder: 321, defaultVisible: true },
  { code: 'SK-ACT-01', key: 'sk.action.invoice_scan', kind: 'action', dashboard: 'storekeeper', layer: 'operational', titleFa: 'اسکن فاکتور', titleEn: 'Invoice Scan', descriptionFa: 'آپلود و استخراج AI', sortOrder: 322, defaultVisible: true },

  // ─── PR: Procurement ───
  { code: 'PR-KPI-01', key: 'pr.kpi.summary', kind: 'kpi', dashboard: 'procurement', layer: 'executive', titleFa: 'KPI تدارکات', titleEn: 'Procurement KPIs', descriptionFa: 'در انتظار، RFQ، در راه', sortOrder: 410, defaultVisible: true },
  { code: 'PR-TBL-01', key: 'pr.table.incoming_requests', kind: 'table', dashboard: 'procurement', layer: 'operational', titleFa: 'درخواست‌های ورودی', titleEn: 'Incoming Requests', descriptionFa: 'خرید تأییدشده PM', sortOrder: 420, defaultVisible: true },
  { code: 'PR-ACT-01', key: 'pr.action.workflow', kind: 'action', dashboard: 'procurement', layer: 'operational', titleFa: 'جریان تأمین', titleEn: 'Procurement Workflow', descriptionFa: 'pending→received', sortOrder: 421, defaultVisible: true },

  // ─── QC ───
  { code: 'QC-KPI-01', key: 'qc.kpi.summary', kind: 'kpi', dashboard: 'qc', layer: 'executive', titleFa: 'KPI کیفیت', titleEn: 'QC KPIs', descriptionFa: 'نرخ قبولی، NCR، آزمون', sortOrder: 510, defaultVisible: true },
  { code: 'QC-TBL-01', key: 'qc.table.inspections', kind: 'table', dashboard: 'qc', layer: 'operational', titleFa: 'لیست بازرسی', titleEn: 'Inspection Worklist', descriptionFa: 'فعالیت‌های QC', sortOrder: 520, defaultVisible: true },
  { code: 'QC-TBL-02', key: 'qc.table.ncr', kind: 'table', dashboard: 'qc', layer: 'operational', titleFa: 'مدیریت NCR', titleEn: 'NCR Management', descriptionFa: 'گزارش عدم انطباق', sortOrder: 521, defaultVisible: true },
  { code: 'QC-TBL-03', key: 'qc.table.lab_tests', kind: 'table', dashboard: 'qc', layer: 'analytical', titleFa: 'آزمایشگاه', titleEn: 'Lab Tests', descriptionFa: 'نتایج آزمون', sortOrder: 522, defaultVisible: true },
  { code: 'QC-PNL-01', key: 'qc.panel.quality_alerts', kind: 'panel', dashboard: 'qc', layer: 'operational', titleFa: 'هشدار کیفیت', titleEn: 'Quality Alerts', descriptionFa: 'تولید پیش‌نویس NCR', sortOrder: 523, defaultVisible: true },

  // ─── HSE (placeholder dashboard) ───
  { code: 'HSE-KPI-01', key: 'hse.kpi.summary', kind: 'kpi', dashboard: 'hse', layer: 'executive', titleFa: 'KPI ایمنی', titleEn: 'HSE KPIs', descriptionFa: 'روز بدون حادثه، مخاطره', sortOrder: 610, defaultVisible: true },
  { code: 'HSE-TBL-01', key: 'hse.table.hazards', kind: 'table', dashboard: 'hse', layer: 'operational', titleFa: 'ثبت مخاطره', titleEn: 'Hazard Log', descriptionFa: 'planned', sortOrder: 620, defaultVisible: true },
  { code: 'HSE-TBL-02', key: 'hse.table.incidents', kind: 'table', dashboard: 'hse', layer: 'operational', titleFa: 'حوادث', titleEn: 'Incidents', descriptionFa: 'planned', sortOrder: 621, defaultVisible: true },

  // ─── SEC: Security ───
  { code: 'SEC-PNL-01', key: 'sec.panel.placeholder', kind: 'panel', dashboard: 'security', layer: 'general', titleFa: 'داشبورد امنیت', titleEn: 'Security Dashboard', descriptionFa: 'placeholder', sortOrder: 710, defaultVisible: true },

  // ─── REQ: Cross-cutting request / approval types ───
  { code: 'REQ-001', key: 'req.purchase_request', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'درخواست خرید', titleEn: 'Purchase Request', descriptionFa: 'SS → PM → PR', sortOrder: 801, defaultVisible: true },
  { code: 'REQ-002', key: 'req.subcontractor_instruction', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'دستور پیمانکار', titleEn: 'Subcontractor Instruction', descriptionFa: 'SS → PM', sortOrder: 802, defaultVisible: true },
  { code: 'REQ-003', key: 'req.hse_alert', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'هشدار HSE', titleEn: 'HSE Alert', descriptionFa: 'SS → PM', sortOrder: 803, defaultVisible: true },
  { code: 'REQ-004', key: 'req.qc_action', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'اقدام QC', titleEn: 'QC Action', descriptionFa: 'QC → PM', sortOrder: 804, defaultVisible: true },
  { code: 'REQ-005', key: 'req.daily_report', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'گزارش روزانه', titleEn: 'Daily Report', descriptionFa: 'SS → PM approval', sortOrder: 805, defaultVisible: true },
  { code: 'REQ-006', key: 'req.pm_comment', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'یادداشت به PM', titleEn: 'PM Comment', descriptionFa: 'داخلی سرپرست', sortOrder: 806, defaultVisible: false },
  { code: 'REQ-007', key: 'req.schedule_change', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'تغییر زمان‌بندی', titleEn: 'Schedule Change', descriptionFa: 'planned', sortOrder: 807, defaultVisible: false },
  { code: 'REQ-008', key: 'req.resource_escalation', kind: 'request', dashboard: 'cross', layer: 'operational', titleFa: 'تشدید منابع', titleEn: 'Resource Escalation', descriptionFa: 'planned', sortOrder: 808, defaultVisible: false },
]

export const UI_BLOCK_BY_CODE = Object.fromEntries(UI_BLOCK_CATALOG.map((b) => [b.code, b])) as Record<
  string,
  UiBlockDefinition
>

export const UI_BLOCK_BY_KEY = Object.fromEntries(UI_BLOCK_CATALOG.map((b) => [b.key, b])) as Record<
  string,
  UiBlockDefinition
>

export function getBlocksForDashboard(dashboard: string): UiBlockDefinition[] {
  return UI_BLOCK_CATALOG.filter((b) => b.dashboard === dashboard || b.dashboard === 'cross').sort(
    (a, b) => a.sortOrder - b.sortOrder
  )
}

export function getBlocksByKind(kind: UiBlockKind): UiBlockDefinition[] {
  return UI_BLOCK_CATALOG.filter((b) => b.kind === kind)
}

/** Maps executive/analytical KPI keys to catalog block codes */
export const PM_KPI_BLOCK_CODE: Record<string, string> = {
  wsi: 'PM-KPI-01',
  mrs: 'PM-KPI-02',
  csi: 'PM-KPI-03',
}

/** Legacy /dashboard widget key → GEN block code (admin UI Blocks tab) */
export const LEGACY_WIDGET_TO_BLOCK_CODE: Record<string, string> = Object.fromEntries(
  UI_BLOCK_CATALOG.filter((b) => b.legacyWidgetKey).map((b) => [b.legacyWidgetKey!, b.code])
)

/** Extra aliases not stored on catalog rows */
LEGACY_WIDGET_TO_BLOCK_CODE['reports.upload'] = 'GEN-WGT-05'

export function blockCodeForLegacyWidget(widgetKey: string): string | undefined {
  return LEGACY_WIDGET_TO_BLOCK_CODE[widgetKey]
}

/** Summary stats for admin UI */
export function getCatalogStats() {
  const byDashboard = new Map<string, number>()
  const byKind = new Map<UiBlockKind, number>()
  for (const b of UI_BLOCK_CATALOG) {
    byDashboard.set(b.dashboard, (byDashboard.get(b.dashboard) ?? 0) + 1)
    byKind.set(b.kind, (byKind.get(b.kind) ?? 0) + 1)
  }
  return {
    total: UI_BLOCK_CATALOG.length,
    byDashboard: Object.fromEntries(byDashboard),
    byKind: Object.fromEntries(byKind),
  }
}
