# Deploy PillSafe hardware/ to the Pi without overwriting live config.yaml.
# Usage (PowerShell, from repo root):
#   .\hardware\scripts\deploy_to_pi.ps1 -PiHost 172.20.10.4
# Optional: -PiUser boison08

param(
    [Parameter(Mandatory = $true)]
    [string]$PiHost,
    [string]$PiUser = "boison08",
    [string]$RemoteHub = "/home/boison08/Documents/pillSafe_projectupdated/hardware"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$LocalHardware = Join-Path $RepoRoot "hardware"

Write-Host "Local:  $LocalHardware"
Write-Host "Remote: ${PiUser}@${PiHost}:${RemoteHub}"

# Sync everything except config.yaml and local data/logs/db (preserve Pi state)
$exclude = @(
    "config.yaml",
    "data\pillsafe.db",
    "data\pillsafe.log",
    "data\pillsafe_stdout.log",
    "data\pillsafe_stderr.log",
    "data\*.bak*",
    "__pycache__",
    "*.pyc"
)

$staging = Join-Path $env:TEMP ("pillsafe_deploy_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $staging | Out-Null
try {
    robocopy $LocalHardware $staging /E /XD __pycache__ .git data /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    # Keep data/models if present locally
    if (Test-Path (Join-Path $LocalHardware "data\models")) {
        New-Item -ItemType Directory -Force -Path (Join-Path $staging "data\models") | Out-Null
        Copy-Item -Recurse -Force (Join-Path $LocalHardware "data\models\*") (Join-Path $staging "data\models\")
    }
    # Explicitly never ship config.yaml from PC
    Remove-Item -Force (Join-Path $staging "config.yaml") -ErrorAction SilentlyContinue

    Write-Host "Uploading (config.yaml excluded)..."
    scp -r "$staging\*" "${PiUser}@${PiHost}:${RemoteHub}/"

    Write-Host "Running remote install script..."
    ssh "${PiUser}@${PiHost}" "chmod +x $RemoteHub/scripts/install_pillsafe_service.sh && bash $RemoteHub/scripts/install_pillsafe_service.sh"
}
finally {
    Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}

Write-Host "Deploy finished."
