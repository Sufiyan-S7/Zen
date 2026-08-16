// Block F, Step 26: run-powershell -- off-by-default toggle (its own file, never touched by
// backup.js's export/restore -- see docs/PowerShellControl.md for why), a one-time typed
// acknowledgment to turn it on, a fail-closed sensitive-pattern classifier that always
// re-confirms a matching command even with the toggle already on, and redaction of anything
// that looks like an embedded secret before it ever reaches the audit log.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

let togglePath = '';

// This exact phrase is what the owner must type to enable PowerShell execution -- a chosen
// default, not specified by the sprint plan (Step 26 says only "typed acknowledgment to
// enable"). Flagged per INSTRUCTIONS.md Section 5; see HANDOFF.md's Block F entry.
const REQUIRED_ACKNOWLEDGMENT = 'I understand the risk';

function configurePowerShellControl(userDataPath) {
  togglePath = path.join(userDataPath, 'powershell-toggle.json');
}

function readToggle() {
  if (!togglePath) throw new Error('Zen has not prepared local settings yet.');
  try {
    const stored = JSON.parse(fs.readFileSync(togglePath, 'utf8'));
    return { enabled: stored?.enabled === true, enabledAt: typeof stored?.enabledAt === 'string' ? stored.enabledAt : null };
  } catch {
    return { enabled: false, enabledAt: null };
  }
}

function writeToggle(state) {
  const tempPath = `${togglePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempPath, togglePath);
}

function isPowerShellEnabled() { return readToggle().enabled; }
function powerShellToggleStatus() { return { ...readToggle(), requiredAcknowledgment: REQUIRED_ACKNOWLEDGMENT }; }

function enablePowerShell(typedAcknowledgment) {
  if (typeof typedAcknowledgment !== 'string' || typedAcknowledgment.trim() !== REQUIRED_ACKNOWLEDGMENT) {
    throw new Error(`Type "${REQUIRED_ACKNOWLEDGMENT}" exactly to enable Full System Control (PowerShell).`);
  }
  const state = { enabled: true, enabledAt: new Date().toISOString() };
  writeToggle(state);
  return state;
}

function disablePowerShell() {
  const state = { enabled: false, enabledAt: null };
  writeToggle(state);
  return state;
}

// Fail-closed sensitive-pattern classifier -- Section 2's fixed trigger list: delete/format/
// uninstall/registry-write/kill-process/execution-policy/disk commands. Matches liberally
// (keyword/cmdlet-name patterns) rather than fully parsing PowerShell, since an under-match
// here is the unsafe direction -- an ambiguous command must classify sensitive, never routine,
// per AgentContract.md Section 2's "fail-closed classification on ambiguous commands."
const SENSITIVE_COMMAND_PATTERN = new RegExp(
  '(' + [
    'remove-item', '\\brmdir\\b', '\\brd\\s', '\\bdel\\s', '\\berase\\s', 'clear-content',
    'format-volume', 'diskpart', 'clear-disk', 'initialize-disk', 'clear-recyclebin',
    'uninstall-package', 'uninstall-module', 'msiexec[^\\n]*\\/x', 'winget\\s+uninstall',
    'set-itemproperty[^\\n]*hk(lm|cu)', 'new-itemproperty[^\\n]*hk(lm|cu)', 'remove-itemproperty[^\\n]*hk(lm|cu)',
    'remove-item[^\\n]*hk(lm|cu):', '\\breg\\s+(delete|add)\\b',
    'stop-process', '\\bkill\\s', '\\btaskkill\\b',
    'set-executionpolicy'
  ].join('|') + ')',
  'i'
);

function classifyPowerShellCommand(command) {
  return { sensitive: SENSITIVE_COMMAND_PATTERN.test(typeof command === 'string' ? command : '') };
}

// Secret/credential redaction for the audit log -- Section 4 "never raw secrets/credentials."
// Matches liberally in the safe direction: over-redacting a false positive costs nothing to the
// audit trail's usefulness; under-redacting a real secret is the failure this exists to prevent.
const SECRET_VALUE_PATTERN = /((?:password|passwd|pwd|secret|apikey|api_key|token|-credential)\s*[:=]\s*)(\S+)/gi;
const SECURE_STRING_PATTERN = /(ConvertTo-SecureString\s+)(['"][^'"]*['"]|\S+)/gi;
const BEARER_PATTERN = /(Authorization\s*[:=]\s*['"]?Bearer\s+)(\S+)/gi;

function redactCommandForAudit(command) {
  if (typeof command !== 'string') return '';
  return command
    .replace(SECRET_VALUE_PATTERN, '$1[redacted]')
    .replace(SECURE_STRING_PATTERN, '$1[redacted]')
    .replace(BEARER_PATTERN, '$1[redacted]');
}

const RUN_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 8_000;

// Spawn as a single argv element (no shell:true, no string concatenation into a shell line) --
// the same safe pattern already used by every other spawn in this codebase (open-app,
// whisper/piper, app-automation.js). run-powershell is the one action in the registry
// permitted to carry a free-text command at all -- AgentContract.md Section 2's explicit
// PowerShell resolution ("a full PowerShell action type is included... typed confirmation to
// enable, fail-closed classification"); every other action keeps typed, schema-constrained
// input only, per Section 7's general registry contract.
function runPowerShellCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('The PowerShell command timed out after 30s.')); }, RUN_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: stdout.length > MAX_OUTPUT_CHARS ? `${stdout.slice(0, MAX_OUTPUT_CHARS)}\n…(truncated)` : stdout,
        stderr: stderr.length > MAX_OUTPUT_CHARS ? `${stderr.slice(0, MAX_OUTPUT_CHARS)}\n…(truncated)` : stderr
      });
    });
  });
}

module.exports = {
  configurePowerShellControl, isPowerShellEnabled, powerShellToggleStatus,
  enablePowerShell, disablePowerShell, classifyPowerShellCommand, redactCommandForAudit,
  runPowerShellCommand, REQUIRED_ACKNOWLEDGMENT
};
