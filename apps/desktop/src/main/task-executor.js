// Block D, Steps 18-20: the single deterministic executor every registered action routes
// through, plus the task state machine from docs/AgentContract.md Section 1
// (proposed -> approved -> running -> paused/blocked -> completed/failed/cancelled).
//
// No action is ever invoked outside runTask(). Preconditions: proposeTask validates every step
// against the live registry (schema + registration) before the task is even shown for approval.
// Postcondition checks: an action's own execute() resolving is treated as its postcondition --
// none of Block D's four real actions have a separate observable postcondition beyond "the call
// succeeded," so a second check step is not invented here (flagged per INSTRUCTIONS.md Section
// 5 -- Block E/F/G actions with real side effects, e.g. delete-file, may need one).
//
// Block E, Step 24: the sensitive-step gate below (previously unexercised by any Block D action)
// is now live for delete-file. task.pendingConfirmation carries the blocked step's actionId +
// input + a human describe() string so the task popup can render exactly what needs approval,
// rather than the generic "blocked" state alone.
//
// Block F, Step 25/26: an action's `riskTier` stays fixed at registration time per
// AgentContract.md Section 8 -- but click-control, type-into-field, and run-powershell are each
// routine at the *type* level while a specific instance can hit a fixed-sensitive category
// (Section 2). Each of those three actions may optionally export `isStepSensitive(input)`; if
// present, it is consulted per-step alongside the fixed tier, and either one being true escalates
// that step to a fresh confirmation. This does not change Section 8's rule (the *type*'s
// registered tier never changes) -- it is the same runtime-pattern exception Section 7's table
// already names for run-powershell's trigger-pattern classifier, generalized so click-control and
// type-into-field use the identical mechanism instead of each inventing their own.
const crypto = require('node:crypto');
const { getAction } = require('./action-registry');
const { prepareRoutineRun } = require('./routines');

