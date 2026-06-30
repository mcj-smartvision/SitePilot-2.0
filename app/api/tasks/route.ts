/**
 * Tasks API Routes
 * مدیریت تسک‌ها و زمان‌بندی
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/tasks - دریافت تسک‌ها
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assignedTo')

  try {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!assigned_to(full_name, email),
        created_by_user:users!created_by(full_name),
        predecessor:tasks!predecessor_id(title)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data, error } = await query.order('scheduled_start', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks - ایجاد تسک جدید
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    project_id,
    title,
    description,
    phase,
    scheduled_start,
    scheduled_end,
    assigned_to,
    priority,
    predecessor_id,
  } = body

  if (!project_id || !title || !scheduled_start || !scheduled_end) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    // محاسبه مدت زمان
    const start = new Date(scheduled_start)
    const end = new Date(scheduled_end)
    const durationDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          project_id,
          title,
          description,
          phase,
          scheduled_start,
          scheduled_end,
          assigned_to,
          priority: priority || 'medium',
          predecessor_id,
          duration_days: durationDays,
          status: 'pending',
          created_by: 'current_user_id',
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/tasks/[id] - به‌روزرسانی تسک
export async function PUT(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()

  if (!id) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(body)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/tasks/gantt - داده‌های Gantt Chart
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, scheduled_start, scheduled_end, progress_percentage, status, predecessor_id')
      .eq('project_id', projectId)
      .order('scheduled_start')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
