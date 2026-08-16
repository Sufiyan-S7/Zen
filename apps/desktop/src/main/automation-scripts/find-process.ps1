# Block F, Step 25: resolve an approved app's executable path to a running process's Id.
# Fixed script, checked into the repo -- app-automation.js only ever passes an already-verified
# ExecutablePath from computer-control.js's approvedApp() here, never arbitrary/unvalidated
# input. Read-only: does not launch anything. If the app is not currently running, this reports
# that plainly (ok:false) rather than starting it as a side effect of a click/type action.
param(
  [Parameter(Mandatory=$true)][string]$ExecutablePath
)
$ErrorActionPreference = 'Stop'
try {
  $proc = Get-Process | Where-Object {
    try { $_.Path -and ($_.Path -ieq $ExecutablePath) } catch { $false }
  } | Select-Object -First 1
  if (-not $proc) {
    Write-Output (@{ ok = $false; error = 'not-running' } | ConvertTo-Json -Compress)
    exit 0
  }
  Write-Output (@{ ok = $true; processId = $proc.Id } | ConvertTo-Json -Compress)
} catch {
  Write-Output (@{ ok = $false; error = 'exception'; message = $_.Exception.Message } | ConvertTo-Json -Compress)
}
