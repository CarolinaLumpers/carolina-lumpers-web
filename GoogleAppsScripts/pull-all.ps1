# Pull all Google Apps Script projects from Google
$ErrorActionPreference = "Continue"
$startDir = Get-Location

Write-Host "🔄 Pulling all Apps Script projects from Google..." -ForegroundColor Cyan
Write-Host ""

$projects = Get-ChildItem -Directory | Where-Object { 
  Test-Path (Join-Path $_.FullName ".clasp.json")
}

$successCount = 0
$failCount = 0

foreach ($project in $projects) {
  Write-Host "📥 Pulling: $($project.Name)..." -ForegroundColor Yellow
  
  try {
    Set-Location $project.FullName
    clasp pull 2>&1 | Out-Host
    
    if ($LASTEXITCODE -eq 0) {
      Write-Host "   ✅ Success" -ForegroundColor Green
      $successCount++
    } else {
      Write-Host "   ❌ Failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
      $failCount++
    }
  }
  catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
    $failCount++
  }
  finally {
    Set-Location $startDir
  }
  
  Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Success: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Cyan
