Get-ChildItem -Directory | ForEach-Object {
  Set-Location $_.FullName
  Write-Host "Pulling latest for $($_.Name)..."
  clasp pull
  Set-Location ..
}
Write-Host "✅ All projects updated from Google."