const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);
const tasks = new Map();

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms.`)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

// Section 4's "target" field must never carry raw secrets/credentials. None of Block D's four
// actions accept credential-shaped input, but this redaction is written generically now so
// Block F's run-powershell / sensitive-field actions don't need a second implementation later.
function redactInput(value) {
  try {
    const clone = JSON.parse(JSON.stringify(value ?? {}));
    for (const key of Object.keys(clone)) {
      if (/password|credential|secret|token/i.test(key)) clone[key] = '[redacted]';
    }
    return clone;
  } catch {
    return null;
  }
}

// Block F: an action may export `redactForAudit(input)` to fully replace the generic key-name
// heuristic above with a hand-built audit representation -- used by type-into-field (never logs
// the raw typed text, only its length) and run-powershell (scrubs embedded secrets from the
// command text via powershell-control.js's own classifier, rather than the blunt whole-field
// redaction redactInput would otherwise apply). Every other action keeps using redactInput
// unchanged.
function auditTarget(action, input) {
  return typeof action.redactForAudit === 'function' ? action.redactForAudit(input) : redactInput(input);
}

// Block F, Step 25/26: an action is treated as sensitive for a given step if its *fixed*
// riskTier says so, OR its optional isStepSensitive(input) predicate says so for this specific
// input -- see the file-header comment above for why this doesn't reopen Section 8.
function isStepSensitive(action, input) {
  return action.riskTier === 'sensitive' || (typeof action.isStepSensitive === 'function' && action.isStepSensitive(input));
}

function proposeTask(goal, steps) {
  if (typeof goal !== 'string' || !goal.trim()) throw new Error('A task needs a non-empty goal.');
  if (!Array.isArray(steps) || !steps.length) throw new Error('A task needs at least one step.');
  const validatedSteps = steps.map((step, index) => {
    if (!step || typeof step.actionId !== 'string') throw new Error(`Step ${index + 1} is missing an actionId.`);
    const action = getAction(step.actionId);
    if (!action) throw new Error(`Step ${index + 1} references an unregistered action "${step.actionId}".`);
    const validInput = action.validateInput(step.input);
    const summary = typeof action.describe === 'function' ? action.describe(validInput) : undefined;
    return { index, actionId: step.actionId, input: validInput, summary, status: 'pending', result: null, error: null };
  });
  const task = {
    id: `task_${crypto.randomUUID()}`,
    goal: goal.trim(),
    steps: validatedSteps,
    state: 'proposed',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    startedAt: null,
    endedAt: null,
    currentStepIndex: 0,
    cancelRequested: false,
    pauseRequested: false,
    pendingConfirmation: null
  };
  tasks.set(task.id, task);
  return task;
}

function getTask(taskId) { return tasks.get(taskId) || null; }

function listActiveTasks() {
  return [...tasks.values()].filter((task) => task.state !== 'proposed' && !TERMINAL_STATES.has(task.state));
}

// Agent Home needs progress, not raw action inputs (which can include typed text or a
// PowerShell command). Keep that UI projection deliberately small and local: task state,
// goal, dates, and step outcomes only. Tasks are in-memory by design; durable execution detail
// remains in the privacy-redacted audit log.
function taskSummary(task) {
  return {
    id: task.id,
    goal: task.goal,
    state: task.state,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    endedAt: task.endedAt,
    currentStepIndex: task.currentStepIndex,
    stepCount: task.steps.length,
    steps: task.steps.map((step) => ({ actionId: step.actionId, summary: step.summary || step.actionId, status: step.status, error: step.error || null }))
  };
}

function listTaskSummaries() {
  return [...tasks.values()]
    .sort((a, b) => Date.parse(b.endedAt || b.startedAt || b.createdAt) - Date.parse(a.endedAt || a.startedAt || a.createdAt))
    .slice(0, 20)
    .map(taskSummary);
}

function requestCancel(taskId) {
  const task = tasks.get(taskId);
  if (!task) return null;
  task.cancelRequested = true;
  return task;
}

function requestPause(taskId) {
  const task = tasks.get(taskId);
  if (!task || TERMINAL_STATES.has(task.state)) return task || null;
  task.pauseRequested = true;
  return task;
}

function requestResume(taskId) {
  const task = tasks.get(taskId);
  if (!task) return null;
  task.pauseRequested = false;
  return task;
}

// Section 5 (emergency stop): the interrupted step is audited "cancelled", every step that never
// started is audited "skipped" -- both written here so the audit trail always shows the split.
function markInterrupted(task, fromIndex, auditFn) {
  const now = new Date().toISOString();
  for (let i = fromIndex; i < task.steps.length; i += 1) {
    const step = task.steps[i];
    const action = getAction(step.actionId);
    const outcome = i === fromIndex ? 'cancelled' : 'skipped';
    step.status = outcome;
    auditFn({
      taskId: task.id, stepIndex: i, action: step.actionId,
      riskTier: action ? (isStepSensitive(action, step.input) ? 'sensitive' : 'routine') : 'routine',
      target: action ? auditTarget(action, step.input) : redactInput(step.input),
      confirmationId: null, outcome, startedAt: now, endedAt: now, errorSummary: null
    });
  }
  task.state = 'cancelled';
  task.endedAt = now;
}

async function runTask(taskId, { auditFn, onUpdate, confirmSensitiveStep }) {
  const task = tasks.get(taskId);
  if (!task) throw new Error('That task no longer exists.');
  task.state = 'running';
  task.startedAt = task.startedAt || new Date().toISOString();
  onUpdate(task);

  for (let i = task.currentStepIndex; i < task.steps.length; i += 1) {
    task.currentStepIndex = i;

    if (task.cancelRequested) { markInterrupted(task, i, auditFn); onUpdate(task); return task; }
    while (task.pauseRequested && !task.cancelRequested) {
      task.state = 'paused';
      onUpdate(task);
      await sleep(200);
    }
    if (task.cancelRequested) { markInterrupted(task, i, auditFn); onUpdate(task); return task; }
    task.state = 'running';

    const step = task.steps[i];

    // Block H, Step 29: expand a run-routine step into its routine's live-resolved steps
    // in place, before the sensitive-gate/execute block below ever sees it -- so each spliced
    // step then goes through that same gate individually (no bulk exemption from Section 8).
    // prepareRoutineRun re-validates the routine fresh against the live registry right here,
    // never trusting whatever was true when the routine was created or last previewed.
    if (step.actionId === 'run-routine' && step.status === 'pending') {
      const startedAt = new Date().toISOString();
      let routine;
      try {
        routine = prepareRoutineRun(step.input.routineId);
      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        auditFn({
          taskId: task.id, stepIndex: i, action: 'run-routine', riskTier: 'routine',
          target: { routineId: step.input.routineId }, confirmationId: null, outcome: 'failed',
          startedAt, endedAt: new Date().toISOString(), errorSummary: error.message
        });
        task.state = 'failed';
        task.endedAt = new Date().toISOString();
        onUpdate(task);
        return task;
      }
      const expandedSteps = routine.steps.map((resolved) => ({
        actionId: resolved.actionId, input: resolved.input, summary: resolved.summary,
        status: 'pending', result: null, error: null
      }));
      task.steps.splice(i, 1, ...expandedSteps);
      auditFn({
        taskId: task.id, stepIndex: i, action: 'run-routine', riskTier: 'routine',
        target: { routineId: routine.id, name: routine.name, stepCount: expandedSteps.length },
        confirmationId: null, outcome: 'completed', startedAt, endedAt: new Date().toISOString(), errorSummary: null
      });
      onUpdate(task);
      i -= 1;
      continue;
    }

    const action = getAction(step.actionId);
    const startedAt = new Date().toISOString();

    let confirmationId = null;
    if (isStepSensitive(action, step.input)) {
      // Block E, Step 24: live for delete-file. Block F: also live for click-control /
      // type-into-field / run-powershell steps whose input matches their own runtime
      // sensitive-pattern check (see isStepSensitive above), even though those three actions
      // are registered routine at the type level. pendingConfirmation carries enough for the
      // popup to render exactly what needs approval (action id + validated input + a human
      // describe() string), and is cleared the moment the block resolves either way.
      task.state = 'blocked';
      task.pendingConfirmation = {
        stepIndex: i, actionId: step.actionId, input: step.input,
        summary: typeof action.describe === 'function' ? action.describe(step.input) : step.actionId
      };
      onUpdate(task);
      confirmationId = await confirmSensitiveStep(task, step);
      task.pendingConfirmation = null;
      if (!confirmationId) { markInterrupted(task, i, auditFn); onUpdate(task); return task; }
      task.state = 'running';
      onUpdate(task);
    }

    step.status = 'running';
    onUpdate(task);

    const MAX_ATTEMPTS = 2;
    const TIMEOUT_MS = 15_000;
    let lastError = null;
    let outcome = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !outcome; attempt += 1) {
      try { outcome = await withTimeout(action.execute(step.input), TIMEOUT_MS); }
      catch (error) { lastError = error; }
    }
    const endedAt = new Date().toISOString();

    // Block F: the audit record's riskTier reflects the effective (possibly escalated) tier
    // for THIS step, not just the action's fixed registration tier -- so a routine-registered
    // click-control step that hit a "Delete" control shows sensitive in the audit trail, matching
    // what actually required a fresh confirmation above, not what the type defaults to.
    const effectiveRiskTier = isStepSensitive(action, step.input) ? 'sensitive' : 'routine';
    if (outcome) {
      step.status = 'completed';
      step.result = outcome;
      auditFn({
        taskId: task.id, stepIndex: i, action: step.actionId, riskTier: effectiveRiskTier,
        target: auditTarget(action, step.input), confirmationId, outcome: 'completed', startedAt, endedAt, errorSummary: null
      });
    } else {
      step.status = 'failed';
      // Attached to the step itself (not just the audit log) so the popup can show WHY this
      // one step failed -- previously only the audit log had this, and the popup showed a bare
      // ✕ with no reason, which is exactly as unhelpful as the plan-time failure this fixes
      // elsewhere (see action-registry.js's requireNonEmptyPath/resolveExistingFile split).
      step.error = lastError ? lastError.message : 'Unknown error.';
      auditFn({
        taskId: task.id, stepIndex: i, action: step.actionId, riskTier: effectiveRiskTier,
        target: auditTarget(action, step.input), confirmationId, outcome: 'failed', startedAt, endedAt,
        errorSummary: lastError ? lastError.message : 'Unknown error.'
      });
      task.state = 'failed';
      task.endedAt = endedAt;
      onUpdate(task);
      return task;
    }
    onUpdate(task);
  }

  task.state = 'completed';
  task.endedAt = new Date().toISOString();
  onUpdate(task);
  return task;
}

function approveTask(taskId, hooks) {
  const task = tasks.get(taskId);
  if (!task) throw new Error('That task no longer exists.');
  if (task.state !== 'proposed') throw new Error('Only a proposed task can be approved.');
  task.state = 'approved';
  task.approvedAt = new Date().toISOString();
  runTask(taskId, hooks).catch((error) => {
    task.state = 'failed';
    task.endedAt = new Date().toISOString();
    hooks.onUpdate(task, error);
  });
  return task;
}

module.exports = {
  proposeTask, getTask, listActiveTasks, listTaskSummaries, approveTask,
  requestPause, requestResume, requestCancel,
  TERMINAL_STATES
};
