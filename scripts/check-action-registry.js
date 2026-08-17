// Block D, Step 16 fixtures for apps/desktop/src/main/action-registry.js -- the initial action
// registry subset (noop.wait, open-app, open-website, list-folder, read-file). Block E, Steps
// 22-24 extended this file: read-file upgraded to accept filePath (permission-gated) alongside
// documentId, plus search-folder, move-file, copy-file, rename-file, delete-file. Block F, Steps
// 25-26 added click-control, type-into-field (app-automation.js) and run-powershell
// (powershell-control.js) -- their own per-module fixtures live in check-app-automation.js and
// check-powershell-control.js; this file only covers their registry-level wiring (riskTier,
// validateInput, describe, isStepSensitive escalation, redactForAudit). Mirrors the existing
// check-computer-control.js/check-documents.js style: real modules, temp sandboxes, no mocks for
// anything that has no real-world side effect.
//
// open-app.execute(), open-website.execute(), and delete-file.execute() are deliberately NOT
// exercised here -- they spawn a real process / open a real browser / call Electron's
// shell.trashItem, and `require('electron')` resolves to a path STRING (not the API object)
// under plain `node`, exactly like this script runs -- so shell is undefined until actually
// invoked. Only validateInput()/describe()/riskTier are checked for those three. Flagged per
// INSTRUCTIONS.md Section 5 as a scope choice, not an oversight, matching the pre-existing
// convention this file already used for open-app/open-website. click-control/type-into-field's
// execute() is likewise not exercised here (real UI Automation against a real running app,
// covered by check-app-automation.js instead) -- but run-powershell's off-toggle guard IS
// exercised here (real, in-process, no spawn), since it's cheap and catches a real regression
// class (the toggle check silently skipped).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ACTIONS, getAction, listActionsForPlanner } = require('../apps/desktop/src/main/action-registry');
const { configureDocuments, importDocuments } = require('../apps/desktop/src/main/documents');
const { configurePermissions, grantFolderPermission } = require('../apps/desktop/src/main/permissions');
const { configurePowerShellControl } = require('../apps/desktop/src/main/powershell-control');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-action-registry-'));
const permSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-action-registry-perm-'));
const psSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-action-registry-ps-'));
try {
  configurePermissions(permSandbox);
  configurePowerShellControl(psSandbox);

  // Registration surface -- Block H adds run-routine on top of Block G's 16 actions, so there
  // are now 17 actions total (including noop.wait), 16 offered to the planner. The browser-*
  // actions' own validateInput/describe/
  // redactForAudit/riskTier surface is exercised in check-browser-control.js instead (it already
  // imports the real ACTIONS object) -- this file only needed its count/list assertions kept
  // current so the two files' registry views of the world don't silently diverge again.
  assert.equal(getAction('noop.wait').riskTier, 'routine');
  assert.equal(getAction('open-app').riskTier, 'routine');
  assert.equal(getAction('open-website').riskTier, 'routine');
  assert.equal(getAction('list-folder').riskTier, 'routine');
  assert.equal(getAction('read-file').riskTier, 'routine');
  assert.equal(getAction('search-folder').riskTier, 'routine');
  assert.equal(getAction('move-file').riskTier, 'routine');
  assert.equal(getAction('copy-file').riskTier, 'routine');
  assert.equal(getAction('rename-file').riskTier, 'routine');
  assert.equal(getAction('delete-file').riskTier, 'sensitive', 'delete-file must be sensitive per AgentContract.md Section 7');
  assert.equal(getAction('click-control').riskTier, 'routine', 'click-control is routine at the type level per AgentContract.md Section 7');
  assert.equal(getAction('type-into-field').riskTier, 'routine', 'type-into-field is routine at the type level per AgentContract.md Section 7');
  assert.equal(getAction('run-powershell').riskTier, 'routine', 'run-powershell is routine by default, sensitive only for trigger-pattern matches');
  assert.equal(getAction('run-routine').riskTier, 'routine', 'run-routine delegates each contained step to its own runtime risk gate');
  assert.equal(getAction('not-a-real-action'), null, 'an unregistered action id must resolve to null, never throw or invent a default');
  assert.equal(Object.keys(ACTIONS).length, 17, 'exactly the 17 v2.0 actions (incl. noop.wait) should be registered so far');

  const plannerActions = listActionsForPlanner();
  assert.equal(plannerActions.length, 16, 'noop.wait is an internal test action and must never be offered to the planner');
  assert.ok(!plannerActions.some((action) => action.id === 'noop.wait'));
  assert.deepEqual(plannerActions.map((action) => action.id).sort(), [
    'browser-form-fill-draft', 'browser-navigate', 'browser-read', 'click-control', 'copy-file', 'delete-file',
    'list-folder', 'move-file', 'open-app', 'open-website', 'read-file', 'rename-file', 'run-powershell', 'run-routine',
    'search-folder', 'type-into-field'
  ]);

  // noop.wait: validateInput + execute (safe, in-process only).
  const wait = getAction('noop.wait');
  assert.deepEqual(wait.validateInput({ seconds: 0 }), { seconds: 0 });
  assert.deepEqual(wait.validateInput({ seconds: 30 }), { seconds: 30 });
  for (const bad of [{ seconds: -1 }, { seconds: 31 }, { seconds: 1.5 }, { seconds: 'forever' }, {}, null, undefined]) {
    assert.throws(() => wait.validateInput(bad), /integer "seconds" between 0 and 30/);
  }
  const waitResult = await wait.execute({ seconds: 0 });
  assert.equal(waitResult.summary, 'Waited 0s.');

  // open-app: validateInput only.
  const openApp = getAction('open-app');
  assert.deepEqual(openApp.validateInput({ appId: '  abc123  ' }), { appId: 'abc123' }, 'appId must be trimmed');
  for (const bad of [{}, { appId: '' }, { appId: '   ' }, { appId: 42 }, null]) {
    assert.throws(() => openApp.validateInput(bad), /appId from the approved-app list/);
  }

  // open-website: validateInput only, reuses the real computer-control.js websitePreview rules.
  const openWebsite = getAction('open-website');
  assert.deepEqual(openWebsite.validateInput({ url: 'https://example.com/docs' }), { url: 'https://example.com/docs' });
  for (const bad of [{ url: 'http://example.com' }, { url: 'file:///C:/private.txt' }, {}, { url: 42 }]) {
    assert.throws(() => openWebsite.validateInput(bad), /url|HTTPS/);
  }

  // list-folder: validateInput + real execute() against a real temp folder.
  const listFolder = getAction('list-folder');
  assert.deepEqual(listFolder.validateInput({ folderPath: `  ${sandbox}  ` }), { folderPath: sandbox });
  for (const bad of [{}, { folderPath: '' }, { folderPath: '   ' }, null]) {
    assert.throws(() => listFolder.validateInput(bad), /folderPath/);
  }
  fs.writeFileSync(path.join(sandbox, 'notes.txt'), 'contents');
  const listResult = await listFolder.execute({ folderPath: sandbox });
  assert.match(listResult.summary, /Listed 1 item\(s\)/);
  assert.equal(listResult.items.length, 1);
  assert.equal(listResult.items[0].name, 'notes.txt');
  assert.equal(listResult.capped, false);

  // read-file: Block D subset (documentId) unchanged.
  const readFile = getAction('read-file');
  assert.deepEqual(readFile.validateInput({ documentId: '  some-id  ' }), { documentId: 'some-id' });
  assert.deepEqual(readFile.validateInput({ filePath: '  C:\\some\\file.txt  ' }), { filePath: 'C:\\some\\file.txt' });
  for (const bad of [{}, { documentId: '' }, { filePath: '' }, null]) {
    assert.throws(() => readFile.validateInput(bad), /documentId or a filePath/);
  }
  configureDocuments(sandbox);
  const docPath = path.join(sandbox, 'doc-for-read-file.txt');
  fs.writeFileSync(docPath, 'Read-file action fixture content.');
  const [imported] = await importDocuments([docPath]);
  const readResult = await readFile.execute({ documentId: imported.id });
  assert.match(readResult.summary, /Read doc-for-read-file\.txt/);
  assert.match(readResult.text, /Read-file action fixture content/);
  assert.equal(readResult.truncated, false);
  await assert.rejects(() => readFile.execute({ documentId: 'not-a-real-id' }), /invalid|not.*available/i);

  // read-file (Block E full): filePath, gated on a live folder-permission grant.
  const grant = grantFolderPermission(sandbox, 'native-picker');
  assert.equal(grant.kind, 'folder');
  const arbitraryPath = path.join(sandbox, 'arbitrary.txt');
  fs.writeFileSync(arbitraryPath, 'Arbitrary file fixture content.');
  await assert.rejects(() => readFile.execute({ filePath: path.join(os.tmpdir(), 'not-granted-' + Date.now() + '.txt') }), /permission/i, 'reading outside any granted folder must fail closed');
  const arbitraryRead = await readFile.execute({ filePath: arbitraryPath });
  assert.match(arbitraryRead.summary, /Read arbitrary\.txt/);
  assert.match(arbitraryRead.text, /Arbitrary file fixture content/);

  // search-folder: gated on the same live grant.
  const searchFolder = getAction('search-folder');
  assert.deepEqual(searchFolder.validateInput({ folderPath: sandbox, query: 'notes' }), { folderPath: sandbox, query: 'notes' });
  for (const bad of [{}, { folderPath: sandbox }, { query: 'x' }, null]) {
    assert.throws(() => searchFolder.validateInput(bad), /folderPath|query/);
  }
  const searchResult = await searchFolder.execute({ folderPath: sandbox, query: 'notes' });
  assert.match(searchResult.summary, /Found 1 match/);
  assert.equal(searchResult.matches[0].name, 'notes.txt');

  // move-file / copy-file / rename-file: routine, real execute() against real files (fs only,
  // no electron dependency, so exercised in full here).
  const destFolder = fs.mkdtempSync(path.join(sandbox, 'dest-'));
  grantFolderPermission(destFolder, 'native-picker');
  const moveFile = getAction('move-file');
  const toMove = path.join(sandbox, 'to-move.txt');
  fs.writeFileSync(toMove, 'move me');
  const moveResult = await moveFile.execute(moveFile.validateInput({ sourcePath: toMove, destinationFolderPath: destFolder }));
  assert.equal(fs.existsSync(toMove), false, 'source must no longer exist after a move');
  assert.equal(fs.existsSync(moveResult.destination), true);

  const copyFile = getAction('copy-file');
  const toCopy = path.join(sandbox, 'to-copy.txt');
  fs.writeFileSync(toCopy, 'copy me');
  const copyResult = await copyFile.execute(copyFile.validateInput({ sourcePath: toCopy, destinationFolderPath: destFolder }));
  assert.equal(fs.existsSync(toCopy), true, 'source must still exist after a copy');
  assert.equal(fs.existsSync(copyResult.destination), true);
  await assert.rejects(() => copyFile.execute(copyFile.validateInput({ sourcePath: toCopy, destinationFolderPath: destFolder })), /already exists/, 'copy must never silently overwrite an existing destination file');

  const renameFile = getAction('rename-file');
  const toRename = path.join(sandbox, 'to-rename.txt');
  fs.writeFileSync(toRename, 'rename me');
  const renameResult = await renameFile.execute(renameFile.validateInput({ sourcePath: toRename, newName: 'renamed.txt' }));
  assert.equal(fs.existsSync(toRename), false);
  assert.equal(path.basename(renameResult.destination), 'renamed.txt');
  const newNameFixture = path.join(sandbox, 'newname-fixture.txt');
  fs.writeFileSync(newNameFixture, 'fixture');
  for (const bad of [{ sourcePath: newNameFixture, newName: 'a/b.txt' }, { sourcePath: newNameFixture, newName: '' }]) {
    assert.throws(() => renameFile.validateInput(bad), /newName/);
  }

  // Permission gate: an ungranted folder must fail closed for every folder/file action.
  const ungranted = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-ungranted-'));
  fs.writeFileSync(path.join(ungranted, 'nope.txt'), 'nope');
  await assert.rejects(() => searchFolder.execute({ folderPath: ungranted, query: 'nope' }), /permission/i);
  await assert.rejects(() => moveFile.execute(moveFile.validateInput({ sourcePath: path.join(ungranted, 'nope.txt'), destinationFolderPath: destFolder })), /permission/i);

  // delete-file: sensitive risk tier + validateInput (shape only, see below) + describe.
  const deleteFile = getAction('delete-file');
  const toDelete = path.join(sandbox, 'to-delete.txt');
  fs.writeFileSync(toDelete, 'delete me');
  const deleteInput = deleteFile.validateInput({ filePath: toDelete });
  assert.equal(deleteInput.filePath, toDelete, 'validateInput must NOT resolve/verify the path -- that is execute()\'s job now, see below');
  assert.match(deleteFile.describe(deleteInput), /Recycle Bin/);
  for (const bad of [{}, { filePath: '' }]) {
    assert.throws(() => deleteFile.validateInput(bad));
  }

  // Regression test: move/copy/rename/delete's validateInput must be SHAPE-ONLY and never touch
  // the filesystem. This was a real bug found in live testing -- validateInput originally called
  // fs.lstatSync directly, so a plan referencing a file that doesn't exist (a stale/mistyped
  // filename, or a race) threw an uncaught fs error during proposeTask (planning time, before
  // any popup was shown), silently killing the ENTIRE task with a generic "couldn't plan that"
  // and no detail. The fix: validateInput only checks shape now; a missing file must fail at
  // execute() instead, as ONE failed step with a clear reason, visible in the popup.
  const missingFile = path.join(sandbox, 'does-not-exist.txt');
  for (const action of [moveFile, copyFile, renameFile, deleteFile]) {
    const input = action === renameFile
      ? { sourcePath: missingFile, newName: 'x.txt' }
      : action === deleteFile
        ? { filePath: missingFile }
        : { sourcePath: missingFile, destinationFolderPath: destFolder };
    const validated = action.validateInput(input); // must NOT throw -- shape only
    await assert.rejects(() => action.execute(validated), /does not exist/, `${action.id} must fail at execute(), not validateInput(), for a missing file`);
  }

  // click-control / type-into-field (Block F, Step 25): registry-level wiring only -- shape
  // validation, describe(), and the isStepSensitive escalation. Real UI Automation against a
  // real running app is app-automation.js's own job, covered in check-app-automation.js.
  const clickControl = getAction('click-control');
  assert.deepEqual(clickControl.validateInput({ appId: ' abc ', controlName: ' Save ' }), { appId: 'abc', controlName: 'Save' });
  for (const bad of [{}, { appId: '' }, { appId: 'abc' }, { appId: 'abc', controlName: '' }, null]) {
    assert.throws(() => clickControl.validateInput(bad));
  }
  assert.equal(clickControl.isStepSensitive({ controlName: 'Delete' }), true, 'a control literally named Delete must escalate click-control to sensitive');
  assert.equal(clickControl.isStepSensitive({ controlName: 'Save' }), false, 'an ordinary control name must stay routine');
  assert.match(clickControl.describe({ controlName: 'Save' }), /Save/);

  const typeIntoField = getAction('type-into-field');
  assert.deepEqual(typeIntoField.validateInput({ appId: 'abc', controlName: 'Notes', text: 'hello' }), { appId: 'abc', controlName: 'Notes', text: 'hello' });
  for (const bad of [{}, { appId: 'abc', controlName: 'x' }, { appId: 'abc', controlName: 'x', text: '' }, { appId: 'abc', controlName: 'x', text: 'y'.repeat(4001) }]) {
    assert.throws(() => typeIntoField.validateInput(bad));
  }
  assert.equal(typeIntoField.isStepSensitive({ controlName: 'Password' }), true, 'a credential-shaped field must escalate type-into-field to sensitive per AgentContract.md Section 7');
  assert.equal(typeIntoField.isStepSensitive({ controlName: 'Notes' }), false);
  const typeAudit = typeIntoField.redactForAudit({ appId: 'abc', controlName: 'Password', text: 'hunter2hunter2' });
  assert.equal(typeAudit.characterCount, 14, 'redactForAudit must log a character count, never the raw typed text');
  assert.equal('text' in typeAudit, false, 'redactForAudit must never carry the raw text field at all');

  // run-powershell (Block F, Step 26): registry-level wiring + the toggle-off guard, which is
  // cheap and in-process (no spawn), unlike the rest of powershell-control.js's own coverage.
  const runPowershell = getAction('run-powershell');
  assert.deepEqual(runPowershell.validateInput({ command: '  Get-Process  ' }), { command: 'Get-Process' });
  for (const bad of [{}, { command: '' }, { command: 'x'.repeat(4001) }]) {
    assert.throws(() => runPowershell.validateInput(bad));
  }
  assert.equal(runPowershell.isStepSensitive({ command: 'Remove-Item C:\\temp\\x.txt' }), true, 'a destructive command must escalate run-powershell to sensitive');
  assert.equal(runPowershell.isStepSensitive({ command: 'Get-Process' }), false);
  assert.match(runPowershell.redactForAudit({ command: 'Get-Content -Path x; password: hunter2hunter2' }).command, /\[redacted\]/);
  await assert.rejects(() => runPowershell.execute({ command: 'Get-Process' }), /Full System Control.*turned off/i, 'run-powershell must refuse to execute while the toggle is off, checked fresh at execute() time');

  console.log('Action-registry checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.rmSync(permSandbox, { recursive: true, force: true });
  fs.rmSync(psSandbox, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
