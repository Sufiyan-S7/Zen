# Block F, Step 25: click a named control in an approved app's top-level window.
# Fixed script -- ControlName is the only per-call value, always passed as a script parameter
# (never interpolated into script text), and app-automation.js has already confirmed the app
# is on the owner's approved-apps list before this ever runs. No coordinate-based/blind
# clicking: if the control can't be found or invoked, this fails closed with a clear reason
# rather than guessing at screen coordinates.
param(
  [Parameter(Mandatory=$true)][int]$ProcessId,
  [Parameter(Mandatory=$true)][string]$ControlName
)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $procCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $ProcessId)
  $win = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $procCond)
  if (-not $win) {
    Write-Output (@{ ok = $false; error = 'window-not-found' } | ConvertTo-Json -Compress)
    exit 0
  }

  $nameCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty, $ControlName)
  $target = $win.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $nameCond)
  if (-not $target) {
    Write-Output (@{ ok = $false; error = 'control-not-found' } | ConvertTo-Json -Compress)
    exit 0
  }

  $pattern = $null
  if ($target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
    $pattern.Invoke()
    Write-Output (@{ ok = $true; method = 'Invoke' } | ConvertTo-Json -Compress)
    exit 0
  }
  if ($target.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) {
    $pattern.Toggle()
    Write-Output (@{ ok = $true; method = 'Toggle' } | ConvertTo-Json -Compress)
    exit 0
  }
  if ($target.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$pattern)) {
    $pattern.Select()
    Write-Output (@{ ok = $true; method = 'Select' } | ConvertTo-Json -Compress)
    exit 0
  }
  if ($target.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$pattern)) {
    $pattern.Expand()
    Write-Output (@{ ok = $true; method = 'Expand' } | ConvertTo-Json -Compress)
    exit 0
  }
  Write-Output (@{ ok = $false; error = 'not-invokable' } | ConvertTo-Json -Compress)
} catch {
  Write-Output (@{ ok = $false; error = 'exception'; message = $_.Exception.Message } | ConvertTo-Json -Compress)
}
