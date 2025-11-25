# ====================================================================
# Carolina Lumpers Web - Automated Deployment Script
# ====================================================================
# Purpose: Auto-update cache versions across all files before deployment
# Usage: .\deploy.ps1 [-Message "Custom commit message"]
# ====================================================================

param(
    [string]$Message = ""
)

Write-Host "🚀 Carolina Lumpers Web - Deployment Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Generate timestamp in format: YYYYMMDD-HHMM
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
Write-Host "📅 Generated cache version: $timestamp" -ForegroundColor Green
Write-Host ""

# Define files that contain cache version strings
$files = @(
    "employeeDashboard.html",
    "service-worker-employee.js",
    "js/service-worker-manager.js"
)

# Backup check - ensure files exist
$missingFiles = @()
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ ERROR: Missing files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "🔄 Updating cache versions in files..." -ForegroundColor Yellow
Write-Host ""

# Update each file
foreach ($file in $files) {
    try {
        $content = Get-Content $file -Raw
        $oldContent = $content
        
        # Replace all occurrences of YYYYMMDD-HHMM pattern with new timestamp
        $content = $content -replace '\d{8}-\d{4}', $timestamp
        
        # Check if any changes were made
        if ($content -ne $oldContent) {
            Set-Content $file -Value $content -NoNewline
            Write-Host "   ✅ Updated: $file" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No changes: $file (no timestamp found)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Failed: $file" -ForegroundColor Red
        Write-Host "      Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Staging files for commit..." -ForegroundColor Yellow

# Stage all updated files
git add $files

# Check git status
$gitStatus = git status --short
if (-not $gitStatus) {
    Write-Host "⚠️  No changes detected - cache version may already be up to date" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Current cache version: $timestamp" -ForegroundColor Cyan
    exit 0
}

Write-Host "✅ Files staged successfully" -ForegroundColor Green
Write-Host ""

# Generate commit message
if ($Message) {
    $commitMessage = $Message
} else {
    $commitMessage = "Deploy: Update cache version to $timestamp"
}

Write-Host "💬 Commit message: $commitMessage" -ForegroundColor Cyan
Write-Host ""

# Commit changes
try {
    git commit -m $commitMessage
    Write-Host "✅ Changes committed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Commit failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🌐 Pushing to remote repository..." -ForegroundColor Yellow

# Push to remote
try {
    git push
    Write-Host "✅ Pushed to remote successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed: $_" -ForegroundColor Red
    Write-Host "   You may need to pull first or check your network connection" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Deployment Complete! ✨" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - Cache version updated to: $timestamp" -ForegroundColor White
Write-Host "   - Files updated: $($files.Count)" -ForegroundColor White
Write-Host "   - Commit: $commitMessage" -ForegroundColor White
Write-Host "   - Status: Pushed to origin/main" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. GCP will auto-deploy from main branch" -ForegroundColor White
Write-Host "   2. Users will auto-update on next page load (no hard refresh needed)" -ForegroundColor White
Write-Host "   3. Service worker v$timestamp is now active" -ForegroundColor White
Write-Host ""
