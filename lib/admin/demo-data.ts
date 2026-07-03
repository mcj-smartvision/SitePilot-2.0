import type { AdminActivityItem, AdminSupportTicket, OnlineUser } from '@/types/admin'

export function getDemoActivities(): AdminActivityItem[] {
  return [
    { id: '1', user: 'Ahmad Rezaei', role: 'Site Supervisor', action: 'Submitted daily site report', section: 'Reports', time: '2 min ago', type: 'action' },
    { id: '2', user: 'Sara Mohammadi', role: 'HSE Officer', action: 'Logged safety observation', section: 'HSE', time: '8 min ago', type: 'alert' },
    { id: '3', user: 'Karim Hassan', role: 'Storekeeper', action: 'Updated material receipt #442', section: 'Inventory', time: '15 min ago', type: 'action' },
    { id: '4', user: 'Unknown', role: '—', action: 'Failed login attempt', section: 'Auth', time: '22 min ago', type: 'security' },
    { id: '5', user: 'Leila Karimi', role: 'QA/QC Inspector', action: 'Marked inspection as failed', section: 'Quality', time: '35 min ago', type: 'alert' },
    { id: '6', user: 'Omid Farahani', role: 'Project Manager', action: 'Reviewed schedule variance report', section: 'Planning', time: '1 hr ago', type: 'action' },
    { id: '7', user: 'Hassan Ali', role: 'Foreman', action: 'Changed password on first login', section: 'Account', time: '1 hr ago', type: 'action' },
    { id: '8', user: 'Neda Sadeghi', role: 'Planning Engineer', action: 'Updated lookahead schedule', section: 'Planning', time: '2 hr ago', type: 'action' },
  ]
}

export function getDemoOnlineUsers(): OnlineUser[] {
  return [
    { id: '1', name: 'Ahmad Rezaei', role: 'Site Supervisor', email: 'ahmad.r@site.local', currentPage: 'Daily Report', lastSeen: 'Active now', status: 'online' },
    { id: '2', name: 'Sara Mohammadi', role: 'HSE Officer', email: 'sara.m@site.local', currentPage: 'Safety Log', lastSeen: 'Active now', status: 'online' },
    { id: '3', name: 'Karim Hassan', role: 'Storekeeper', email: 'karim.h@site.local', currentPage: 'Inventory', lastSeen: 'Active now', status: 'online' },
    { id: '4', name: 'Leila Karimi', role: 'QA/QC Inspector', email: 'leila.k@site.local', currentPage: 'Inspections', lastSeen: '3 min ago', status: 'idle' },
    { id: '5', name: 'Omid Farahani', role: 'Project Manager', email: 'omid.f@site.local', currentPage: 'Dashboard', lastSeen: 'Active now', status: 'online' },
  ]
}

export function getDemoSupportTickets(): AdminSupportTicket[] {
  return [
    { id: 'TKT-1042', subject: 'Cannot upload site photos on mobile', user: 'Ahmad Rezaei', role: 'Site Supervisor', priority: 'high', status: 'open', created: 'Today, 07:45', messages: 3 },
    { id: 'TKT-1041', subject: 'Password reset not working', user: 'Hassan Ali', role: 'Foreman', priority: 'medium', status: 'in_progress', created: 'Yesterday', messages: 5 },
    { id: 'TKT-1040', subject: 'Material stock count mismatch', user: 'Karim Hassan', role: 'Storekeeper', priority: 'high', status: 'open', created: 'Yesterday', messages: 2 },
    { id: 'TKT-1039', subject: 'Request access to planning module', user: 'Neda Sadeghi', role: 'Planning Engineer', priority: 'low', status: 'resolved', created: '2 days ago', messages: 4 },
    { id: 'TKT-1038', subject: 'Dashboard widgets not loading', user: 'Omid Farahani', role: 'Project Manager', priority: 'medium', status: 'in_progress', created: '3 days ago', messages: 6 },
  ]
}

export function getDemoCriticalAlerts() {
  return [
    { id: '1', title: 'Hot work permit expiring', severity: 'high' as const, source: 'HSE', time: '45 min' },
    { id: '2', title: 'Rebar inspection failed — Grid A4', severity: 'critical' as const, source: 'QA/QC', time: '35 min' },
    { id: '3', title: 'Cement stock below reorder level', severity: 'medium' as const, source: 'Inventory', time: '1 hr' },
    { id: '4', title: 'Critical path activity delayed', severity: 'high' as const, source: 'Planning', time: '2 hr' },
  ]
}
