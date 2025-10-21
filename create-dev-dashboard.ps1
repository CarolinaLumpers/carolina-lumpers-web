# create-dev-dashboard.ps1
# Creates employeeDashboard-dev.html with automated replacements
# Manual additions still needed: DEV banner, queue viewer UI

$source = "employeeDashboard.html"
$dest = "employeeDashboard-dev.html"

Write-Host "🚀 Creating development dashboard..." -ForegroundColor Cyan

# Check if source exists
if (!(Test-Path $source)) {
    Write-Host "❌ Error: $source not found!" -ForegroundColor Red
    exit 1
}

# Backup if dest already exists
if (Test-Path $dest) {
    $backup = "$dest.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $dest $backup
    Write-Host "📦 Backed up existing file to: $backup" -ForegroundColor Yellow
}

# Copy source to destination
Copy-Item $source $dest
Write-Host "✅ Copied $source → $dest" -ForegroundColor Green

# Read content
$content = Get-Content $dest -Raw

# Track changes
$changes = @()

# 1. Update title
$oldTitle = 'data-en="Employee Dashboard | Carolina Lumper Service"'
$newTitle = 'data-en="Employee Dashboard (DEV) | Carolina Lumper Service"'
if ($content -match [regex]::Escape($oldTitle)) {
    $content = $content -replace [regex]::Escape($oldTitle), $newTitle
    $changes += "[OK] Title updated to include (DEV)"
}

# 2. Update manifest reference
$oldManifest = 'href="manifest-employee.json"'
$newManifest = 'href="manifest-employee-dev.json"'
if ($content -match [regex]::Escape($oldManifest)) {
    $content = $content -replace [regex]::Escape($oldManifest), $newManifest
    $changes += "[OK] Manifest changed to dev version"
}

# 3. Update theme color
$oldTheme = 'content="#ffcc00"'
$newTheme = 'content="#ff9800"'
if ($content -match [regex]::Escape($oldTheme)) {
    $content = $content -replace [regex]::Escape($oldTheme), $newTheme
    $changes += "[OK] Theme color changed to orange (#ff9800)"
}

# 4. Update data-page attribute
$oldPage = 'data-page="employeeDashboard"'
$newPage = 'data-page="employeeDashboard-dev"'
if ($content -match [regex]::Escape($oldPage)) {
    $content = $content -replace [regex]::Escape($oldPage), $newPage
    $changes += "[OK] Page attribute updated to employeeDashboard-dev"
}

# 5. Update cache version in CSS links
$content = $content -replace 'v=2024-pwa-integration', 'v=2025-dev-offline'
$changes += "[OK] Cache-bust version updated to v=2025-dev-offline"

# 6. Update service worker filename in registration
$oldSW = "navigator.serviceWorker.register\('service-worker-employee.js'"
$newSW = "navigator.serviceWorker.register('service-worker-employee-dev.js'"
if ($content -match [regex]::Escape($oldSW)) {
    $content = $content -replace [regex]::Escape($oldSW), $newSW
    $changes += "[OK] Service worker changed to dev version"
}

# 7. Console.log prefix - skip for now (causes escaping issues)
# Manual step needed

# 8. Add device tracking to offline clock data (specific fix at line ~1033)
$oldClockData = @"
              const clockData = {
                workerId: workerId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                lang: localStorage.getItem("CLS_Lang") || "en",
                email: email || '',
                timestamp: new Date().toISOString()
              };
"@

$newClockData = @"
              const deviceInfo = window.getDeviceInfo ? window.getDeviceInfo() : 
                                 { displayString: 'Unknown Device' };
              const clockData = {
                workerId: workerId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                lang: localStorage.getItem("CLS_Lang") || "en",
                email: email || '',
                device: deviceInfo.displayString,  // ✅ ADDED for offline tracking
                timestamp: new Date().toISOString()
              };
"@

if ($content -match [regex]::Escape($oldClockData)) {
    $content = $content -replace [regex]::Escape($oldClockData), $newClockData
    $changes += "Added device tracking to offline clock data"
} else {
    Write-Host "⚠️  Warning: Could not find exact offline clockData pattern" -ForegroundColor Yellow
    Write-Host "   Manual fix needed at line ~1033" -ForegroundColor Yellow
}

# Write updated content
Set-Content $dest $content -NoNewline

Write-Host "`n📊 Changes Applied:" -ForegroundColor Cyan
foreach ($change in $changes) {
    Write-Host "  $change" -ForegroundColor Green
}

Write-Host "`n⚠️  MANUAL STEPS REQUIRED:" -ForegroundColor Yellow
Write-Host "  1. Add DEV banner after navbar (line ~186)" -ForegroundColor White
Write-Host "     See CREATE_DEV_DASHBOARD.md section 4" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Add offline queue viewer UI (line ~390)" -ForegroundColor White
Write-Host "     See CREATE_DEV_DASHBOARD.md section 7" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Add queue viewer JavaScript (line ~1765)" -ForegroundColor White
Write-Host "     See CREATE_DEV_DASHBOARD.md section 8" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Update Service Worker registration (line ~1770)" -ForegroundColor White
Write-Host "     See CREATE_DEV_DASHBOARD.md section 5" -ForegroundColor Gray

Write-Host "`n✅ Automated creation complete!" -ForegroundColor Green
Write-Host "📝 Next: Open $dest and apply manual steps above" -ForegroundColor Cyan
Write-Host "📖 Reference: CREATE_DEV_DASHBOARD.md" -ForegroundColor Cyan

# Show file stats
$lineCount = (Get-Content $dest).Count
Write-Host "`n📄 File: $dest" -ForegroundColor Gray
Write-Host "   Lines: $lineCount" -ForegroundColor Gray
Write-Host "   Size: $([math]::Round((Get-Item $dest).Length / 1KB, 2)) KB" -ForegroundColor Gray
