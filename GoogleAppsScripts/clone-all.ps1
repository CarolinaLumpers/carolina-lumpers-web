# Navigate to your workspace
Set-Location "C:\Users\Steve\Desktop\GoogleAppsScripts"

# Define your project list
$projects = @(
    @{ Name = "GContactsFromNewApps"; ID = "1xBKwmZeZD9hiHDDtFysZ6p52R6yudeGFjh6bOVqXA_JcC5b_Pg3C538p" },
    @{ Name = "JobApplication"; ID = "1wZHlRv5RZjd2wqm3peOnjtMbajWEtZWfGysqVyQr-MC8JjgBxPg10WSg" },
    @{ Name = "VendorSync"; ID = "13M5HYsUrxKg_HsHtmcKs1WdUzJWUe3x94oikKEBFJ6LIluQiBuUnwHR8" },
    @{ Name = "EmployeeLogin"; ID = "1NrJAXBCnkcqplsXsX47wWDXc8UWRgLEiUUzhQNzvqxrzpj5gqM0t6rA6" },
    @{ Name = "ClockinFlow"; ID = "1tNVRif29zj-CD-9bhvvfY11_FA8Nm7o5scVjgnGzptxOJ98QjAfmD0h2" },
    @{ Name = "InvoiceProject"; ID = "1CRk3Bb98FDqs0AfT7f09cJGQfjsxWW8PmpGyouPl_KtxhyYqtFYlCGwi" },
    @{ Name = "ContactSync"; ID = "1p8yVnplF6wPzSjlCszweZ-hR-uD_SFJPNHPM4DRfgLmtvTkiJmB4xT2f" },
    @{ Name = "PayrollProject"; ID = "1HIh3zFWYS62IqTxIqJqBs2sK6YqOZEEYP8U-lTFRGlQtjrkq81BF5Dv8" }
)

# Loop through and clone each project
foreach ($p in $projects) {
    $folder = $p.Name
    $id = $p.ID

    Write-Host "Cloning $folder..."
    if (-not (Test-Path $folder)) {
        mkdir $folder | Out-Null
    }
    Set-Location $folder
    clasp clone $id
    Set-Location ..
}

Write-Host "✅ All projects cloned successfully into C:\Users\Steve\Desktop\GoogleAppsScripts"
