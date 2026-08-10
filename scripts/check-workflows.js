const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const control = require('../apps/desktop/src/main/computer-control');
const commands = require('../apps/desktop/src/main/custom-commands');
const workflows = require('../apps/desktop/src/main/workflows');

function mustReject(work, expectedMessage) {
  assert.throws(work, new RegExp(expectedMessage));
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-workflows-'));

try {
  control.configureApprovedApps(sandbox);
  commands.configureCustomCommands(sandbox);
  workflows.configureWorkflows(sandbox);

  const appPathA = path.join(sandbox, 'app-a.exe');
  const appPathB = path.join(sandbox, 'app-b.exe');
  fs.writeFileSync(appPathA, 'not executed');
  fs.writeFileSync(appPathB, 'not executed');
  const appA = control.approveApp(appPathA);
  const appB = control.approveApp(appPathB);
  const savedCommand = commands.createCommand('Helper command', [{ type: 'open-website', url: 'https://example.com' }]);

  // Step-count boundaries: 0 steps and more than 10 steps must both fail closed.
  mustReject(() => workflows.previewWorkflow('Empty', []), 'between 1 and 10');
  const tooManySteps = Array.from({ length: 11 }, () => ({ type: 'open-website', url: 'https://example.com' }));
  mustReject(() => workflows.previewWorkflow('Too many', tooManySteps), 'between 1 and 10');

  // Name validation.
  mustReject(() => workflows.previewWorkflow('', [{ type: 'open-website', url: 'https://example.com' }]), 'workflow name');

  // A workflow with no branching (every step defaults to next/stop) resolves like a plain
  // sequence -- the Day 19 "no branching" baseline case.
  const noBranch = workflows.previewWorkflow('No branching', [
    { type: 'open-website', url: 'https://example.com/a' },
    { type: 'open-website', url: 'https://example.com/b' }
  ]);
  assert.equal(noBranch.steps[0].onSuccess, 'next');
  assert.equal(noBranch.steps[0].onFailure, 'stop');
  assert.equal(noBranch.steps[1].onSuccess, 'next');

  // Backward and self-referencing routing targets must be rejected at save/preview time --
  // loops are structurally impossible, not merely discouraged.
  mustReject(() => workflows.previewWorkflow('Backward', [
    { type: 'open-website', url: 'https://example.com/a', onSuccess: 0 },
    { type: 'open-website', url: 'https://example.com/b' }
  ]), 'later step number');
  mustReject(() => workflows.previewWorkflow('Self', [
    { type: 'open-website', url: 'https://example.com/a', onSuccess: 1 },
    { type: 'open-website', url: 'https://example.com/b', onSuccess: 1 }
  ]), 'later step number');
  mustReject(() => workflows.previewWorkflow('Out of range', [
    { type: 'open-website', url: 'https://example.com/a', onSuccess: 5 },
    { type: 'open-website', url: 'https://example.com/b' }
  ]), 'later step number');

  // A step can reference an approved app, a website, or an existing custom command; any
  // other step type must fail closed.
  const mixedSteps = [
    { type: 'open-approved-app', appId: appA.id },
    { type: 'run-custom-command', commandId: savedCommand.id },
    { type: 'open-website', url: 'https://example.com/fallback' }
  ];
  const mixedPreview = workflows.previewWorkflow('Mixed', mixedSteps);
  assert.equal(mixedPreview.steps.length, 3);
  assert.equal(mixedPreview.steps[1].label, 'Helper command');
  mustReject(() => workflows.previewWorkflow('Bad step', [{ type: 'run-workflow', workflowId: 'not-real' }]), 'does not support');

  // Create, then verify listWorkflows round-trips with live-resolved steps.
  const created = workflows.createWorkflow('Morning setup with fallback', [
    { type: 'open-approved-app', appId: appA.id, onSuccess: 'next', onFailure: 2 },
    { type: 'open-website', url: 'https://example.com/skip', onSuccess: 'stop', onFailure: 'stop' },
    { type: 'open-approved-app', appId: appB.id, onSuccess: 'stop', onFailure: 'stop' }
  ]);
  assert.ok(created.id);
  let listed = workflows.listWorkflows();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].steps.length, 3);
  assert.ok(listed[0].steps.every((step) => !step.unavailable));

  // prepare-run re-resolves live and preserves the routing that was saved.
  let prepared = workflows.prepareWorkflowRun(created.id);
  assert.equal(prepared.steps[0].onFailure, 2);
  assert.equal(prepared.steps[1].onSuccess, 'stop');

  // Simulate execution: step 0 fails -> onFailure routes to step 2 (index 2), skipping step 1.
  // This is the core Day 20 behaviour custom commands cannot do.
  let target = workflows.resolveRoute(prepared.steps[0].onFailure, 0, prepared.steps.length);
  assert.equal(target, 2);
  target = workflows.resolveRoute(prepared.steps[2].onSuccess, 2, prepared.steps.length);
  assert.equal(target, 'stop');

  // A step whose onFailure is left at the default "stop" halts there on failure.
  target = workflows.resolveRoute(prepared.steps[1].onFailure, 1, prepared.steps.length);
  assert.equal(target, 'stop');

  // "next" on the last step behaves identically to "stop" -- running off the end.
  target = workflows.resolveRoute('next', prepared.steps.length - 1, prepared.steps.length);
  assert.equal(target, 'stop');

  // Removing appB's approval must not break the whole list -- the affected step is marked
  // unavailable, and preparing a run must now fail closed.
  control.removeApprovedApp(appB.id);
  listed = workflows.listWorkflows();
  assert.equal(listed[0].steps[2].unavailable, true);
  mustReject(() => workflows.prepareWorkflowRun(created.id), 'no longer available');

  // A workflow step referencing a custom command whose own approval was removed must also
  // fail that step closed instead of running blind.
  const commandWorkflow = workflows.createWorkflow('Runs a command', [
    { type: 'run-custom-command', commandId: savedCommand.id }
  ]);
  commands.removeCommand(savedCommand.id);
  listed = workflows.listWorkflows();
  const commandWorkflowListed = listed.find((entry) => entry.id === commandWorkflow.id);
  assert.equal(commandWorkflowListed.steps[0].unavailable, true);
  mustReject(() => workflows.prepareWorkflowRun(commandWorkflow.id), 'no longer available');

  // Removing a workflow deletes it; re-finding it fails closed.
  const removed = workflows.removeWorkflow(created.id);
  assert.equal(removed.name, 'Morning setup with fallback');
  mustReject(() => workflows.prepareWorkflowRun(created.id), 'not stored');

  console.log('Workflow safety checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
