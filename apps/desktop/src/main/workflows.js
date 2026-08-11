const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { approvedApp, websitePreview } = require('./computer-control');
const { prepareCommandRun } = require('./custom-commands');

const MAX_STEPS = 10;
const MAX_WORKFLOWS = 50;
const MAX_NAME_LENGTH = 60;
let workflowsPath = '';

function configureWorkflows(userDataPath) { workflowsPath = path.join(userDataPath, 'workflows.json'); }
function safeError(message, code) { const error = new Error(message); error.code = code; return error; }

function validateWorkflowName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
    throw safeError(`Enter a workflow name up to ${MAX_NAME_LENGTH} characters long.`, 'INVALID_WORKFLOW_NAME');
  }
  return name.trim();
}

// A routing target must be "stop", "next", or a step index strictly greater than the
// current step's own index. This is what makes loops structurally impossible: no valid
// target can ever point backward or at itself, so execution is mathematically guaranteed to
// reach "stop" (or run off the end of the list, which behaves identically) within at most
// MAX_STEPS steps. Enforced here, at save/preview time -- not left to a runtime watchdog
// that might fail to catch an edge case.
function validateRoute(route, index, stepCount, field) {
  if (route === 'stop' || route === 'next') return route;
  if (Number.isInteger(route) && route > index && route < stepCount) return route;
  throw safeError(`Step ${index + 1}: ${field} must be "stop", "next", or a later step number.`, 'INVALID_ROUTE');
}

// A workflow step can only ever replay an already-approved app/website, or an already-saved
// custom command -- it never grants a new capability. All three branches reuse the existing
// live validators from computer-control.js / custom-commands.js; there is no separate,
// weaker validation path for workflows. Nesting a workflow inside a workflow is not a
// supported step type at all, which keeps the forward-index-only loop proof airtight.
function resolveStep(step, index, stepCount) {
  if (!step || typeof step !== 'object') throw safeError(`Step ${index + 1} is invalid.`, 'INVALID_STEP');
  const onSuccess = validateRoute(step.onSuccess ?? 'next', index, stepCount, 'onSuccess');
  const onFailure = validateRoute(step.onFailure ?? 'stop', index, stepCount, 'onFailure');
  if (step.type === 'open-approved-app') {
    let app;
    try { app = approvedApp(step.appId); }
    catch { throw safeError(`Step ${index + 1}: that approved app is no longer available.`, 'STEP_APP_UNAVAILABLE'); }
    return { type: 'open-approved-app', appId: app.id, label: app.label, destination: app.kind === 'browser-web-app' ? app.url : app.executable, onSuccess, onFailure };
  }
  if (step.type === 'open-website') {
    let site;
    try { site = websitePreview(step.url); }
    catch { throw safeError(`Step ${index + 1}: that website address is invalid.`, 'STEP_WEBSITE_INVALID'); }
    return { type: 'open-website', url: site.url, label: site.hostname, destination: site.url, onSuccess, onFailure };
  }
  if (step.type === 'run-custom-command') {
    let command;
    try { command = prepareCommandRun(step.commandId); }
    catch { throw safeError(`Step ${index + 1}: that custom command is no longer available.`, 'STEP_COMMAND_UNAVAILABLE'); }
    return { type: 'run-custom-command', commandId: command.id, label: command.name, destination: `${command.steps.length} step${command.steps.length === 1 ? '' : 's'}`, onSuccess, onFailure };
  }
  throw safeError(`Step ${index + 1} uses an action Zen does not support in workflows.`, 'UNSUPPORTED_STEP_TYPE');
}

function resolveSteps(rawSteps) {
  if (!Array.isArray(rawSteps) || !rawSteps.length || rawSteps.length > MAX_STEPS) {
    throw safeError(`A workflow needs between 1 and ${MAX_STEPS} steps.`, 'INVALID_STEP_COUNT');
  }
  return rawSteps.map((step, index) => resolveStep(step, index, rawSteps.length));
}

function previewWorkflow(name, rawSteps) {
  return { name: validateWorkflowName(name), steps: resolveSteps(rawSteps) };
}

function readStoredWorkflows() {
  try {
    const data = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw safeError('Zen could not read its local workflow store.', 'STORE_READ_FAILED');
  }
}

