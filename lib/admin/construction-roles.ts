/** Canonical construction site positions for dropdowns and role dashboards. */
export interface ConstructionRole {
  key: string
  title: string
  description: string
  color: string
  icon: string
}

export const CONSTRUCTION_ROLES: ConstructionRole[] = [
  { key: 'project_manager', title: 'Project Manager', description: 'Overall project planning, coordination, and delivery.', color: 'bg-slate-700', icon: 'Briefcase' },
  { key: 'site_manager', title: 'Site Manager', description: 'Daily site leadership, workforce, and field coordination.', color: 'bg-stone-700', icon: 'Building2' },
  { key: 'site_supervisor', title: 'Site Supervisor', description: 'Supervises daily operations and progress on site.', color: 'bg-zinc-600', icon: 'HardHat' },
  { key: 'civil_engineer', title: 'Civil Engineer', description: 'Structural and civil works oversight.', color: 'bg-blue-800', icon: 'Ruler' },
  { key: 'architect', title: 'Architect', description: 'Design compliance and architectural coordination.', color: 'bg-indigo-700', icon: 'PenTool' },
  { key: 'structural_engineer', title: 'Structural Engineer', description: 'Structural design review and field conformance.', color: 'bg-sky-800', icon: 'Layers' },
  { key: 'mep_engineer', title: 'MEP Engineer', description: 'Mechanical, electrical, and plumbing systems.', color: 'bg-cyan-800', icon: 'Zap' },
  { key: 'hse_officer', title: 'HSE Officer', description: 'Health, safety, and environmental compliance.', color: 'bg-amber-700', icon: 'ShieldAlert' },
  { key: 'qa_qc_inspector', title: 'QA/QC Inspector', description: 'Quality assurance and quality control inspections.', color: 'bg-emerald-800', icon: 'ClipboardCheck' },
  { key: 'surveyor', title: 'Surveyor', description: 'Site measurements, layout, and as-built verification.', color: 'bg-teal-700', icon: 'MapPin' },
  { key: 'storekeeper', title: 'Storekeeper', description: 'Material receiving, inventory, and storage.', color: 'bg-orange-800', icon: 'Package' },
  { key: 'procurement_officer', title: 'Procurement Officer', description: 'Purchasing, vendor coordination, and supply chain.', color: 'bg-yellow-800', icon: 'ShoppingCart' },
  { key: 'planning_engineer', title: 'Planning Engineer', description: 'Schedule planning, lookahead, and productivity.', color: 'bg-violet-700', icon: 'CalendarRange' },
  { key: 'document_controller', title: 'Document Controller', description: 'Drawings, submittals, and document management.', color: 'bg-neutral-600', icon: 'FileText' },
  { key: 'foreman', title: 'Foreman', description: 'Leads field crews on specific work fronts.', color: 'bg-amber-800', icon: 'Users' },
  { key: 'contractor', title: 'Contractor', description: 'External contractor representative on site.', color: 'bg-stone-600', icon: 'Truck' },
  { key: 'subcontractor', title: 'Subcontractor', description: 'Specialized subcontractor field access.', color: 'bg-gray-600', icon: 'Wrench' },
  { key: 'finance_admin', title: 'Finance/Admin Officer', description: 'Budget tracking, invoices, and admin support.', color: 'bg-green-800', icon: 'Wallet' },
  { key: 'equipment_manager', title: 'Equipment Manager', description: 'Plant, machinery, and equipment allocation.', color: 'bg-red-900', icon: 'Cog' },
  { key: 'security', title: 'Security', description: 'Gate access, entry/exit logs, and site security.', color: 'bg-slate-800', icon: 'Lock' },
  { key: 'worker', title: 'Worker', description: 'Field worker with assigned tasks and safety briefings.', color: 'bg-stone-500', icon: 'Hammer' },
  { key: 'visitor', title: 'Visitor / Temporary Access', description: 'Limited temporary site access.', color: 'bg-neutral-500', icon: 'UserCheck' },
]

export interface RoleDashboardMetric {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral' | 'warning'
}

export interface RoleDashboardPreview {
  key: string
  title: string
  color: string
  summary: string
  metrics: RoleDashboardMetric[]
  alerts: string[]
}

