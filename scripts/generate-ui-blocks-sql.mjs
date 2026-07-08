/**
 * Generates database/33-seed-ui-blocks.sql from lib/dashboard/ui-block-catalog.ts
 * Run: node scripts/generate-ui-blocks-sql.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogPath = path.join(__dirname, '../lib/dashboard/ui-block-catalog.ts')
const outPath = path.join(__dirname, '../database/33-seed-ui-blocks.sql')

const source = fs.readFileSync(catalogPath, 'utf8')
const arrayMatch = source.match(/export const UI_BLOCK_CATALOG[^=]*=\s*\[([\s\S]*?)\]\s*\n\s*export const UI_BLOCK_BY_CODE/)
if (!arrayMatch) {
  console.error('Could not parse UI_BLOCK_CATALOG from ui-block-catalog.ts')
  process.exit(1)
}

/** @type {Record<string, unknown>[]} */
const blocks = []
const entryRe =
  /\{\s*code:\s*'([^']+)',\s*key:\s*'([^']+)',\s*kind:\s*'([^']+)',\s*dashboard:\s*'([^']+)',\s*layer:\s*'([^']+)',\s*titleFa:\s*'((?:\\'|[^'])*)',\s*titleEn:\s*'((?:\\'|[^'])*)',\s*descriptionFa:\s*'((?:\\'|[^'])*)'(?:,\s*legacyWidgetKey:\s*'([^']*)')?,\s*sortOrder:\s*(\d+),\s*defaultVisible:\s*(true|false)\s*\}/g

let m
while ((m = entryRe.exec(arrayMatch[1])) !== null) {
  blocks.push({
    code: m[1],
    key: m[2],
    kind: m[3],
    dashboard: m[4],
    layer: m[5],
    titleFa: m[6].replace(/\\'/g, "'"),
    titleEn: m[7].replace(/\\'/g, "'"),
    descriptionFa: m[8].replace(/\\'/g, "'"),
    legacyWidgetKey: m[9] ?? null,
    sortOrder: Number(m[10]),
    defaultVisible: m[11] === 'true',
  })
}

if (blocks.length === 0) {
  console.error('No blocks parsed — check catalog format')
  process.exit(1)
}

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

const values = blocks
  .map((b) => {
    const legacy = b.legacyWidgetKey ? sqlStr(b.legacyWidgetKey) : 'NULL'
    return `  (${sqlStr(b.code)}, ${sqlStr(b.key)}, ${sqlStr(b.kind)}, ${sqlStr(b.dashboard)}, ${sqlStr(b.layer)}, ${sqlStr(b.titleFa)}, ${sqlStr(b.titleEn)}, ${sqlStr(b.descriptionFa)}, ${legacy}, ${b.sortOrder}, ${b.defaultVisible})`
  })
  .join(',\n')

const sql = `-- Seed UI block catalog (auto-generated from lib/dashboard/ui-block-catalog.ts)
-- Run after 32-ui-block-catalog.sql
-- Regenerate: node scripts/generate-ui-blocks-sql.mjs

INSERT INTO public.dashboard_ui_blocks (
  code, key, kind, dashboard, layer, title_fa, title_en, description_fa, legacy_widget_key, sort_order, default_visible
)
VALUES
${values}
ON CONFLICT (code) DO UPDATE SET
  key = EXCLUDED.key,
  kind = EXCLUDED.kind,
  dashboard = EXCLUDED.dashboard,
  layer = EXCLUDED.layer,
  title_fa = EXCLUDED.title_fa,
  title_en = EXCLUDED.title_en,
  description_fa = EXCLUDED.description_fa,
  legacy_widget_key = EXCLUDED.legacy_widget_key,
  sort_order = EXCLUDED.sort_order,
  default_visible = EXCLUDED.default_visible,
  is_active = true;
`

fs.writeFileSync(outPath, sql, 'utf8')
console.log(`Wrote ${blocks.length} blocks to ${outPath}`)
