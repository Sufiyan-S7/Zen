// Block F, Step 26 fixtures for apps/desktop/src/main/powershell-control.js -- the off-by-
// default toggle, typed-acknowledgment enable, fail-closed sensitive-command classifier, and
// secret redaction. Mirrors check-permissions.js's convention: real temp userData sandbox, real
// filesystem, no mocks. runPowerShellCommand IS exercised here with a real, harmless command
// (Write-Output) -- deterministic, no side effects outside this process, same "real spawn"
// convention already used by check-app-automation.js for find-process.ps1.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  configurePowerShellControl, isPowerShellEnabled, powerShellToggleStatus,
  enablePowerShell, disablePowerShell, classifyPowerShellCommand, redactCommandForAudit,
  runPowerShellCommand, REQUIRED_ACKNOWLEDGMENT
} = require('../apps/desktop/src/main/powershell-control');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-powershell-control-'));
try {
  configurePowerShellControl(sandbox);

  // Off by default -- a fresh userData folder (fresh clone, fresh install, or a just-restored
  // backup) must never start enabled. This is the whole point of the toggle: docs/ZenV2Plan.md's
  // "never inherited from a config file, preset, or installer default."
  assert.equal(isPowerShellEnabled(), false, 'PowerShell control must be off by default on a fresh install');
  const initialStatus = powerShellToggleStatus();
  assert.equal(initialStatus.enabled, false);
  assert.equal(initialStatus.enabledAt, null);
  assert.equal(typeof initialStatus.requiredAcknowledgment, 'string');
  assert.ok(initialStatus.requiredAcknowledgment.length > 0);

  // enablePowerShell: typed acknowledgment must match exactly (trimmed), not a loose/partial check.
  for (const bad of ['', '   ', 'i understand the risk', REQUIRED_ACKNOWLEDGMENT.toUpperCase(), REQUIRED_ACKNOWLEDGMENT.slice(0, -1), null, undefined, 42]) {
    assert.throws(() => enablePowerShell(bad), new RegExp(`Type "${REQUIRED_ACKNOWLEDGMENT}" exactly`));
  }
  assert.equal(isPowerShellEnabled(), false, 'a rejected acknowledgment must never enable the toggle');

  const enabled = enablePowerShell(`  ${REQUIRED_ACKNOWLEDGMENT}  `);
  assert.equal(enabled.enabled, true);
  assert.equal(typeof enabled.enabledAt, 'string');
  assert.equal(isPowerShellEnabled(), true);

  // Restart persistence: a fresh configurePowerShellControl() call against the same userData
  // path (simulating an app restart) must read back the enabled state, not reset to default.
  configurePowerShellControl(sandbox);
  assert.equal(isPowerShellEnabled(), true, 'the enabled toggle must survive a simulated restart');

  // disablePowerShell: clears both fields, also persists.
  const disabled = disablePowerShell();
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.enabledAt, null);
  assert.equal(isPowerShellEnabled(), false);
  configurePowerShellControl(sandbox);
  assert.equal(isPowerShellEnabled(), false, 'the disabled toggle must also survive a simulated restart');

  // A second, independent userData folder must default off too -- confirms the toggle is never
  // shared/inherited across installs.
  const secondSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-powershell-control-2-'));
  configurePowerShellControl(secondSandbox);
  assert.equal(isPowerShellEnabled(), false);
  fs.rmSync(secondSandbox, { recursive: true, force: true });
  configurePowerShellControl(sandbox);

  // classifyPowerShellCommand: fail-closed sensitive trigger list (AgentContract.md Section 2 --
  // delete/format/uninstall/registry-write/kill-process/execution-policy/disk commands).
  const sensitiveCommands = [
    'Remove-Item C:\\temp\\file.txt', 'rmdir C:\\temp\\old', 'del file.txt', 'erase file.txt',
    'Clear-Content C:\\temp\\log.txt', 'Format-Volume -DriveLetter D', 'diskpart', 'Clear-Disk -Number 1',
    'Initialize-Disk -Number 2', 'Clear-RecycleBin -Confirm:$false',
    'Uninstall-Package Foo', 'Uninstall-Module Foo', 'msiexec /x {GUID}', 'winget uninstall Foo',
    'Set-ItemProperty -Path HKLM:\\Software\\Foo -Name Bar -Value 1',
    'New-ItemProperty -Path HKCU:\\Software\\Foo', 'Remove-ItemProperty -Path HKLM:\\Software\\Foo',
    'Remove-Item HKCU:\\Software\\Foo', 'reg delete HKCU\\Software\\Foo', 'reg add HKLM\\Software\\Foo',
    'Stop-Process -Name notepad', 'taskkill /IM notepad.exe /F', 'kill 1234',
    'Set-ExecutionPolicy Unrestricted -Scope CurrentUser'
  ];
  for (const command of sensitiveCommands) {
    assert.equal(classifyPowerShellCommand(command).sensitive, true, `"${command}" must classify sensitive`);
  }
  const routineCommands = [
    'Get-Process', 'Get-ChildItem C:\\Users', 'Write-Output "hello"', 'Get-Content C:\\notes.txt',
    'Get-Date', 'Test-Path C:\\Users', '$env:USERNAME'
  ];
  for (const command of routineCommands) {
    assert.equal(classifyPowerShellCommand(command).sensitive, false, `"${command}" must classify routine`);
  }
  assert.equal(classifyPowerShellCommand('').sensitive, false);
  assert.equal(classifyPowerShellCommand(null).sensitive, false, 'a non-string command must never throw');

  // redactCommandForAudit: secrets/credentials never reach the audit log; everything else
  // passes through unchanged (over-redacting costs nothing; under-redacting is the real risk).
  assert.match(redactCommandForAudit('password: hunter2hunter2'), /password:\s*\[redacted\]/);
  assert.match(redactCommandForAudit('$env:apikey = "sk-abcdef123456"'), /\[redacted\]/);
  assert.match(redactCommandForAudit('ConvertTo-SecureString "mySecretValue" -AsPlainText -Force'), /ConvertTo-SecureString\s+\[redacted\]/);
  assert.match(redactCommandForAudit('Authorization: Bearer abc123.def456'), /Bearer\s+\[redacted\]/);
  assert.equal(redactCommandForAudit('Get-Process explorer'), 'Get-Process explorer', 'a command with no secret shape must pass through unchanged');
  assert.equal(redactCommandForAudit(null), '');

  // runPowerShellCommand: a real spawn of a real, harmless, deterministic command -- confirms
  // the actual process-execution path (argv-array spawn, no shell:true, output capture) works,
  // not just its call signature.
  const result = await runPowerShellCommand("Write-Output 'zen-check-ok'");
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /zen-check-ok/);

  console.log('PowerShell-control checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
