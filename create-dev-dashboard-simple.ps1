# create-dev-dashboard-simple.ps1
# Simplified version - just does the basic replacements

$source = "employeeDashboard.html"
$dest = "employeeDashboard-dev.html"

Write-Host "Creating development dashboard..." -ForegroundColor Cyan

# Check if source exists
if (!(Test-Path $source)) {
    Write-Host "Error: $source not found!" -ForegroundColor Red
    exit 1
}

# Backup if dest already exists
if (Test-Path $dest) {
    $backup = "$dest.backup"
    Copy-Item $dest $backup
    Write-Host "Backed up existing file to: $backup" -ForegroundColor Yellow
}

# Copy source to destination
Copy-Item $source $dest
Write-Host "Copied $source to $dest" -ForegroundColor Green

# Read content
$content = Get-Content $dest -Raw

Write-Host "`nApplying replacements..." -ForegroundColor Cyan

# 1. Update title
$content = $content -replace 'data-en="Employee Dashboard \| Carolina Lumper Service"', 'data-en="Employee Dashboard (DEV) | Carolina Lumper Service"'
Write-Host "  [OK] Title updated" -ForegroundColor Green

# 2. Update manifest reference
$content = $content -replace 'href="manifest-employee\.json"', 'href="manifest-employee-dev.json"'
Write-Host "  [OK] Manifest updated" -ForegroundColor Green

# 3. Update theme color
$content = $content -replace 'content="#ffcc00"', 'content="#ff9800"'
Write-Host "  [OK] Theme color updated" -ForegroundColor Green

# 4. Update data-page attribute
$content = $content -replace 'data-page="employeeDashboard"', 'data-page="employeeDashboard-dev"'
Write-Host "  [OK] Page attribute updated" -ForegroundColor Green

# 5. Update cache version
$content = $content -replace 'v=2024-pwa-integration', 'v=2025-dev-offline'
Write-Host "  [OK] Cache version updated" -ForegroundColor Green

# 6. Update service worker filename
$content = $content -replace "navigator\.serviceWorker\.register\('service-worker-employee\.js'", "navigator.serviceWorker.register('service-worker-employee-dev.js'"
Write-Host "  [OK] Service worker filename updated" -ForegroundColor Green

# Write updated content
Set-Content $dest $content -NoNewline

Write-Host "`nAutomated creation complete!" -ForegroundColor Green

# Show file stats
$lineCount = (Get-Content $dest).Count
Write-Host "`nFile: $dest" -ForegroundColor Gray
Write-Host "Lines: $lineCount" -ForegroundColor Gray

Write-Host "`n=== MANUAL STEPS REQUIRED ===" -ForegroundColor Yellow
Write-Host "1. Add DEV banner after navbar (line ~186)"
Write-Host "2. Add device field to offline clockData (line ~1033)"
Write-Host "3. Add offline queue viewer UI (optional)"
Write-Host "4. Add queue viewer JavaScript (optional)"
Write-Host "`nSee CREATE_DEV_DASHBOARD.md for details" -ForegroundColor Cyan
