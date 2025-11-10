# Push all Google Apps Script projects to Google
# Usage: .\push-all.ps1 (run from GoogleAppsScripts/ directory)

$ErrorActionPreference = "Continue"
$originalLocation = Get-Location
$successCount = 0
$failureCount = 0
$totalFiles = 0

Write-Host "`n🚀 Pushing all Apps Script projects to Google..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

try {
    Get-ChildItem -Directory | ForEach-Object {
        $projectName = $_.Name
        $projectPath = $_.FullName
        
        # Check if this is an Apps Script project
        if (-not (Test-Path "$projectPath\.clasp.json")) {
            Write-Host "⏭️  Skipping $projectName (not an Apps Script project)" -ForegroundColor Yellow
            return
        }
        
        Write-Host "`n📤 Pushing: $projectName" -ForegroundColor White
        Write-Host "   Path: $projectPath" -ForegroundColor Gray
        
        Set-Location $projectPath
        
        # Run clasp push and capture output
        $output = clasp push 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host "   ✅ SUCCESS" -ForegroundColor Green
            
            # Count pushed files from output
            $fileCount = ($output | Select-String "└─" | Measure-Object).Count
            if ($fileCount -gt 0) {
                Write-Host "   📄 Files pushed: $fileCount" -ForegroundColor Gray
                $totalFiles += $fileCount
            }
            
            $successCount++
        } else {
            Write-Host "   ❌ FAILED" -ForegroundColor Red
            Write-Host "   Error: $output" -ForegroundColor Red
            $failureCount++
        }
        
        Set-Location $originalLocation
    }
    
    # Summary
    Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
    Write-Host "`n📊 Push Summary:" -ForegroundColor Cyan
    Write-Host "   ✅ Successful: $successCount projects" -ForegroundColor Green
    Write-Host "   ❌ Failed: $failureCount projects" -ForegroundColor Red
    Write-Host "   📄 Total files pushed: $totalFiles" -ForegroundColor Gray
    
    if ($failureCount -eq 0) {
        Write-Host "`n🎉 All projects pushed successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n⚠️  Some projects failed to push. Check errors above." -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host "`n❌ Script error: $_" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
} finally {
    Set-Location $originalLocation
}
