/**
 * Material Logs API Routes
 * مدیریت گزارش‌های انبار و مصالح
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/material-logs - دریافت گزارش‌های مصالح
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const materialName = searchParams.get('materialName')
  const entryType = searchParams.get('entryType')

  try {
    let query = supabase
      .from('material_logs')
      .select(`
        *,
        created_by:users(full_name, email),
        project:projects(name)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (materialName) {
      query = query.ilike('material_name', `%${materialName}%`)
    }

    if (entryType) {
      query = query.eq('entry_type', entryType)
    }

    const { data, error } = await query.order('log_date', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/material-logs - ثبت مصالح جدید
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    project_id,
    material_name,
    material_code,
    category,
    quantity,
    unit,
    entry_type,
    supplier_name,
    invoice_number,
    cost,
    log_date,
    notes,
  } = body

  if (!project_id || !material_name || !quantity || !unit || !entry_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('material_logs')
      .insert([
        {
          project_id,
          material_name,
          material_code,
          category,
          quantity,
          unit,
          entry_type,
          supplier_name,
          invoice_number,
          cost,
          log_date: log_date || new Date().toISOString().split('T')[0],
          notes,
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

// GET /api/material-logs/inventory - موجودی انبار
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
      .from('v_material_inventory')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