function writeStoredWorkflows(workflows) {
  const temporary = `${workflowsPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(workflows), 'utf8');
    fs.renameSync(temporary, workflowsPath);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { }
  }
}

function minimalStep(step) {
  const base = { type: step.type, onSuccess: step.onSuccess, onFailure: step.onFailure };
  if (step.type === 'open-approved-app') return { ...base, appId: step.appId };
  if (step.type === 'open-website') return { ...base, url: step.url };
  return { ...base, commandId: step.commandId };
}

function createWorkflow(name, rawSteps) {
  const validatedName = validateWorkflowName(name);
  const resolvedSteps = resolveSteps(rawSteps);
  const workflows = readStoredWorkflows();
  if (workflows.length >= MAX_WORKFLOWS) throw safeError(`Zen supports up to ${MAX_WORKFLOWS} saved workflows.`, 'TOO_MANY_WORKFLOWS');
  const record = {
    id: crypto.randomUUID(),
    name: validatedName,
    steps: resolvedSteps.map(minimalStep),
    createdAt: new Date().toISOString()
  };
  writeStoredWorkflows([record, ...workflows]);
  return { id: record.id, name: record.name, steps: resolvedSteps, createdAt: record.createdAt };
}

function listWorkflows() {
  return readStoredWorkflows().map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    createdAt: workflow.createdAt,
    steps: (workflow.steps || []).map((step, index) => {
      try { return resolveStep(step, index, workflow.steps.length); }
      catch (error) { return { type: step.type, onSuccess: step.onSuccess, onFailure: step.onFailure, unavailable: true, reason: error.message }; }
    })
  }));
}

function findWorkflow(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That workflow is invalid.', 'INVALID_WORKFLOW');
  const workflow = readStoredWorkflows().find((entry) => entry.id === id);
  if (!workflow) throw safeError('That workflow is not stored in Zen.', 'WORKFLOW_NOT_FOUND');
  return workflow;
}

function prepareWorkflowRun(id) {
  const workflow = findWorkflow(id);
  const steps = (workflow.steps || []).map((step, index) => resolveStep(step, index, workflow.steps.length));
  return { id: workflow.id, name: workflow.name, steps };
}

function removeWorkflow(id) {
  const workflow = findWorkflow(id);
  writeStoredWorkflows(readStoredWorkflows().filter((entry) => entry.id !== workflow.id));
  return { id: workflow.id, name: workflow.name };
}

function resolveRoute(route, index, stepCount) {
  if (route === 'stop') return 'stop';
  if (route === 'next') return index + 1 < stepCount ? index + 1 : 'stop';
  return route;
}

// Day 26/27 backup & export: raw stored records (minimal step shape), not the resolved/
// UI-facing listWorkflows() projection -- this is what a restore needs to feed back into
// createWorkflow's own validation.
function exportWorkflows() { return readStoredWorkflows(); }

// Restore replaces the current workflow list -- it does not merge, per the Day 26 design. Each
// workflow's steps and routing are re-validated through the exact same resolveSteps used at
// normal creation time (including the forward-only-index loop check) -- nothing from a backup
// file is ever trusted as pre-approved. The original id is preserved (not re-minted) for
// consistency with restoreCommands, though nothing currently references a workflow by id from
// elsewhere. A workflow referencing a step that no longer resolves is skipped and reported, not
// silently dropped. Called after restoreCommands() by the backup module, so any
// "run-custom-command" step can resolve against the already-restored command list (whose ids
// are themselves preserved from the backup, not re-minted -- see restoreCommands).
function restoreWorkflows(rawWorkflows) {
  if (!Array.isArray(rawWorkflows)) throw safeError('The workflows section of that backup is invalid.', 'INVALID_BACKUP_WORKFLOWS');
  const skipped = [];
  const restored = [];
  for (const raw of rawWorkflows) {
    try {
      const validatedName = validateWorkflowName(raw?.name);
      const resolvedSteps = resolveSteps(raw?.steps);
      if (restored.length >= MAX_WORKFLOWS) throw safeError(`Zen supports up to ${MAX_WORKFLOWS} saved workflows.`, 'TOO_MANY_WORKFLOWS');
      const id = typeof raw?.id === 'string' && /^[a-f0-9-]{36}$/i.test(raw.id) ? raw.id : crypto.randomUUID();
      restored.push({
        id,
        name: validatedName,
        steps: resolvedSteps.map(minimalStep),
        createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
      });
    } catch (error) {
      skipped.push({ name: raw?.name || 'unnamed workflow', reason: error.message });
    }
  }
  writeStoredWorkflows(restored);
  return { restored: restored.length, skipped };
}

module.exports = {
  configureWorkflows,
  previewWorkflow,
  createWorkflow,
  listWorkflows,
  prepareWorkflowRun,
  removeWorkflow,
  resolveRoute,
  MAX_STEPS,
  exportWorkflows,
  restoreWorkflows
};
