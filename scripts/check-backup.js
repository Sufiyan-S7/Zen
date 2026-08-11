const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const control = require('../apps/desktop/src/main/computer-control');
const commands = require('../apps/desktop/src/main/custom-commands');
const workflows = require('../apps/desktop/src/main/workflows');
const documents = require('../apps/desktop/src/main/documents');
const backup = require('../apps/desktop/src/main/backup');

function mustReject(work, expectedMessage) {
  assert.throws(work, new RegExp(expectedMessage));
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-backup-'));

async function main() {
  control.configureApprovedApps(sandbox);
  commands.configureCustomCommands(sandbox);
  workflows.configureWorkflows(sandbox);
  documents.configureDocuments(sandbox);

  // configureApprovedApps auto-seeds a default explorer.exe approval on a brand-new store
  // (existing Day 1 behavior) -- remove it so this test's counts are deterministic regardless
  // of what's installed on the machine running it.
  control.listApprovedApps().forEach((app) => control.removeApprovedApp(app.id));

  // --- Build up real state in every category, the same way a person would through the app ---
  const testAppPath = path.join(sandbox, 'notepad-test.exe');
  fs.writeFileSync(testAppPath, 'not executed');
  const approvedApp = control.approveApp(testAppPath);
  const command = commands.createCommand('Morning setup', [
    { type: 'open-approved-app', appId: approvedApp.id },
    { type: 'open-website', url: 'https://example.com/docs' }
  ]);
  const workflow = workflows.createWorkflow('Morning with fallback', [
    { type: 'run-custom-command', commandId: command.id, onSuccess: 'stop', onFailure: 'next' },
    { type: 'open-website', url: 'https://example.com/fallback', onSuccess: 'stop', onFailure: 'stop' }
  ]);
  const docFile = path.join(sandbox, 'note.txt');
  fs.writeFileSync(docFile, 'Backup and export design notes.');
  const [importedDoc] = await documents.importDocuments([docFile]);
  const localData = {
    conversations: [{ id: 'c1', title: 'Hello', messages: [{ role: 'user', content: 'hi' }] }],
    settings: { theme: 'deep-violet', model: 'llama3.2:3b' },
    activityLog: [{ id: 'a1', action: 'open-website', status: 'completed' }],
    memories: [{ id: 'm1', text: 'Prefers concise updates.' }]
  };

  // --- Export builds a full envelope; counts match what was actually created ---
  const envelope = backup.buildEnvelope(localData);
  assert.equal(envelope.formatVersion, backup.FORMAT_VERSION);
  const summary = backup.summarizeEnvelope(envelope);
  assert.equal(summary.approvedApps, 1);
  assert.equal(summary.customCommands, 1);
  assert.equal(summary.workflows, 1);
  assert.equal(summary.documents, 1);
  assert.equal(summary.conversations, 1);
  assert.equal(summary.memories, 1);
  assert.equal(summary.activityLogEntries, 1);
  assert.equal(summary.hasSettings, true);

  // --- Malformed / incompatible files fail closed before anything is ever applied ---
  mustReject(() => backup.validateEnvelope(null), 'not a valid Zen backup');
  mustReject(() => backup.validateEnvelope({}), 'incompatible version');
  mustReject(() => backup.validateEnvelope({ formatVersion: 999, data: {} }), 'incompatible version');
  mustReject(() => backup.validateEnvelope({ formatVersion: backup.FORMAT_VERSION }), 'missing its data section');

  // --- Restore round-trip: wipe everything, restore from the envelope, verify it all comes back ---
  control.removeApprovedApp(approvedApp.id);
  commands.removeCommand(command.id);
  workflows.removeWorkflow(workflow.id);
  documents.removeDocument(importedDoc.id);
  assert.equal(control.listApprovedApps().length, 0);
  assert.equal(commands.listCommands().length, 0);
  assert.equal(workflows.listWorkflows().length, 0);
  assert.equal(documents.listDocuments().length, 0);

  const applied = backup.applyEnvelope(envelope);
  assert.equal(applied.approvedApps.restored, 1);
  assert.equal(applied.approvedApps.skipped.length, 0);
  assert.equal(applied.customCommands.restored, 1);
  assert.equal(applied.customCommands.skipped.length, 0);
  assert.equal(applied.workflows.restored, 1);
  assert.equal(applied.workflows.skipped.length, 0);
  assert.equal(applied.documents.restored, 1);
  assert.equal(applied.documents.skipped.length, 0);
  assert.deepEqual(applied.localData.conversations, localData.conversations);
  assert.deepEqual(applied.localData.memories, localData.memories);

  assert.equal(control.listApprovedApps().length, 1);
  assert.equal(control.listApprovedApps()[0].label, approvedApp.label);
  assert.equal(commands.listCommands().length, 1);
  assert.equal(commands.listCommands()[0].name, 'Morning setup');
  assert.equal(workflows.listWorkflows().length, 1);
  assert.equal(workflows.listWorkflows()[0].name, 'Morning with fallback');
  assert.equal(documents.listDocuments().length, 1);
  assert.equal(documents.listDocuments()[0].displayName, 'note.txt');

  // --- Restore replaces, it does not merge: restoring an envelope with fewer items must
  // leave the store at exactly that count, not the sum of old + new. ---
  const secondApp = control.approveApp((() => { const p = path.join(sandbox, 'second.exe'); fs.writeFileSync(p, 'x'); return p; })());
  assert.equal(control.listApprovedApps().length, 2);
  const smallerEnvelope = backup.buildEnvelope({ conversations: [], settings: {}, activityLog: [], memories: [] });
  // buildEnvelope reads live store state, so re-approve just the original app to get a
  // single-item envelope distinct from the two-item current state.
  control.removeApprovedApp(secondApp.id);
  const singleAppEnvelope = backup.buildEnvelope({ conversations: [], settings: {}, activityLog: [], memories: [] });
  control.approveApp(secondApp.executable);
  assert.equal(control.listApprovedApps().length, 2);
  backup.applyEnvelope(singleAppEnvelope);
  assert.equal(control.listApprovedApps().length, 1, 'restore must replace, not merge');

  // --- A restored approved-app entry whose executable no longer exists is skipped and
  // reported, never silently dropped or silently trusted. ---
  control.listApprovedApps().forEach((app) => control.removeApprovedApp(app.id));
  const ghostAppPath = path.join(sandbox, 'ghost.exe');
  fs.writeFileSync(ghostAppPath, 'temp');
  const ghostApp = control.approveApp(ghostAppPath);
  const ghostEnvelope = backup.buildEnvelope({ conversations: [], settings: {}, activityLog: [], memories: [] });
  fs.unlinkSync(ghostAppPath);
  const ghostRestore = backup.applyEnvelope(ghostEnvelope);
  assert.equal(ghostRestore.approvedApps.restored, 0);
  assert.equal(ghostRestore.approvedApps.skipped.length, 1);
  assert.equal(ghostRestore.approvedApps.skipped[0].label, ghostApp.label);

  // --- A document whose content does not match its recorded hash is rejected, not trusted. ---
  const tamperedDocEnvelope = {
    formatVersion: backup.FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      conversations: [], settings: {}, activityLog: [], memories: [], approvedApps: [], customCommands: [], workflows: [],
      documents: [{ id: 'tampered', displayName: 'tampered.txt', extractedText: 'changed text', contentHash: 'deadbeef'.repeat(8) }]
    }
  };
  const tamperedResult = backup.applyEnvelope(tamperedDocEnvelope);
  assert.equal(tamperedResult.documents.restored, 0);
  assert.equal(tamperedResult.documents.skipped.length, 1);
  assert.match(tamperedResult.documents.skipped[0].reason, /does not match its recorded hash/);

  console.log('Backup & export safety checks passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.rmSync(sandbox, { recursive: true, force: true });
});
