# SitePilot local dev — run in PowerShell from project folder
Set-Location $PSScriptRoot

Write-Host "=== 1. Check Node.js ===" -ForegroundColor Cyan
node -v
npm -v

Write-Host "`n=== 2. Install dependencies ===" -ForegroundColor Cyan
if (-not (Test-Path node_modules)) {
  npm install
} else {
  Write-Host "node_modules exists — skip install (delete folder to reinstall)"
}

Write-Host "`n=== 3. Check .env.local ===" -ForegroundColor Cyan
if (-not (Test-Path .env.local)) {
  Write-Host "WARNING: .env.local missing!" -ForegroundColor Yellow
  Write-Host "Copy .env.local.example to .env.local and add Supabase keys."
} else {
  Write-Host ".env.local found"
}

Write-Host "`n=== 4. Build test ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "BUILD FAILED — fix errors above before deploy" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== 5. Start dev server ===" -ForegroundColor Green
Write-Host "Open http://localhost:3000"
npm run dev
