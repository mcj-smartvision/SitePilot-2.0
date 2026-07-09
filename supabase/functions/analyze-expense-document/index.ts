import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPENSE_PROMPT = `You are extracting data from a construction project expense invoice / receipt / bill photo.
Return ONLY a valid JSON object (no markdown) with these keys:
- invoiceNo: string or null (invoice / bill number)
- documentNo: string or null (document number if different)
- supplierName: string or null (vendor / contractor / seller name)
- documentDate: string or null (invoice date as YYYY-MM-DD Gregorian; convert from Jalali if needed)
- amount: number or null (TOTAL in Iranian Rial — plain number, no commas)
- description: string or null (short summary of what was purchased)
- costType: one of "materials","labor","equipment","subcontractor","overhead" (best guess)
- items: array of { description: string, quantity: number, unit: string|null, unitPrice: number|null, amount: number|null }
  (unitPrice and amount must also be in Iranian Rial)

CURRENCY RULE (critical for Iranian invoices):
- If the invoice shows تومان / Toman (common on «فاکتور فروش»), convert every money field to Rial by multiplying by 10.
- If the invoice already shows ریال / Rial, keep the numbers as-is.
- Columns like فی / مبلغ کل on Persian sales invoices are usually Toman unless labeled ریال.

If a field is unreadable, use null. Prefer Persian text for names/descriptions when the document is Persian.
Example (invoice showed 200,000 تومان unit price → store as Rial):
{"invoiceNo":"4524","documentNo":null,"supplierName":"فروشگاه مصالح","documentDate":"2026-07-09","amount":20000000,"description":"خرید سیمان","costType":"materials","items":[{"description":"سیمان","quantity":10,"unit":"کیسه","unitPrice":2000000,"amount":20000000}]}`

interface ExpenseItemExtracted {
  description: string
  quantity: number
  unit: string | null
  unitPrice: number | null
  amount: number | null
}

interface ExpenseExtraction {
  invoiceNo: string | null
  documentNo: string | null
  supplierName: string | null
  documentDate: string | null
  amount: number | null
  description: string | null
  costType: string | null
  items: ExpenseItemExtracted[]
}

const COST_TYPES = new Set(['materials', 'labor', 'equipment', 'subcontractor', 'overhead'])

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
    if (!(file instanceof File)) throw new Error('Missing file in multipart upload')
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

function toNum(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(String(value).replace(/,/g, '').replace(/٬/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseExtraction(raw: string): ExpenseExtraction {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('AI response was not a JSON object')
  const parsed = JSON.parse(trimmed.slice(start, end + 1))

  const costTypeRaw = String(parsed.costType ?? '').toLowerCase().trim()
  const itemsRaw = Array.isArray(parsed.items) ? parsed.items : []

  const items: ExpenseItemExtracted[] = itemsRaw
    .map((row: Record<string, unknown>) => ({
      description: String(row.description ?? row.name ?? '').trim(),
      quantity: toNum(row.quantity) ?? 1,
      unit: row.unit != null ? String(row.unit).trim() || null : null,
      unitPrice: toNum(row.unitPrice ?? row.unit_price),
      amount: toNum(row.amount),
    }))
    .filter((row: ExpenseItemExtracted) => row.description.length > 0)

  return {
    invoiceNo: parsed.invoiceNo != null ? String(parsed.invoiceNo).trim() || null : null,
    documentNo: parsed.documentNo != null ? String(parsed.documentNo).trim() || null : null,
    supplierName: parsed.supplierName != null ? String(parsed.supplierName).trim() || null : null,
    documentDate: parsed.documentDate != null ? String(parsed.documentDate).trim() || null : null,
    amount: toNum(parsed.amount),
    description: parsed.description != null ? String(parsed.description).trim() || null : null,
    costType: COST_TYPES.has(costTypeRaw) ? costTypeRaw : null,
    items,
  }
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
          { role: 'system', content: EXPENSE_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract expense / invoice header fields and line items from this image.',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 2500,
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

    const extraction = parseExtraction(raw)
    return jsonResponse(extraction)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expense document analysis failed'
    return jsonResponse({ error: message }, 500)
  }
})
