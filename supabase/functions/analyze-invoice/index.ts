import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INVOICE_PROMPT = `Extract the items, quantities, and units from this warehouse invoice/receipt. Return ONLY a valid JSON array of objects with the keys: 'name' (string, translated to Persian or English based on text), 'quantity' (number), and 'unit' (string like کیسه، عدد، کیلوگرم، بندیل). Do not wrap in an object. Example: [{"name":"سیمان","quantity":10,"unit":"کیسه"}]`

interface ExtractedLine {
  name: string
  quantity: number
  unit: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function resolveImageDataUrl(req: Request): Promise<string> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new Error('Missing file in multipart upload')
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = file.type || 'image/jpeg'
    return `data:${mime};base64,${bytesToBase64(bytes)}`
  }

  const body = await req.json()
  const raw = body.imageBase64 ?? body.image ?? body.imageUrl
  if (!raw || typeof raw !== 'string') {
    throw new Error('imageBase64, image, or imageUrl is required')
  }
  if (raw.startsWith('data:')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `data:image/jpeg;base64,${raw}`
}

function parseExtractedItems(raw: string): ExtractedLine[] {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('[') ? trimmed : trimmed.slice(trimmed.indexOf('['), trimmed.lastIndexOf(']') + 1)
  const parsed = JSON.parse(jsonText)

  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON array')
  }

  return parsed
    .map((row) => ({
      name: String(row.name ?? '').trim(),
      quantity: Number(row.quantity),
      unit: String(row.unit ?? 'عدد').trim() || 'عدد',
    }))
    .filter((row) => row.name && Number.isFinite(row.quantity) && row.quantity > 0)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured for this edge function' }, 500)
  }

  try {
    const imageUrl = await resolveImageDataUrl(req)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: INVOICE_PROMPT,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all line items from this invoice image.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 2048,
      }),
    })

    const aiData = await response.json()
    if (!response.ok) {
      return jsonResponse({ error: aiData.error?.message ?? 'OpenAI API error' }, 502)
    }

    const raw = aiData.choices?.[0]?.message?.content
    if (!raw || typeof raw !== 'string') {
      return jsonResponse({ error: 'Empty AI response' }, 502)
    }

    const items = parseExtractedItems(raw)
    return jsonResponse({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invoice analysis failed'
    return jsonResponse({ error: message }, 500)
  }
})
