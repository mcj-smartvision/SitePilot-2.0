import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
if (!existsSync(envPath)) {
  console.log('FAIL: .env.local not found')
  process.exit(1)
}

const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || ''
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const svc = env.SUPABASE_SERVICE_ROLE_KEY || ''

function report(name, value) {
  if (!value) return console.log(`${name}: MISSING`)
  const jwt = value.startsWith('eyJ') ? 'jwt-ok' : 'NOT-jwt'
  const placeholder = value.includes('your-') ? ' PLACEHOLDER' : ''
  console.log(`${name}: set (len=${value.length}, ${jwt})${placeholder}`)
}

report('NEXT_PUBLIC_SUPABASE_URL', url)
report('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon)
report('SUPABASE_SERVICE_ROLE_KEY', svc)

if (anon && svc && anon === svc) {
  console.log('FAIL: anon and service_role keys are identical — wrong copy/paste')
}

if (url && !url.includes('supabase.co')) {
  console.log('WARN: URL does not contain supabase.co')
}

async function testKey(label, key) {
  if (!url || !key) return
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await client.from('projects').select('id').limit(1)
  if (error) console.log(`${label} test: FAIL — ${error.message}`)
  else console.log(`${label} test: OK`)
}

async function testServiceAuth() {
  if (!url || !svc) return
  const client = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) console.log(`service_role auth test: FAIL — ${error.message}`)
  else console.log(`service_role auth test: OK (users sample: ${data?.users?.length ?? 0})`)
}

console.log('\nLive tests:')
await testKey('anon', anon)
await testKey('service_role', svc)
await testServiceAuth()
