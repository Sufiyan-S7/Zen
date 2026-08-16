// Block G, Step 27-28 -- OPT-IN, MANUAL-ONLY live Chrome round trip. NOT part of `npm run
// check` (see check-browser-control.js's header for why). Run this yourself with:
//   npm run check:browser-live
//
// WHAT THIS DOES, FOR REAL, ON THIS COMPUTER:
//   - Requires your ordinary Chrome to be fully closed first (browser-control.js fails closed
//     otherwise -- this script does not close it for you).
//   - Launches a real, debug-enabled Chrome using YOUR REAL PROFILE (bookmarks, saved logins,
//     cookies -- all genuinely there, per Step 27's "real profile" requirement).
//   - Navigates it to https://example.com (a stable, IANA-reserved page with no real content,
//     chosen specifically because browser-navigate only accepts real https:// URLs -- there is
//     no self-contained about:blank/data: URL path through the actual registered action).
//   - Reads the page and asserts real content came back.
//   - Attempts a form-fill-draft against a field index that does not exist on example.com (it
//     has none), proving the real fill round trip reaches Chrome and fails the way the code
//     says it will, without needing to hand-author a live test page.
//   - Leaves that Chrome window OPEN afterward -- there is no exported disconnect/kill in
//     browser-control.js (matches what actually happens when Zen itself uses browser control;
//     the window is meant to be reused). Close it yourself when done.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grantBrowserPermission } = require('../apps/desktop/src/main/permissions');
const { configurePermissions } = require('../apps/desktop/src/main/permissions');
const { browserNavigate, browserRead, browserFormFillDraft } = require('../apps/desktop/src/main/browser-control');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-browser-control-live-'));
try {
  configurePermissions(sandbox);
  grantBrowserPermission('agent-permissions-page');

  console.log('Attaching to a real, debug-enabled Chrome (your ordinary Chrome must be closed)...');
  const navigated = await browserNavigate('https://example.com');
  assert.match(navigated.title, /example/i, 'the real page title should mention "Example"');
  console.log('Navigated:', navigated);

  const read = await browserRead();
  assert.ok(read.text && read.text.length > 0, 'browserRead should return real, non-empty page text');
  assert.equal(read.source, 'browser-read:untrusted-page-content');
  console.log('Read', read.text.length, 'characters. First 80:', read.text.slice(0, 80));

  await assert.rejects(
    () => browserFormFillDraft(0, 'test value'),
    /no longer on the page/i,
    'example.com has no form fields, so a real fill attempt should fail this specific way'
  );
  console.log('Form-fill-draft correctly rejected a nonexistent field on the live page.');

  console.log('\nLive browser-control round trip passed. The Chrome window Zen opened is still running -- close it yourself when done.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
})();
