# Move generated quadmaps from Downloads to results folder
# Run this after generating and saving maps

$downloadsPath = "$env:USERPROFILE\Downloads"
$resultsPath = "$PSScriptRoot\results"

# Ensure results folder exists
if (-not (Test-Path $resultsPath)) {
    New-Item -ItemType Directory -Path $resultsPath | Out-Null
    Write-Host "Created results folder: $resultsPath"
}

# Move JSON files
$jsonFiles = Get-ChildItem -Path $downloadsPath -Filter "quadmap_*.json"
if ($jsonFiles.Count -gt 0) {
    foreach ($file in $jsonFiles) {
        Move-Item -Path $file.FullName -Destination $resultsPath -Force
        Write-Host "Moved: $($file.Name)"
    }
    Write-Host "`n✓ Moved $($jsonFiles.Count) JSON file(s) to results folder"
} else {
    Write-Host "No JSON files found in Downloads folder"
}

# Move PNG files
$pngFiles = Get-ChildItem -Path $downloadsPath -Filter "quadmap_*.png"
if ($pngFiles.Count -gt 0) {
    foreach ($file in $pngFiles) {
        Move-Item -Path $file.FullName -Destination $resultsPath -Force
        Write-Host "Moved: $($file.Name)"
    }
    Write-Host "`n✓ Moved $($pngFiles.Count) PNG file(s) to results folder"
} else {
    Write-Host "No PNG files found in Downloads folder"
}

if ($jsonFiles.Count -eq 0 -and $pngFiles.Count -eq 0) {
    Write-Host "`nNo quadmap files found in Downloads folder."
    Write-Host "Generate and save maps first, then run this script."
} else {
    Write-Host "`n✓ All files moved successfully!"
    Write-Host "Results folder: $resultsPath"
}

# Pause so user can see the results
Read-Host -Prompt "`nPress Enter to exit"
