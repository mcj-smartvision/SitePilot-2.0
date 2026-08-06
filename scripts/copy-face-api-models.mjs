import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const src = join(process.cwd(), 'node_modules', '@vladmandic', 'face-api', 'model')
const dest = join(process.cwd(), 'public', 'models', 'face-api')

if (!existsSync(src)) {
  console.warn('[copy-face-api-models] package models not found, skip')
  process.exit(0)
}

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('[copy-face-api-models] synced to public/models/face-api')
