# setup_task_scheduler.ps1
# Run this ONCE as Administrator to register a Windows Task Scheduler job.
# The monitor will run every 3 hours automatically, even when the window is minimised.
#
# To run: right-click → "Run as administrator"

$TaskName   = "JarvisIGMonitor"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RunScript  = Join-Path $ScriptDir "run_local.ps1"

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Please run this script as Administrator (right-click → Run as administrator)."
    exit 1
}

if (-not (Test-Path $RunScript)) {
    Write-Error "run_local.ps1 not found at: $RunScript"
    exit 1
}

# Remove old task if it exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Action: run PowerShell hidden (no window flash)
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$RunScript`""

# Trigger: every 3 hours starting now
$Trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 3) -Once -At (Get-Date)

# Settings: run whether logged on or not, wake machine, restart on failure
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 3) `
    -RestartCount 1 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -WakeToRun

# Principal: run as current user
$Principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType S4U `
    -RunLevel Highest

$Task = Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $Action `
    -Trigger   $Trigger `
    -Settings  $Settings `
    -Principal $Principal `
    -Description "Jarvis Instagram story monitor — runs every 3 hours from residential IP"

if ($Task) {
    Write-Host ""
    Write-Host "✓ Task '$TaskName' registered successfully!" -ForegroundColor Green
    Write-Host "  Schedule : every 3 hours" -ForegroundColor Cyan
    Write-Host "  Script   : $RunScript" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To run immediately: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
    Write-Host "To view logs      : $ScriptDir\local_monitor.log" -ForegroundColor Yellow
    Write-Host "To remove task    : Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
} else {
    Write-Error "Failed to register task."
}
