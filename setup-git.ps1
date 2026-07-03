# SitePilot - Git Setup Script
# راست‌کلیک → Run with PowerShell  OR  در PowerShell: .\setup-git.ps1

Set-Location $PSScriptRoot

Write-Host "=== Step 1: Git init ===" -ForegroundColor Cyan
git init
git branch -M main

Write-Host "=== Step 2: Add files ===" -ForegroundColor Cyan
git add .

Write-Host "=== Step 3: Commit ===" -ForegroundColor Cyan
git commit -m "SitePilot full app: login, reports, AI analysis"

Write-Host ""
Write-Host "=== Step 4: Connect to GitHub ===" -ForegroundColor Yellow
Write-Host "Go to Vercel -> your project -> Settings -> Git"
Write-Host "Copy the GitHub repo URL (example: https://github.com/YOUR-NAME/site-pilot-2-0.git)"
Write-Host ""
$repoUrl = Read-Host "Paste GitHub repo URL here"

if ($repoUrl) {
    git remote remove origin 2>$null
    git remote add origin $repoUrl
    Write-Host "=== Step 5: Push to GitHub ===" -ForegroundColor Cyan
    git push -u origin main --force
    Write-Host "Done! Vercel will auto-deploy in 2-3 minutes." -ForegroundColor Green
} else {
    Write-Host "Skipped push. Run manually:" -ForegroundColor Yellow
    Write-Host "  git remote add origin YOUR_GITHUB_URL"
    Write-Host "  git push -u origin main"
}

Read-Host "Press Enter to close"
