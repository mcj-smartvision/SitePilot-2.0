import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
const env = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const svc = env.SUPABASE_SERVICE_ROLE_KEY
const client = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

const testEmail = `test-delete-${Date.now()}@site.local`
const { data, error } = await client.auth.admin.createUser({
  email: testEmail,
  password: 'testpass123',
  email_confirm: true,
})

if (error) {
  console.log('createUser FAIL:', error.message)
  process.exit(1)
}

console.log('createUser OK:', data.user?.id)
if (data.user?.id) {
  await client.auth.admin.deleteUser(data.user.id)
  console.log('cleanup OK')
}
