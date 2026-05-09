# setup_task_scheduler.ps1
# Run from an elevated PowerShell prompt to register the scheduled task.

$TaskName  = "JarvisIGMonitor"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunScript = Join-Path $ScriptDir "run_local.ps1"

if (-not (Test-Path $RunScript)) {
    Write-Host "ERROR: run_local.ps1 not found at $RunScript" -ForegroundColor Red
    exit 1
}

# Remove existing task silently
schtasks /delete /tn $TaskName /f 2>$null | Out-Null

# Start time = 1 minute from now
$startTime = (Get-Date).AddMinutes(1).ToString("HH:mm")

$psArgs = "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$RunScript`""

# Register: every 3 hours, run as current user with highest privileges
schtasks /create `
    /tn  $TaskName `
    /tr  "powershell.exe $psArgs" `
    /sc  hourly `
    /mo  3 `
    /st  $startTime `
    /rl  highest `
    /f

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Task '$TaskName' registered — runs every 3 hours." -ForegroundColor Green
    Write-Host "Script : $RunScript" -ForegroundColor Cyan
    Write-Host "Log    : $ScriptDir\local_monitor.log" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To run immediately:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
} else {
    Write-Host "Failed to register task. Try running as Administrator." -ForegroundColor Red
}
