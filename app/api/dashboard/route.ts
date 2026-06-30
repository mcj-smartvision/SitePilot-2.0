/**
 * Dashboard API Routes
 * داده‌های داشبورد اصلی
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/dashboard/overview - خلاصه داشبورد
export async function GET(request: NextRequest) {
  try {
    // 1. جمع‌آوری داده‌های پروژه‌ها
    const { data: projects, error: projectsError } = await supabase
      .from('v_project_overview')
      .select('*')

    if (projectsError) throw projectsError

    // 2. جمع‌آوری هشدارهای ایمنی
    const { data: safetyAlerts, error: safetyError } = await supabase
      .from('v_safety_analysis_summary')
      .select('*')

    if (safetyError) throw safetyError

    // 3. جمع‌آوری موجودی انبار
    const { data: inventory, error: inventoryError } = await supabase
      .from('v_material_inventory')
      .select('*')

    if (inventoryError) throw inventoryError

    // 4. محاسبه آمار کلی
    const stats = {
      total_projects: projects?.length || 0,
      active_projects: projects?.filter((p: any) => p.status === 'active').length || 0,
      critical_safety_issues: safetyAlerts?.reduce((sum: number, s: any) => sum + s.critical_issues, 0) || 0,
      total_materials: inventory?.length || 0,
    }

    return NextResponse.json({
      stats,
      projects,
      safetyAlerts,
      inventory,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/dashboard/project/:id - داشبورد پروژه‌ای
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.pathname.split('/').pop()

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    // 1. اطلاعات پروژه
    const { data: project, error: projectError } = await supabase
      .from('v_project_overview')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // 2. گزارش‌های امروز
    const today = new Date().toISOString().split('T')[0]
    const { data: todayLog, error: logError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('log_date', today)
      .single()

    if (logError && logError.code !== 'PGRST116') throw logError

    // 3. تسک‌های تأخیر شده
    const { data: delayedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, scheduled_end, status')
      .eq('project_id', projectId)
      .eq('status', 'delayed')

    if (tasksError) throw tasksError

    // 4. آخرین تحلیل‌های Vision
    const { data: visionAnalysis, error: visionError } = await supabase
      .from('vision_analysis')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (visionError) throw visionError

    return NextResponse.json({
      project,
      todayLog,
      delayedTasks,
      recentAnalysis: visionAnalysis,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
