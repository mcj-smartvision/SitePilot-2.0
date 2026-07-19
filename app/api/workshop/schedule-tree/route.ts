import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScheduleTree, workshopErrorResponse } from '@/lib/workshop/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است', code: 'VALIDATION' }, { status: 400 })
    }
    const tree = await getScheduleTree(supabase, projectId)
    return NextResponse.json(tree)
  } catch (error) {
    return workshopErrorResponse(error)
  }
}
