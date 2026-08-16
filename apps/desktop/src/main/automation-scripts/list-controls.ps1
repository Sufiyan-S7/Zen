# Block F, Step 25: list every automatable control in an approved app's top-level window.
# Fixed script, checked into the repo -- app-automation.js only ever passes a ProcessId here,
# never builds or interpolates script text per call. Read-only: no click, no type, no side
# effects, so this is safe to run purely to give the person/model a clear picture of what's
# clickable/typeable, and to power a clear "control not found" error instead of blind automation.
param(
  [Parameter(Mandatory=$true)][int]$ProcessId
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
  $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  $results = @()
  foreach ($c in $all) {
    $name = $c.Current.Name
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $results += [PSCustomObject]@{
      name = $name
      controlType = $c.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''
      isEnabled = [bool]$c.Current.IsEnabled
    }
  }
  Write-Output (@{ ok = $true; controls = $results } | ConvertTo-Json -Compress -Depth 4)
} catch {
  Write-Output (@{ ok = $false; error = 'exception'; message = $_.Exception.Message } | ConvertTo-Json -Compress)
}
