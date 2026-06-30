/**
 * Projects API Routes
 * مدیریت پروژه‌ها (CRUD)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/projects - دریافت تمام پروژه‌ها
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_manager:users!project_manager_id(full_name, email),
        site_supervisor:users!site_supervisor_id(full_name, email),
        hse_officer:users!hse_officer_id(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/projects - ایجاد پروژه جدید
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    name,
    description,
    location,
    client_name,
    contractor_name,
    start_date,
    end_date,
    budget,
    project_manager_id,
    site_supervisor_id,
    hse_officer_id,
  } = body

  if (!name || !location || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          description,
          location,
          client_name,
          contractor_name,
          start_date,
          end_date,
          budget,
          project_manager_id,
          site_supervisor_id,
          hse_officer_id,
          status: 'planning',
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

// GET /api/projects/[id] - دریافت پروژه خاص
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.pathname.split('/').pop()

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_manager:users!project_manager_id(full_name, email),
        site_supervisor:users!site_supervisor_id(full_name, email),
        hse_officer:users!hse_officer_id(full_name, email),
        daily_logs:daily_logs(count),
        tasks:tasks(count)
      `)
      .eq('id', projectId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/projects/[id] - به‌روزرسانی پروژه
export async function PUT(request: NextRequest) {
  const projectId = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', projectId)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - حذف پروژه
export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.pathname.split('/').pop()

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) throw error

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
