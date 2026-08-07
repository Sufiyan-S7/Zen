const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const control = require('../apps/desktop/src/main/computer-control');

function mustReject(work, expectedMessage) {
  assert.throws(work, new RegExp(expectedMessage));
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-computer-control-'));

try {
  assert.deepEqual(control.websitePreview('https://example.com/docs').hostname, 'example.com');
  for (const url of ['http://example.com', 'file:///C:/private.txt', 'https://user:secret@example.com', 'https://example.com/#hidden']) {
    mustReject(() => control.websitePreview(url), 'only|details|Remove');
  }

  assert.equal(control.isBrowserLauncher('C:\\Program Files\\Google\\Chrome\\Application\\chrome_proxy.exe'), true);
  assert.equal(control.isBrowserLauncher('C:\\Program Files\\Example\\example.exe'), false);
  const chromeLauncher = path.join(sandbox, 'chrome_proxy.exe');
  const firefoxLauncher = path.join(sandbox, 'firefox.exe');
  fs.writeFileSync(chromeLauncher, 'not executed');
  fs.writeFileSync(firefoxLauncher, 'not executed');
  const browserWebApp = control.browserWebAppEntry(chromeLauncher, 'My web app', 'https://example.com/work');
  assert.equal(browserWebApp.kind, 'browser-web-app');
  assert.deepEqual(browserWebApp.arguments, ['--app=https://example.com/work']);
  mustReject(() => control.previewApp(chromeLauncher), 'browser');
  mustReject(() => control.browserWebAppEntry(firefoxLauncher, 'My web app', 'https://example.com'), 'Chromium');

  for (const query of ['', ' '.repeat(3), 'x'.repeat(201), 'unsafe\u0000query']) {
    mustReject(() => control.validateSearchQuery(query), 'search term|invalid characters');
  }

  const nested = path.join(sandbox, 'nested');
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(sandbox, 'Report.txt'), 'not examined');
  fs.writeFileSync(path.join(nested, 'report-final.md'), 'not examined');
  fs.writeFileSync(path.join(nested, 'notes.txt'), 'not examined');
  const nestedResult = control.searchFolderNames(sandbox, 'REPORT');
  assert.equal(nestedResult.count, 2);
  assert.ok(nestedResult.matches.every((match) => match.path.startsWith(fs.realpathSync(sandbox))));
  assert.ok(nestedResult.matches.every((match) => match.name.toLowerCase().includes('report')));

  const capped = path.join(sandbox, 'capped');
  fs.mkdirSync(capped);
  for (let index = 0; index < 101; index += 1) fs.writeFileSync(path.join(capped, `match-${index}.txt`), 'not examined');
  const cappedResult = control.searchFolderNames(capped, 'match');
  assert.equal(cappedResult.count, 100);
  assert.equal(cappedResult.capped, true);

  const tools = control.toolRegistryStatus();
  assert.deepEqual(tools.map((tool) => tool.id), ['open-website', 'open-approved-app', 'search-folder']);
  assert.ok(tools.every((tool) => tool.enabled && tool.requiresConfirmation));

  console.log('Computer-control safety checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
