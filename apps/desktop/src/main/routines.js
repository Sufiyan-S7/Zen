// Block H, Step 29: named, voice-invokable routines. Upgrades v1.0's workflows.js concept
// (open-approved-app / open-website / run-custom-command, with branching onSuccess/onFailure
// routing) into a flat, ordered list of REAL action-registry steps -- so a routine step can be
// any registered action (open-app, delete-file, run-powershell, browser-navigate, etc. --
// owner's explicit choice, no restricted subset), validated against the exact same registry
// every directly-planned task step uses. No separate, weaker validation path -- same
// "reuse existing validators" convention workflows.js already established.
//
// Deliberately linear, not branching: a routine's steps are spliced directly into a running
// task's own step list by task-executor.js ("Option B" from the run-routine architecture
// decision -- each spliced step then resolves its own tier/permission at run time exactly like
// a directly planned step, satisfying docs/AgentContract.md's run-routine row: "routine at the
// registry level ... each constituent step still resolves its own tier and permission at run
// time (no bulk exemption from Section 8)"). Splicing a flat list is what makes that per-step
// gating possible; workflows.js's onSuccess/onFailure branching has no equivalent in
// task-executor's linear step array, so it is not carried over here. Existing workflows are
// untouched -- routines.js is new and additive, not a migration of stored workflow records.
//
// Nesting is not a supported step type (a routine step's actionId can never be 'run-routine'
// itself, nor the internal 'noop.wait' test fixture) -- same anti-recursion rule workflows.js
// already enforces for nested workflows, and the property that makes task-executor's
// splice-and-continue loop provably terminate in a bounded number of steps.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_STEPS = 10;
const MAX_ROUTINES = 50;
const MAX_NAME_LENGTH = 60;
let routinesPath = '';

function configureRoutines(userDataPath) { routinesPath = path.join(userDataPath, 'routines.json'); }
function safeError(message, code) { const error = new Error(message); error.code = code; return error; }

function validateRoutineName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
    throw safeError(`Enter a routine name up to ${MAX_NAME_LENGTH} characters long.`, 'INVALID_ROUTINE_NAME');
  }
  return name.trim();
}

// Validates one routine step against the LIVE action registry -- the exact same
// getAction(id).validateInput(input) any directly-planned task step goes through. Uses a
// deferred (in-function) require for action-registry.js rather than a top-of-file import,
// because action-registry.js's own run-routine action deferred-requires this file right back
// (to resolve a routine's display name for its describe() string) -- a top-level require on
// both sides would deadlock on Node's circular-require caching (whichever module loads second
// would see the other's exports object still empty). Deferring both sides to call time avoids
// the cycle entirely, since by the time any real function here is actually invoked, main.js's
// startup require chain has already finished loading both modules in full.
function resolveStep(step, index) {
  if (!step || typeof step !== 'object' || typeof step.actionId !== 'string') {
    throw safeError(`Step ${index + 1} is invalid.`, 'INVALID_STEP');
  }
  if (step.actionId === 'run-routine') {
    throw safeError(`Step ${index + 1}: a routine cannot contain another routine.`, 'NESTED_ROUTINE');
  }
  if (step.actionId === 'noop.wait') {
    throw safeError(`Step ${index + 1} references an unregistered action "${step.actionId}".`, 'UNKNOWN_ACTION');
  }
  const { getAction } = require('./action-registry');
  const action = getAction(step.actionId);
  if (!action) throw safeError(`Step ${index + 1} references an unregistered action "${step.actionId}".`, 'UNKNOWN_ACTION');
  const validInput = action.validateInput(step.input);
  const summary = typeof action.describe === 'function' ? action.describe(validInput) : action.label;
  return { actionId: step.actionId, input: validInput, summary };
}

function resolveSteps(rawSteps) {
  if (!Array.isArray(rawSteps) || !rawSteps.length || rawSteps.length > MAX_STEPS) {
    throw safeError(`A routine needs between 1 and ${MAX_STEPS} steps.`, 'INVALID_STEP_COUNT');
  }
  return rawSteps.map((step, index) => resolveStep(step, index));
}

function previewRoutine(name, rawSteps) {
  return { name: validateRoutineName(name), steps: resolveSteps(rawSteps) };
}

