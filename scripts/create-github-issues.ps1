[CmdletBinding()]
param(
    [string]$Owner = "blackbeatbeast",
    [string]$Repo = "RPG-neverlight",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI is required. Install it and run 'gh auth login'."
}
& gh auth status
if ($LASTEXITCODE -ne 0) { throw "Run: gh auth login" }

$fullName = "$Owner/$Repo"
$existing = @()
if (-not $Force) {
    $json = & gh issue list --repo $fullName --state all --limit 200 --json title
    if ($LASTEXITCODE -ne 0) { throw "Could not list issues in $fullName." }
    $existing = @($json | ConvertFrom-Json | ForEach-Object { $_.title })
}

$files = Get-ChildItem backlog -File | Where-Object { $_.Name -match '^\d{3}-.+\.md$' } | Sort-Object Name
foreach ($file in $files) {
    $firstLine = Get-Content $file.FullName -TotalCount 1
    $title = $firstLine -replace '^#\s+', ''
    if ((-not $Force) -and ($existing -contains $title)) {
        Write-Host "Skip existing: $title"
        continue
    }
    & gh issue create --repo $fullName --title $title --body-file $file.FullName
    if ($LASTEXITCODE -ne 0) { throw "Failed creating issue: $title" }
}
Write-Host "Backlog issue creation complete for $fullName." -ForegroundColor Green
