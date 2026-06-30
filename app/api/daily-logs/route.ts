/**
 * Daily Logs API Routes
 * مدیریت گزارش‌های روزانه
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/daily-logs - دریافت گزارش‌های روزانه
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    let query = supabase
      .from('daily_logs')
      .select(`
        *,
        created_by:users(full_name, email),
        project:projects(name, location)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (startDate) {
      query = query.gte('log_date', startDate)
    }

    if (endDate) {
      query = query.lte('log_date', endDate)
    }

    const { data, error } = await query.order('log_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/daily-logs - ایجاد گزارش روزانه جدید
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    project_id,
    log_date,
    workers_count,
    weather,
    weather_notes,
    temperature,
    humidity,
    tasks_completed,
    obstacles,
    safety_incidents,
    notes,
  } = body

  if (!project_id || !log_date) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .insert([
        {
          project_id,
          log_date,
          workers_count,
          weather,
          weather_notes,
          temperature,
          humidity,
          tasks_completed,
          obstacles,
          safety_incidents,
          notes,
          created_by: 'current_user_id', // باید از session دریافت شود
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/daily-logs/[id] - به‌روزرسانی گزارش
export async function PUT(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()

  if (!id) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .update(body)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
