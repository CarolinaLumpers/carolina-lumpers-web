Get-ChildItem -Directory | ForEach-Object {
  Set-Location $_.FullName
  Write-Host "Pushing local changes for $($_.Name)..."
  clasp push
  Set-Location ..
}
Write-Host "✅ All local changes pushed to Google."
