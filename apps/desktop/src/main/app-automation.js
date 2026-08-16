// Block F, Step 25: click-control / type-into-field registry actions, backed by an
// accessibility-first automation layer -- UI Automation via the fixed, checked-in PowerShell
// scripts in automation-scripts/. No coordinate-based/blind clicking or SendKeys: every script
// fails closed with a clear reason (window-not-found / control-not-found / not-invokable /
// not-editable) rather than guessing. Every call is scoped to an app already on the owner's
// approved-apps list (computer-control.js's approvedApp) -- this layer never automates an
// arbitrary, unapproved executable, and never launches the app itself as a side effect (it must
// already be running).
const { spawn } = require('node:child_process');
const path = require('node:path');
const { approvedApp } = require('./computer-control');

const SCRIPTS_DIR = path.join(__dirname, 'automation-scripts');
const FIND_PROCESS_SCRIPT = path.join(SCRIPTS_DIR, 'find-process.ps1');
const LIST_CONTROLS_SCRIPT = path.join(SCRIPTS_DIR, 'list-controls.ps1');
const CLICK_CONTROL_SCRIPT = path.join(SCRIPTS_DIR, 'click-control.ps1');
const TYPE_INTO_FIELD_SCRIPT = path.join(SCRIPTS_DIR, 'type-into-field.ps1');
const SCRIPT_TIMEOUT_MS = 10_000;

// Runs one of the fixed, checked-in scripts above with typed -Param arguments only -- never a
// string built from user input and concatenated into script text. Matches how every other
// spawn in this codebase (open-app, whisper/piper) passes arguments as an array, not a shell
// line, and never sets shell:true.
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('The automation script timed out.')); }, SCRIPT_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) { reject(new Error(stderr.trim() || `The automation script exited with code ${code}.`)); return; }
      try { resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error('The automation script returned an unexpected result.')); }
    });
  });
}

function requireControlName(controlName) {
  if (typeof controlName !== 'string' || !controlName.trim() || controlName.length > 200) {
    throw new Error('A control name is required.');
  }
  return controlName.trim();
}

// Resolves an approved app to its running window's ProcessId. Zen does not launch the app as
// part of this action -- if it is not already running, this fails closed with a clear reason
// rather than starting it silently as a side effect of a click/type action.
async function resolveApprovedAppProcess(appId) {
  const entry = approvedApp(appId);
  const result = await runScript(FIND_PROCESS_SCRIPT, ['-ExecutablePath', entry.executable]);
  if (!result.ok) throw new Error(`${entry.label} does not appear to be running. Open it first, then try again.`);
  return { processId: result.processId, label: entry.label };
}

async function listControls(appId) {
  const { processId, label } = await resolveApprovedAppProcess(appId);
  const result = await runScript(LIST_CONTROLS_SCRIPT, ['-ProcessId', String(processId)]);
  if (!result.ok) throw new Error(`Zen could not read ${label}'s controls (${result.error}).`);
  return { label, controls: result.controls };
}

const CONTROL_ERROR_MESSAGES = {
  'window-not-found': 'does not appear to be running',
  'control-not-found': 'does not have a control named',
  'not-invokable': 'has a control that cannot be clicked',
  'not-editable': 'has a control that cannot accept typed text',
  exception: 'ran into an automation error on'
};

async function clickControl(appId, controlName) {
  const name = requireControlName(controlName);
  const { processId, label } = await resolveApprovedAppProcess(appId);
  const result = await runScript(CLICK_CONTROL_SCRIPT, ['-ProcessId', String(processId), '-ControlName', name]);
  if (!result.ok) throw new Error(`Zen ${CONTROL_ERROR_MESSAGES[result.error] || 'could not click a control on'} ${label}${result.error === 'control-not-found' ? ` "${name}"` : ''}.`);
  return { label, controlName: name, method: result.method };
}

async function typeIntoField(appId, controlName, text) {
  const name = requireControlName(controlName);
  if (typeof text !== 'string' || text.length > 4000) throw new Error('Text to type must be under 4,000 characters.');
  const { processId, label } = await resolveApprovedAppProcess(appId);
  const result = await runScript(TYPE_INTO_FIELD_SCRIPT, ['-ProcessId', String(processId), '-ControlName', name, '-Text', text]);
  if (!result.ok) throw new Error(`Zen ${CONTROL_ERROR_MESSAGES[result.error] || 'could not type into a field on'} ${label}${result.error === 'control-not-found' ? ` "${name}"` : ''}.`);
  return { label, controlName: name, characterCount: text.length };
}

// Block F, Step 25's flagged gap close (docs/AgentContract.md Section 7): click-control has no
// fixed sensitive effect (unlike delete-file), but a specific instance can hit one -- a
// "Delete"/"Send"/"Buy now" control -- the same runtime-pattern problem run-powershell solves
// via its own trigger-pattern classifier (powershell-control.js). Keyword groups map directly
// to AgentContract.md Section 2's fixed sensitive categories (delete/overwrite, send/publish/
// upload, install, purchase, account/security) rather than inventing a new category.
//
// THIS DEFAULT KEYWORD LIST IS A JUDGMENT CALL, not specified by the sprint plan -- flagged per
// INSTRUCTIONS.md Section 5, see HANDOFF.md's Block F entry. AgentContract.md Section 7 itself
// says "owner to confirm this is the right interim default before Step 25 lands"; proceeding
// with this default per the owner's explicit "continue, make the calls, flag them" instruction
// rather than blocking on it.
const SENSITIVE_CONTROL_NAME_PATTERN = new RegExp(
  '\\b(' + [
    'delete', 'remove', 'erase', 'discard', 'uninstall', 'format', 'empty\\s*trash', 'clear\\s*all',
    'send', 'submit', 'post', 'publish', 'share', 'upload', 'reply\\s*all', 'tweet',
    'buy', 'purchase', 'pay', 'checkout', 'order\\s*now', 'subscribe', 'renew',
    'deactivate', 'close\\s*account', 'delete\\s*account', 'change\\s*password', 'disable\\s*2fa',
    'install'
  ].join('|') + ')\\b',
  'i'
);

function isControlNameSensitive(controlName) {
  return typeof controlName === 'string' && SENSITIVE_CONTROL_NAME_PATTERN.test(controlName);
}

// type-into-field's own dynamic-sensitivity rule is narrower and IS fixed verbatim by
// AgentContract.md Section 7's table: "fresh confirmation when the target field is a
// credential/password field ... standing approval otherwise" -- not a judgment call, unlike
// click-control's keyword list above.
const CREDENTIAL_FIELD_PATTERN = /password|passcode|\bpin\b|credential|secret|otp|2fa|verification\s*code/i;

function isFieldCredential(controlName) {
  return typeof controlName === 'string' && CREDENTIAL_FIELD_PATTERN.test(controlName);
}

module.exports = { listControls, clickControl, typeIntoField, isControlNameSensitive, isFieldCredential, requireControlName };
