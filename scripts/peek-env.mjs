import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
if (!existsSync(envPath)) {
  console.log('FAIL: .env.local not found')
  process.exit(1)
}

const raw = readFileSync(envPath, 'utf8')
console.log('File size:', raw.length, 'bytes')
console.log('Has BOM:', raw.charCodeAt(0) === 0xfeff)

const env = {}
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  const key = t.slice(0, i).trim()
  const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  if (env[key]) console.log('DUPLICATE KEY:', key)
  env[key] = val
}

function peek(name) {
  const v = env[name]
  if (!v) return `${name}: MISSING`
  const prefix = v.slice(0, 8)
  const kind = v.startsWith('eyJ')
    ? 'legacy-jwt'
    : v.startsWith('sb_')
      ? 'new-supabase-key'
      : v.startsWith('sbp_')
        ? 'publishable'
        : 'unknown-format'
  return `${name}: len=${v.length} prefix=${prefix}... type=${kind}`
}

console.log(peek('NEXT_PUBLIC_SUPABASE_URL'))
console.log(peek('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
console.log(peek('SUPABASE_SERVICE_ROLE_KEY'))

const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const svc = env.SUPABASE_SERVICE_ROLE_KEY
if (anon && svc && anon === svc) console.log('PROBLEM: anon and service_role are identical')

const allKeys = Object.keys(env).filter((k) => k.includes('SUPABASE'))
console.log('All SUPABASE vars:', allKeys.join(', '))
