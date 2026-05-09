# run_local.ps1
# Runs instagram_story_monitor.py with secrets loaded from .env
# Usage: right-click → Run with PowerShell, OR scheduled via Task Scheduler.

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile   = Join-Path $ScriptDir ".env"
$PyScript  = Join-Path $ScriptDir "instagram_story_monitor.py"
$LogFile   = Join-Path $ScriptDir "local_monitor.log"

# ── Load .env ────────────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
    Write-Error ".env file not found at $EnvFile`nCopy .env.example to .env and fill in your secrets."
    exit 1
}

$env_vars = @{}
Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#]\S+=\S' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim()
    $env_vars[$key] = $value
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
}

# ── Find Python ──────────────────────────────────────────────
$python = $null
foreach ($candidate in @("python", "python3", "py")) {
    try {
        $ver = & $candidate --version 2>&1
        if ($ver -match "Python 3") { $python = $candidate; break }
    } catch {}
}

if (-not $python) {
    Write-Error "Python 3 not found. Install from https://python.org"
    exit 1
}

# ── Install / upgrade dependencies ───────────────────────────
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Checking dependencies..." -ForegroundColor Cyan
& $python -m pip install -q -r (Join-Path $ScriptDir "requirements.txt") --upgrade

# ── Run monitor ──────────────────────────────────────────────
Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Starting monitor..." -ForegroundColor Cyan
& $python $PyScript 2>&1 | Tee-Object -FilePath $LogFile -Append

$exit_code = $LASTEXITCODE
if ($exit_code -eq 2) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') SESSION EXPIRED — regenerate SESSION_B64 in .env" -ForegroundColor Red
} elseif ($exit_code -ne 0) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Monitor exited with code $exit_code" -ForegroundColor Yellow
} else {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Run complete." -ForegroundColor Green
}

exit $exit_code
