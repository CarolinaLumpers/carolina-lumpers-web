# CLS Employee System - Cache Busting Update Script
# This script automatically updates cache busting parameters in HTML files

param(
    [string]$Strategy = "date",  # Options: "date", "timestamp", "hash", "custom"
    [string]$CustomVersion = "", # Custom version string
    [switch]$DevOnly = $false,   # Update only dev files
    [switch]$ProdOnly = $false,  # Update only production files
    [switch]$DryRun = $false,    # Show what would be changed without making changes
    [switch]$Verbose = $false    # Show detailed output
)

# Set working directory to script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Define file patterns
$ProdFiles = @(
    "employeeSignup.html",
    "employeelogin.html", 
    "employeeDashboard.html",
    "index.html"
)

$DevFiles = @(
    "employeeSignup-dev.html"
    # Note: Other dev files don't currently exist
    # "employeelogin-dev.html", 
    # "employeeDashboard-dev.html"
)

# Generate version string based on strategy
function Get-CacheVersion {
    param([string]$Strategy, [string]$Custom)
    
    switch ($Strategy.ToLower()) {
        "date" { 
            return Get-Date -Format "yyyy-MM-dd"
        }
        "timestamp" {
            return [int](Get-Date -UFormat %s)
        }
        "hash" {
            $timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm"
            $hash = [System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($timestamp))
            return [System.BitConverter]::ToString($hash).Replace("-", "").Substring(0, 8).ToLower()
        }
        "custom" {
            if ([string]::IsNullOrEmpty($Custom)) {
                throw "Custom version string required when using 'custom' strategy"
            }
            return $Custom
        }
        default {
            return Get-Date -Format "yyyy-MM-dd"
        }
    }
}

# Update cache busting in a file
function Update-CacheBusting {
    param(
        [string]$FilePath,
        [string]$Version,
        [bool]$IsDev = $false
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning "File not found: $FilePath"
        return
    }
    
    $content = Get-Content $FilePath -Raw
    $originalContent = $content
    $changes = 0
    
    # Determine version suffix
    $versionSuffix = if ($IsDev) { "$Version-dev" } else { $Version }
    
    # Update CSS files
    $cssPattern = '(href="css/[^"]+\.css)\?v=[^"]*(")'
    $cssReplacement = "`$1?v=$versionSuffix`$2"
    $content = $content -replace $cssPattern, $cssReplacement
    if ($content -ne $originalContent) { $changes++ }
    
    # Update JS files  
    $jsPattern = '(src="js/[^"]+\.js)\?v=[^"]*(")'
    $jsReplacement = "`$1?v=$versionSuffix`$2"
    $content = $content -replace $jsPattern, $jsReplacement
    if ($content -ne $originalContent) { $changes++ }
    
    # Handle files without existing version parameters
    # Add version to CSS files that don't have it
    $cssNoVersionPattern = '(href="css/[^"]+\.css)("(?!\?v=))'
    $cssNoVersionReplacement = "`$1?v=$versionSuffix`$2"
    $content = $content -replace $cssNoVersionPattern, $cssNoVersionReplacement
    
    # Add version to JS files that don't have it
    $jsNoVersionPattern = '(src="js/[^"]+\.js)("(?!\?v=))'
    $jsNoVersionReplacement = "`$1?v=$versionSuffix`$2"
    $content = $content -replace $jsNoVersionPattern, $jsNoVersionReplacement
    
    if ($DryRun) {
        if ($content -ne $originalContent) {
            Write-Host "Would update: $FilePath" -ForegroundColor Yellow
            if ($Verbose) {
                Write-Host "  Version: $versionSuffix" -ForegroundColor Gray
            }
        }
    } else {
        if ($content -ne $originalContent) {
            Set-Content $FilePath $content -NoNewline
            Write-Host "Updated: $FilePath" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "  Version: $versionSuffix" -ForegroundColor Gray
            }
        } else {
            Write-Host "No changes: $FilePath" -ForegroundColor Gray
        }
    }
}

# Main execution
try {
    Write-Host "=== CLS Cache Busting Update Script ===" -ForegroundColor Cyan
    Write-Host "Strategy: $Strategy" -ForegroundColor Cyan
    
    # Generate version
    $version = Get-CacheVersion -Strategy $Strategy -Custom $CustomVersion
    Write-Host "Version: $version" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Determine which files to process
    $filesToProcess = @()
    
    if (-not $DevOnly) {
        $filesToProcess += $ProdFiles | ForEach-Object { @{ Path = $_; IsDev = $false } }
    }
    
    if (-not $ProdOnly) {
        $filesToProcess += $DevFiles | ForEach-Object { @{ Path = $_; IsDev = $true } }
    }
    
    # Process files
    foreach ($file in $filesToProcess) {
        Update-CacheBusting -FilePath $file.Path -Version $version -IsDev $file.IsDev
    }
    
    Write-Host ""
    Write-Host "Cache busting update completed!" -ForegroundColor Green
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Test the updated pages in your browser" -ForegroundColor White
        Write-Host "2. Commit and push changes to repository" -ForegroundColor White
        Write-Host "3. Deploy to production if everything looks good" -ForegroundColor White
    }
    
} catch {
    Write-Error "Script failed: $($_.Exception.Message)"
    exit 1
}