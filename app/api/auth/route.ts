/**
 * Authentication API Routes
 * برای ورود، ثبت‌نام و مدیریت جلسات
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  const { email, password, full_name, role } = await request.json()

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    // ثبت‌نام کاربر
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: role || 'site_supervisor' },
      },
    })

    if (authError) throw authError

    // ایجاد رکورد کاربر در جدول users
    if (authData.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            full_name,
            role: role || 'site_supervisor',
          },
        ])

      if (userError) throw userError
    }

    return NextResponse.json(
      { message: 'User created successfully', user: authData.user },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/auth/signin
export async function PUT(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Missing email or password' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return NextResponse.json(
      { message: 'Signed in successfully', user: data.user, session: data.session },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    )
  }
}
