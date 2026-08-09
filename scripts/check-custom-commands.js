const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const control = require('../apps/desktop/src/main/computer-control');
const commands = require('../apps/desktop/src/main/custom-commands');

function mustReject(work, expectedMessage) {
  assert.throws(work, new RegExp(expectedMessage));
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-custom-commands-'));

try {
  control.configureApprovedApps(sandbox);
  commands.configureCustomCommands(sandbox);

  const testAppPath = path.join(sandbox, 'notepad-test.exe');
  fs.writeFileSync(testAppPath, 'not executed');
  const approvedApp = control.approveApp(testAppPath);

  // Step-count boundaries: 0 steps and more than 5 steps must both fail closed.
  mustReject(() => commands.previewCommand('Empty', []), 'between 1 and 5');
  const tooManySteps = Array.from({ length: 6 }, () => ({ type: 'open-website', url: 'https://example.com' }));
  mustReject(() => commands.previewCommand('Too many', tooManySteps), 'between 1 and 5');

  // Name validation.
  mustReject(() => commands.previewCommand('', [{ type: 'open-website', url: 'https://example.com' }]), 'command name');
  mustReject(() => commands.previewCommand('x'.repeat(61), [{ type: 'open-website', url: 'https://example.com' }]), 'command name');

  // Only the two designed step types may resolve; folder search and anything else must
  // fail closed, matching the explicit Day 19 exclusion.
  mustReject(() => commands.previewCommand('Bad step', [{ type: 'search-folder', folderPath: sandbox }]), 'does not support');
  mustReject(() => commands.previewCommand('Bad app', [{ type: 'open-approved-app', appId: 'not-a-real-id' }]), 'no longer available');
  mustReject(() => commands.previewCommand('Bad url', [{ type: 'open-website', url: 'http://example.com' }]), 'invalid');

  // A valid two-step command resolves both steps with live labels/destinations.
  const validSteps = [
    { type: 'open-approved-app', appId: approvedApp.id },
    { type: 'open-website', url: 'https://example.com/docs' }
  ];
  const preview = commands.previewCommand('Morning setup', validSteps);
  assert.equal(preview.steps.length, 2);
  assert.equal(preview.steps[0].destination, approvedApp.executable);
  assert.equal(preview.steps[1].destination, 'https://example.com/docs');

  // Create, then verify the stored record round-trips through listCommands with live-resolved
  // steps (labels/destinations are never trusted from storage alone).
  const created = commands.createCommand('Morning setup', validSteps);
  assert.ok(created.id);
  let listed = commands.listCommands();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].name, 'Morning setup');
  assert.equal(listed[0].steps.length, 2);
  assert.ok(listed[0].steps.every((step) => !step.unavailable));

  // prepare-run re-resolves live and matches what was stored.
  const prepared = commands.prepareCommandRun(created.id);
  assert.equal(prepared.steps[0].destination, approvedApp.executable);

  // Removing the underlying app approval must not break the whole list — the affected step
  // is marked unavailable instead, and running the command must now fail closed.
  control.removeApprovedApp(approvedApp.id);
  listed = commands.listCommands();
  assert.equal(listed[0].steps[0].unavailable, true);
  mustReject(() => commands.prepareCommandRun(created.id), 'no longer available');

  // Removing a command deletes it; re-finding it fails closed.
  const removed = commands.removeCommand(created.id);
  assert.equal(removed.name, 'Morning setup');
  assert.equal(commands.listCommands().length, 0);
  mustReject(() => commands.prepareCommandRun(created.id), 'not stored');

  console.log('Custom-command safety checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
