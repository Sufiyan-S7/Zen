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
const crypto = require('node:crypto');
const { getAction } = require('./action-registry');

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
      riskTier: action ? action.riskTier : 'routine', target: redactInput(step.input),
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
    const action = getAction(step.actionId);
    const startedAt = new Date().toISOString();

    let confirmationId = null;
    if (action.riskTier === 'sensitive') {
      // Block E, Step 24: live for delete-file. pendingConfirmation carries enough for the
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

    if (outcome) {
      step.status = 'completed';
      step.result = outcome;
      auditFn({
        taskId: task.id, stepIndex: i, action: step.actionId, riskTier: action.riskTier,
        target: redactInput(step.input), confirmationId, outcome: 'completed', startedAt, endedAt, errorSummary: null
      });
    } else {
      step.status = 'failed';
      // Attached to the step itself (not just the audit log) so the popup can show WHY this
      // one step failed -- previously only the audit log had this, and the popup showed a bare
      // ✕ with no reason, which is exactly as unhelpful as the plan-time failure this fixes
      // elsewhere (see action-registry.js's requireNonEmptyPath/resolveExistingFile split).
      step.error = lastError ? lastError.message : 'Unknown error.';
      auditFn({
        taskId: task.id, stepIndex: i, action: step.actionId, riskTier: action.riskTier,
        target: redactInput(step.input), confirmationId, outcome: 'failed', startedAt, endedAt,
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
  proposeTask, getTask, listActiveTasks, approveTask,
  requestPause, requestResume, requestCancel,
  TERMINAL_STATES
};