export const ROLE_DASHBOARD_PREVIEWS: RoleDashboardPreview[] = [
  {
    key: 'project_manager',
    title: 'Project Manager',
    color: 'border-l-slate-700',
    summary: 'Overall project health and executive oversight',
    metrics: [
      { label: 'Progress', value: '68%', trend: 'up' },
      { label: 'Schedule', value: '3 days behind', trend: 'warning' },
      { label: 'Budget', value: '94% utilized', trend: 'neutral' },
      { label: 'Open issues', value: '7', trend: 'warning' },
    ],
    alerts: ['Foundation pour delayed — Block C', 'Budget variance on steel package'],
  },
  {
    key: 'site_manager',
    title: 'Site Manager',
    color: 'border-l-stone-700',
    summary: 'Daily site status and field coordination',
    metrics: [
      { label: 'Workforce', value: '142 on site', trend: 'up' },
      { label: 'Urgent issues', value: '4', trend: 'warning' },
      { label: 'Material alerts', value: '2', trend: 'warning' },
      { label: "Today's plan", value: '85% complete', trend: 'up' },
    ],
    alerts: ['Crane lift at 14:00 — Zone B', 'Concrete delivery rescheduled'],
  },
  {
    key: 'site_supervisor',
    title: 'Site Supervisor',
    color: 'border-l-zinc-600',
    summary: 'Today\'s operations, daily reports, and field actions',
    metrics: [
      { label: 'Today\'s activities', value: '12', trend: 'neutral' },
      { label: 'Critical tasks', value: '3', trend: 'warning' },
      { label: 'Readiness', value: '78%', trend: 'up' },
      { label: 'AI drafts', value: '2 pending', trend: 'warning' },
    ],
    alerts: ['Formwork delay — Level 2', 'Purchase request awaiting approval'],
  },
  {
    key: 'hse_officer',
    title: 'HSE Officer',
    color: 'border-l-amber-600',
    summary: 'Safety observations and compliance monitoring',
    metrics: [
      { label: 'Observations', value: '12 this week', trend: 'neutral' },
      { label: 'PPE compliance', value: '96%', trend: 'up' },
      { label: 'High-risk zones', value: '3 active', trend: 'warning' },
      { label: 'Open incidents', value: '1', trend: 'warning' },
    ],
    alerts: ['Unresolved PPE violation — Level 2', 'Hot work permit expires today'],
  },
  {
    key: 'qa_qc_inspector',
    title: 'QA/QC Inspector',
    color: 'border-l-emerald-700',
    summary: 'Inspections, approvals, and quality trends',
    metrics: [
      { label: 'Pending inspections', value: '8', trend: 'warning' },
      { label: 'Failed checks', value: '2', trend: 'down' },
      { label: 'Approval queue', value: '5 items', trend: 'neutral' },
      { label: 'Pass rate', value: '91%', trend: 'up' },
    ],
    alerts: ['Rebar inspection failed — Grid A4', 'MEP clearance pending sign-off'],
  },
  {
    key: 'storekeeper',
    title: 'Storekeeper',
    color: 'border-l-orange-700',
    summary: 'Inventory, deliveries, and material movement',
    metrics: [
      { label: 'Stock items', value: '847', trend: 'neutral' },
      { label: 'Low inventory', value: '6 alerts', trend: 'warning' },
      { label: 'Incoming today', value: '4 deliveries', trend: 'up' },
      { label: 'Issues logged', value: '3', trend: 'neutral' },
    ],
    alerts: ['Cement bags below reorder level', 'Delivery #442 delayed 2h'],
  },
  {
    key: 'planning_engineer',
    title: 'Planning Engineer',
    color: 'border-l-violet-700',
    summary: 'Schedule health and productivity tracking',
    metrics: [
      { label: 'Task progress', value: '72%', trend: 'up' },
      { label: 'Delayed activities', value: '5', trend: 'warning' },
      { label: 'Lookahead', value: '3 weeks', trend: 'neutral' },
      { label: 'Productivity', value: '88%', trend: 'up' },
    ],
    alerts: ['Critical path activity slipping — Formwork', 'Resource conflict on Level 3'],
  },
  {
    key: 'foreman',
    title: 'Foreman / Worker',
    color: 'border-l-amber-800',
    summary: 'Assigned tasks, attendance, and safety reminders',
    metrics: [
      { label: 'Assigned tasks', value: '6', trend: 'neutral' },
      { label: 'Completed today', value: '4', trend: 'up' },
      { label: 'Attendance', value: 'Present', trend: 'up' },
      { label: 'Safety briefings', value: '1 pending', trend: 'warning' },
    ],
    alerts: ['Toolbox talk at 07:30 — Mandatory', 'PPE check before Zone C entry'],
  },
]

export function getRoleByKey(key: string): ConstructionRole | undefined {
  return CONSTRUCTION_ROLES.find((r) => r.key === key)
}
