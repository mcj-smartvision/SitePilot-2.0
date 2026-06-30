/**
 * Vision Analysis API Routes
 * تحلیل تصاویر با OpenAI Vision API
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// POST /api/vision/analyze - تحلیل تصویر
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, image_url, analysis_type } = body

  if (!project_id || !image_url || !analysis_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }

  try {
    // تعریف prompt بر اساس نوع تحلیل
    let prompt = ''
    if (analysis_type === 'progress') {
      prompt = 'Analyze this construction site image and provide: 1) Estimated progress percentage, 2) Visible work phases, 3) Current activities, 4) Any quality issues. Respond in Persian.'
    } else if (analysis_type === 'safety') {
      prompt = 'Analyze this construction site for safety issues: 1) Identify any safety hazards, 2) Check for proper safety equipment, 3) Assess site organization, 4) Rate severity level (low/medium/high/critical). Respond in Persian.'
    } else if (analysis_type === 'inventory') {
      prompt = 'Analyze this image for inventory/materials: 1) Identify visible materials, 2) Estimate quantities, 3) Check for proper storage, 4) Note any damaged items. Respond in Persian.'
    }

    // فراخوانی OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image_url,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    })

    const aiData = await openaiResponse.json()

    if (!openaiResponse.ok) {
      throw new Error(aiData.error?.message || 'OpenAI API error')
    }

    const analysisResult = aiData.choices[0].message.content

    // ذخیره نتیجه در Database
    const { data, error } = await supabase
      .from('vision_analysis')
      .insert([
        {
          project_id,
          image_url,
          analysis_type,
          raw_analysis: analysisResult,
          analysis_status: 'completed',
          created_by: 'current_user_id',
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// GET /api/vision/history - دریافت تحلیل‌های قبلی
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const analysisType = searchParams.get('analysisType')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  try {
    let query = supabase
      .from('vision_analysis')
      .select('*')
      .eq('project_id', projectId)

    if (analysisType) {
      query = query.eq('analysis_type', analysisType)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
