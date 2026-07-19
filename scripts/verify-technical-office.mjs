/**
 * Quick check: migration 45 + technical_office position.
 * Run: node scripts/verify-technical-office.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const env = {}
  for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnvLocal()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

let failed = 0

async function checkTable(table) {
  const { error, count } = await sb.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    failed += 1
    console.log(`FAIL  ${table}: ${error.message}`)
  } else {
    console.log(`OK    ${table} (rows=${count ?? 0})`)
  }
}

await checkTable('site_ops_cre_runs')
await checkTable('site_ops_operational_tasks')
await checkTable('site_ops_blockers')
await checkTable('site_ops_approvals')

const { data: positions, error: posErr } = await sb
  .from('positions')
  .select('project_id, key, title, is_active')
  .eq('key', 'technical_office')
  .limit(20)

if (posErr) {
  failed += 1
  console.log(`FAIL  positions.technical_office: ${posErr.message}`)
} else if (!positions?.length) {
  failed += 1
  console.log('FAIL  technical_office position not found — run database/45-technical-office-layer2.sql')
} else {
  console.log(`OK    technical_office position on ${positions.length} project(s)`)
  for (const p of positions.slice(0, 5)) {
    console.log(`      - ${p.title} (active=${p.is_active})`)
  }
}

// Column presence via selecting enrichment fields
const { error: colErr } = await sb
  .from('site_ops_operational_tasks')
  .select('id, payment_flag, ops_status, planned_qty, parent_id')
  .limit(1)

if (colErr) {
  failed += 1
  console.log(`FAIL  enrichment columns: ${colErr.message}`)
} else {
  console.log('OK    enrichment columns (payment_flag, ops_status, …)')
}

if (failed) {
  console.error(`\n${failed} check(s) failed.`)
  process.exit(1)
}
console.log('\nTechnical Office backend looks ready.')
