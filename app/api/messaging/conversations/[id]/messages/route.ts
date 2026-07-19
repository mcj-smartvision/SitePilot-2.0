import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listMessages,
  markConversationRead,
  messagingErrorResponse,
  sendMessage,
} from '@/lib/messaging/service'

type Ctx = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient()
    const messages = await listMessages(supabase, params.id)
    await markConversationRead(supabase, params.id)
    return NextResponse.json({ messages })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient()
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const text = String(form.get('body') ?? form.get('text') ?? '')
      const filesMeta: Array<{
        storagePath: string
        fileName: string
        fileType: string
        fileSize: number
      }> = []

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const uploads = form.getAll('files')
      for (const item of uploads) {
        if (!(item instanceof File) || item.size === 0) continue
        const maxBytes = item.type.startsWith('video/')
          ? 40 * 1024 * 1024
          : 20 * 1024 * 1024
        if (item.size > maxBytes) {
          return NextResponse.json(
            { error: item.type.startsWith('video/') ? 'ویدیو حداکثر ۴۰ مگابایت' : 'فایل حداکثر ۲۰ مگابایت' },
            { status: 400 }
          )
        }
        const safeName = item.name.replace(/[^\w.\-()\u0600-\u06FF\s]/g, '_')
        const path = `${params.id}/${user.id}/${Date.now()}-${safeName}`
        const buffer = Buffer.from(await item.arrayBuffer())
        const { error: upErr } = await supabase.storage
          .from('message-attachments')
          .upload(path, buffer, {
            contentType: item.type || 'application/octet-stream',
            upsert: false,
          })
        if (upErr) {
          return NextResponse.json({ error: upErr.message }, { status: 400 })
        }
        filesMeta.push({
          storagePath: path,
          fileName: item.name,
          fileType: item.type || 'application/octet-stream',
          fileSize: item.size,
        })
      }

      const msg = await sendMessage(supabase, params.id, text, filesMeta)
      return NextResponse.json({ message: msg })
    }

    const body = await request.json()
    const msg = await sendMessage(supabase, params.id, String(body.body ?? body.text ?? ''), [])
    return NextResponse.json({ message: msg })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
