const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { approvedApp, websitePreview } = require('./computer-control');

const MAX_STEPS = 5;
const MAX_COMMANDS = 50;
const MAX_NAME_LENGTH = 60;
let commandsPath = '';

function configureCustomCommands(userDataPath) { commandsPath = path.join(userDataPath, 'custom-commands.json'); }
function safeError(message, code) { const error = new Error(message); error.code = code; return error; }

function validateCommandName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
    throw safeError(`Enter a command name up to ${MAX_NAME_LENGTH} characters long.`, 'INVALID_COMMAND_NAME');
  }
  return name.trim();
}

// A custom command can only ever replay an app or website that is independently
// approved/valid *right now* — it never grants a new capability. Both branches below reuse
// computer-control.js's own live validators; there is no separate, weaker path.
function resolveStep(step, index) {
  if (!step || typeof step !== 'object') throw safeError(`Step ${index + 1} is invalid.`, 'INVALID_STEP');
  if (step.type === 'open-approved-app') {
    let app;
    try { app = approvedApp(step.appId); }
    catch { throw safeError(`Step ${index + 1}: that approved app is no longer available.`, 'STEP_APP_UNAVAILABLE'); }
    return { type: 'open-approved-app', appId: app.id, label: app.label, destination: app.kind === 'browser-web-app' ? app.url : app.executable, kind: app.kind || 'app' };
  }
  if (step.type === 'open-website') {
    let site;
    try { site = websitePreview(step.url); }
    catch { throw safeError(`Step ${index + 1}: that website address is invalid.`, 'STEP_WEBSITE_INVALID'); }
    return { type: 'open-website', url: site.url, label: site.hostname, destination: site.url };
  }
  throw safeError(`Step ${index + 1} uses an action Zen does not support in custom commands.`, 'UNSUPPORTED_STEP_TYPE');
}

function resolveSteps(rawSteps) {
  if (!Array.isArray(rawSteps) || !rawSteps.length || rawSteps.length > MAX_STEPS) {
    throw safeError(`A custom command needs between 1 and ${MAX_STEPS} steps.`, 'INVALID_STEP_COUNT');
  }
  return rawSteps.map(resolveStep);
}

function previewCommand(name, rawSteps) {
  return { name: validateCommandName(name), steps: resolveSteps(rawSteps) };
}

function readStoredCommands() {
  try {
    const data = JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw safeError('Zen could not read its local custom-command store.', 'STORE_READ_FAILED');
  }
}

function writeStoredCommands(commands) {
  const temporary = `${commandsPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(commands), 'utf8');
    fs.renameSync(temporary, commandsPath);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { }
  }
}

function createCommand(name, rawSteps) {
  const validatedName = validateCommandName(name);
  const resolvedSteps = resolveSteps(rawSteps);
  const commands = readStoredCommands();
  if (commands.length >= MAX_COMMANDS) throw safeError(`Zen supports up to ${MAX_COMMANDS} saved custom commands.`, 'TOO_MANY_COMMANDS');
  const record = {
    id: crypto.randomUUID(),
    name: validatedName,
    steps: resolvedSteps.map((step) => (step.type === 'open-approved-app' ? { type: step.type, appId: step.appId } : { type: step.type, url: step.url })),
    createdAt: new Date().toISOString()
  };
  writeStoredCommands([record, ...commands]);
  return { id: record.id, name: record.name, steps: resolvedSteps, createdAt: record.createdAt };
}

// Re-resolves every stored step against current state for display. A step that no longer
// resolves (e.g. its app approval was removed) is marked unavailable rather than failing the
// whole list, so the rest of the command stays visible and reviewable.
function listCommands() {
  return readStoredCommands().map((command) => ({
    id: command.id,
    name: command.name,
    createdAt: command.createdAt,
    steps: (command.steps || []).map((step, index) => {
      try { return resolveStep(step, index); }
      catch (error) { return { type: step.type, unavailable: true, reason: error.message }; }
    })
  }));
}

function findCommand(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That custom command is invalid.', 'INVALID_COMMAND');
  const command = readStoredCommands().find((entry) => entry.id === id);
  if (!command) throw safeError('That custom command is not stored in Zen.', 'COMMAND_NOT_FOUND');
  return command;
}

// Called immediately before running a command, and again by the main process right before
// execution. Every step is re-validated live — never trusted from storage — so a removed
// app approval or now-invalid website fails closed with a clear per-step reason instead of
// running the sequence partially blind.
function prepareCommandRun(id) {
  const command = findCommand(id);
  const steps = (command.steps || []).map((step, index) => resolveStep(step, index));
  return { id: command.id, name: command.name, steps };
}

function removeCommand(id) {
  const command = findCommand(id);
  writeStoredCommands(readStoredCommands().filter((entry) => entry.id !== command.id));
  return { id: command.id, name: command.name };
}

// Day 26/27 backup & export: raw stored records (minimal step shape), not the resolved/
// UI-facing listCommands() projection -- this is what a restore needs to feed back into
// createCommand's own validation.
function exportCommands() { return readStoredCommands(); }

// Restore replaces the current command list -- it does not merge, per the Day 26 design. Each
// command's steps are re-validated through the exact same resolveSteps used at normal creation
// time -- nothing from a backup file is ever trusted as pre-approved. The original id is
// preserved (not re-minted) so any workflow that references this command by id continues to
// resolve after a restore; a command referencing a step that no longer resolves (e.g. its app
// approval is gone, or the 50-command cap is reached) is skipped and reported, not silently
// dropped.
function restoreCommands(rawCommands) {
  if (!Array.isArray(rawCommands)) throw safeError('The custom-commands section of that backup is invalid.', 'INVALID_BACKUP_COMMANDS');
  const skipped = [];
  const restored = [];
  for (const raw of rawCommands) {
    try {
      const validatedName = validateCommandName(raw?.name);
      const resolvedSteps = resolveSteps(raw?.steps);
      if (restored.length >= MAX_COMMANDS) throw safeError(`Zen supports up to ${MAX_COMMANDS} saved custom commands.`, 'TOO_MANY_COMMANDS');
      const id = typeof raw?.id === 'string' && /^[a-f0-9-]{36}$/i.test(raw.id) ? raw.id : crypto.randomUUID();
      restored.push({
        id,
        name: validatedName,
        steps: resolvedSteps.map((step) => (step.type === 'open-approved-app' ? { type: step.type, appId: step.appId } : { type: step.type, url: step.url })),
        createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
      });
    } catch (error) {
      skipped.push({ name: raw?.name || 'unnamed command', reason: error.message });
    }
  }
  writeStoredCommands(restored);
  return { restored: restored.length, skipped };
}

module.exports = {
  configureCustomCommands,
  previewCommand,
  createCommand,
  listCommands,
  prepareCommandRun,
  removeCommand,
  exportCommands,
  restoreCommands
};
