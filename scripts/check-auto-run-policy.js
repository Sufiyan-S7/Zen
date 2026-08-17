const assert = require('node:assert/strict');
const { AUTO_RUN_ACTION_IDS, shouldAutoRunPlan } = require('../apps/desktop/src/main/auto-run-policy');

assert.deepEqual([...AUTO_RUN_ACTION_IDS].sort(), [
  'browser-navigate', 'browser-read', 'list-folder', 'open-app', 'open-website', 'read-file', 'search-folder'
]);
assert.equal(shouldAutoRunPlan([{ actionId: 'open-website' }]), true);
assert.equal(shouldAutoRunPlan([{ actionId: 'search-folder' }, { actionId: 'read-file' }]), true);
assert.equal(shouldAutoRunPlan([{ actionId: 'browser-navigate' }, { actionId: 'browser-read' }]), true);
for (const actionId of ['delete-file', 'move-file', 'copy-file', 'rename-file', 'click-control', 'type-into-field', 'browser-form-fill-draft', 'run-powershell', 'run-routine']) {
  assert.equal(shouldAutoRunPlan([{ actionId }]), false, `${actionId} must remain review-gated`);
}
assert.equal(shouldAutoRunPlan([]), false);
console.log('Auto-run policy checks passed.');