function readStoredRoutines() {
  try {
    const data = JSON.parse(fs.readFileSync(routinesPath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw safeError('Zen could not read its local routine store.', 'STORE_READ_FAILED');
  }
}

function writeStoredRoutines(routines) {
  const temporary = `${routinesPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(routines), 'utf8');
    fs.renameSync(temporary, routinesPath);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { }
  }
}

// Minimal stored shape -- actionId + raw input only, same convention as workflows.js's
// minimalStep. Everything derived (summary, validity) is re-resolved live on every read/run,
// never trusted from storage.
function minimalStep(step) { return { actionId: step.actionId, input: step.input }; }

function createRoutine(name, rawSteps) {
  const validatedName = validateRoutineName(name);
  const resolvedSteps = resolveSteps(rawSteps);
  const routines = readStoredRoutines();
  if (routines.length >= MAX_ROUTINES) throw safeError(`Zen supports up to ${MAX_ROUTINES} saved routines.`, 'TOO_MANY_ROUTINES');
  const record = {
    id: crypto.randomUUID(),
    name: validatedName,
    steps: resolvedSteps.map(minimalStep),
    createdAt: new Date().toISOString()
  };
  writeStoredRoutines([record, ...routines]);
  return { id: record.id, name: record.name, steps: resolvedSteps, createdAt: record.createdAt };
}

function listRoutines() {
  return readStoredRoutines().map((routine) => ({
    id: routine.id,
    name: routine.name,
    createdAt: routine.createdAt,
    steps: (routine.steps || []).map((step, index) => {
      try { return resolveStep(step, index); }
      catch (error) { return { actionId: step.actionId, unavailable: true, reason: error.message }; }
    })
  }));
}

function findRoutine(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw safeError('That routine is invalid.', 'INVALID_ROUTINE');
  const routine = readStoredRoutines().find((entry) => entry.id === id);
  if (!routine) throw safeError('That routine is not stored in Zen.', 'ROUTINE_NOT_FOUND');
  return routine;
}

// Re-resolves every step fresh against the live registry at run time -- never trusts a
// previously-validated/stored step, matching resolveActiveFolderGrant's own
// re-resolve-at-run-time convention elsewhere in this codebase (e.g. permissions.js,
// browser-control.js). Called by task-executor.js immediately before splicing a run-routine
// step's steps into a running task.
function prepareRoutineRun(id) {
  const routine = findRoutine(id);
  const steps = (routine.steps || []).map((step, index) => resolveStep(step, index));
  return { id: routine.id, name: routine.name, steps };
}

function removeRoutine(id) {
  const routine = findRoutine(id);
  writeStoredRoutines(readStoredRoutines().filter((entry) => entry.id !== routine.id));
  return { id: routine.id, name: routine.name };
}

// Best-effort name lookup for action-registry.js's run-routine.describe() -- returns null
// instead of throwing so a stale/removed routineId degrades to a generic description rather
// than breaking the whole task-plan preview.
function routineNameOrNull(id) {
  try { return findRoutine(id).name; }
  catch { return null; }
}

// Day 26/27-style backup & export: raw stored records (minimal step shape), not the
// resolved/UI-facing listRoutines() projection -- matches workflows.js's exportWorkflows.
function exportRoutines() { return readStoredRoutines(); }

// Restore replaces the current routine list -- it does not merge, same as workflows.js. Each
// routine's steps are re-validated through the exact same resolveSteps used at normal creation
// time (including the no-nesting rule) -- nothing from a backup file is ever trusted as
// pre-approved. The original id is preserved (not re-minted) for consistency with
// restoreWorkflows/restoreCommands.
function restoreRoutines(rawRoutines) {
  if (!Array.isArray(rawRoutines)) throw safeError('The routines section of that backup is invalid.', 'INVALID_BACKUP_ROUTINES');
  const skipped = [];
  const restored = [];
  for (const raw of rawRoutines) {
    try {
      const validatedName = validateRoutineName(raw?.name);
      const resolvedSteps = resolveSteps(raw?.steps);
      if (restored.length >= MAX_ROUTINES) throw safeError(`Zen supports up to ${MAX_ROUTINES} saved routines.`, 'TOO_MANY_ROUTINES');
      const id = typeof raw?.id === 'string' && /^[a-f0-9-]{36}$/i.test(raw.id) ? raw.id : crypto.randomUUID();
      restored.push({
        id,
        name: validatedName,
        steps: resolvedSteps.map(minimalStep),
        createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
      });
    } catch (error) {
      skipped.push({ name: raw?.name || 'unnamed routine', reason: error.message });
    }
  }
  writeStoredRoutines(restored);
  return { restored: restored.length, skipped };
}

module.exports = {
  configureRoutines,
  previewRoutine,
  createRoutine,
  listRoutines,
  prepareRoutineRun,
  removeRoutine,
  routineNameOrNull,
  MAX_STEPS,
  exportRoutines,
  restoreRoutines
};
