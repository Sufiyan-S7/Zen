# Block F, Step 25: type text into a named editable control in an approved app's top-level
# window. Fixed script -- ControlName/Text are always passed as script parameters, never
# interpolated into script text; app-automation.js has already confirmed the app is on the
# owner's approved-apps list before this ever runs.
#
# Deliberately ValuePattern-only, no SendKeys/keystroke-injection fallback: SendKeys types
# blind into whatever currently has focus and cannot verify it landed in the intended control,
# and its special-character escaping is a known source of typing the wrong thing. If a control
# does not support ValuePattern, this fails closed with 'not-editable' rather than guessing via
# simulated keystrokes -- matching click-control.ps1's own no-blind-automation principle.
param(
  [Parameter(Mandatory=$true)][int]$ProcessId,
  [Parameter(Mandatory=$true)][string]$ControlName,
  [Parameter(Mandatory=$true)][string]$Text
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
  if ($target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
    if ($pattern.Current.IsReadOnly) {
      Write-Output (@{ ok = $false; error = 'not-editable' } | ConvertTo-Json -Compress)
      exit 0
    }
    try { $target.SetFocus() } catch { }
    $pattern.SetValue($Text)
    Write-Output (@{ ok = $true; method = 'ValuePattern' } | ConvertTo-Json -Compress)
    exit 0
  }
  Write-Output (@{ ok = $false; error = 'not-editable' } | ConvertTo-Json -Compress)
} catch {
  Write-Output (@{ ok = $false; error = 'exception'; message = $_.Exception.Message } | ConvertTo-Json -Compress)
}
