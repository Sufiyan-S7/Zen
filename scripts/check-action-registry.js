// Block D, Step 16 fixtures for apps/desktop/src/main/action-registry.js -- the initial action
// registry subset (noop.wait, open-app, open-website, list-folder, read-file). Mirrors the
// existing check-computer-control.js/check-documents.js style: real modules, temp sandboxes, no
// mocks for anything that has no real-world side effect.
//
// open-app.execute() and open-website.execute() are deliberately NOT exercised here -- they
// spawn a real process / open a real browser, which check-computer-control.js's own convention
// already avoids (it validates without ever launching an app). Only their validateInput() is
// checked. Flagged per INSTRUCTIONS.md Section 5 as a scope choice, not an oversight.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ACTIONS, getAction, listActionsForPlanner } = require('../apps/desktop/src/main/action-registry');
const { configureDocuments, importDocuments } = require('../apps/desktop/src/main/documents');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-action-registry-'));
try {
  // Registration surface.
  assert.equal(getAction('noop.wait').riskTier, 'routine');
  assert.equal(getAction('open-app').riskTier, 'routine');
  assert.equal(getAction('open-website').riskTier, 'routine');
  assert.equal(getAction('list-folder').riskTier, 'routine');
  assert.equal(getAction('read-file').riskTier, 'routine');
  assert.equal(getAction('not-a-real-action'), null, 'an unregistered action id must resolve to null, never throw or invent a default');
  assert.equal(Object.keys(ACTIONS).length, 5, 'exactly the 5 Block D actions (incl. noop.wait) should be registered so far');

  const plannerActions = listActionsForPlanner();
  assert.equal(plannerActions.length, 4, 'noop.wait is an internal test action and must never be offered to the planner');
  assert.ok(!plannerActions.some((action) => action.id === 'noop.wait'));
  assert.deepEqual(plannerActions.map((action) => action.id).sort(), ['list-folder', 'open-app', 'open-website', 'read-file']);

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

  // read-file: validateInput + real execute() against a real imported document.
  const readFile = getAction('read-file');
  assert.deepEqual(readFile.validateInput({ documentId: '  some-id  ' }), { documentId: 'some-id' });
  for (const bad of [{}, { documentId: '' }, null]) {
    assert.throws(() => readFile.validateInput(bad), /documentId from Zen's imported-document list/);
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

  console.log('Action-registry checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
