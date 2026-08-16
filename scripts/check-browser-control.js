// Block G, Step 27-28 fixtures for apps/desktop/src/main/browser-control.js (deterministic
// surface) plus action-registry.js's browser-navigate/browser-read/browser-form-fill-draft
// entries. Mirrors check-app-automation.js's convention exactly: real logic is exercised for
// real, but launching a real, debug-enabled Chrome against the owner's real profile is
// deliberately NOT done here -- that needs an interactive desktop session, requires the owner's
// ordinary Chrome to be closed first (browser-control.js fails closed otherwise), and would make
// `npm run check` non-deterministic/hang in a headless or remote context, breaking the "passes
// in full, permanently" bar every check script in this suite holds itself to. That real,
// end-to-end Chrome round trip lives in check-browser-control-live.js instead -- a separate,
// manually-run opt-in script (npm run check:browser-live), not part of `npm run check`.
//
// What IS exercised here, all real: the own-window/current-window handoff state machine
// (setHandoffMode/handoffStatus/onBrowserActiveChange, including the confirmed=true
// requirement) with no Chrome involved at all; findChromeExecutable/realChromeUserDataDir
// against the real filesystem (they only ever fs.existsSync, never launch anything); the
// permission gate integration proven end-to-end -- with no browser grant in a fresh sandbox,
// browserNavigate/browserRead/browserFormFillDraft must all throw the permission error
// immediately, before ever attempting to reach Chrome; and the full registry-entry surface
// (validateInput/describe/redactForAudit) for all three browser-* actions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CDP_PORT, setHandoffMode, handoffStatus, onBrowserActiveChange,
  browserNavigate, browserRead, browserFormFillDraft,
  findChromeExecutable, realChromeUserDataDir
} = require('../apps/desktop/src/main/browser-control');
const { configurePermissions } = require('../apps/desktop/src/main/permissions');
const { ACTIONS } = require('../apps/desktop/src/main/action-registry');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-browser-control-'));
try {
  configurePermissions(sandbox);

  // CDP_PORT: fixed, deliberately non-default (not the common 9222), a valid port number.
  assert.equal(CDP_PORT, 9331);
  assert.ok(Number.isInteger(CDP_PORT) && CDP_PORT > 1024 && CDP_PORT < 65536);

  // Permission gate: no browser grant yet in this fresh sandbox -- every browser-* export must
  // fail closed with the permission error BEFORE touching Chrome at all, never a Chrome-shaped
  // error, never silently doing nothing.
  await assert.rejects(() => browserNavigate('https://example.com'), /permission to use the browser/i);
  await assert.rejects(() => browserRead(), /permission to use the browser/i);
  await assert.rejects(() => browserFormFillDraft(0, 'x'), /permission to use the browser/i);

  // Handoff state machine: own-window is the default, current-window requires confirmed===true
  // exactly (Step 27's confirmation-toggle), and switching modes fires the active-change
  // callback that main.js uses to show/hide the "Zen is active" indicator.
  assert.deepEqual(handoffStatus(), { mode: 'own-window', confirmed: false });
  assert.throws(() => setHandoffMode('not-a-real-mode', true), /Invalid browser handoff mode/);
  assert.throws(() => setHandoffMode('current-window', false), /requires explicit confirmation/);
  assert.throws(() => setHandoffMode('current-window'), /requires explicit confirmation/);
  assert.equal(handoffStatus().mode, 'own-window', 'a rejected handoff attempt must never change the mode');

  const activeEvents = [];
  onBrowserActiveChange((active) => activeEvents.push(active));
  const confirmed = setHandoffMode('current-window', true);
  assert.deepEqual(confirmed, { mode: 'current-window', confirmed: true });
  assert.deepEqual(handoffStatus(), { mode: 'current-window', confirmed: true });
  assert.deepEqual(activeEvents, [true], 'switching to current-window must emit an active=true event');

  const reverted = setHandoffMode('own-window', false);
  assert.deepEqual(reverted, { mode: 'own-window', confirmed: false });
  assert.deepEqual(activeEvents, [true, false], 'switching back to own-window must emit an active=false event');

  // findChromeExecutable / realChromeUserDataDir: real filesystem checks only, never launch
  // anything. Assumes a normal Windows dev machine with Chrome installed, same assumption this
  // whole block already depends on (browser-control.js has no fallback browser).
  const chromePath = findChromeExecutable();
  assert.ok(fs.existsSync(chromePath), 'findChromeExecutable must return a real, existing path');
  const profileDir = realChromeUserDataDir();
  assert.ok(fs.existsSync(profileDir), 'realChromeUserDataDir must return a real, existing folder');

  // Registry-entry surface for all three browser-* actions: shape-only validateInput, describe,
  // and (for browser-form-fill-draft) redactForAudit -- never the raw filled text, same
  // never-raw-content convention as type-into-field.
  const navigateAction = ACTIONS['browser-navigate'];
  assert.equal(navigateAction.riskTier, 'routine');
  assert.deepEqual(navigateAction.validateInput({ url: 'https://example.com' }), { url: 'https://example.com/' });
  assert.throws(() => navigateAction.validateInput({}), /requires a url/);
  assert.throws(() => navigateAction.validateInput({ url: 'http://example.com' }), /HTTPS/);
  assert.match(navigateAction.describe({ url: 'https://example.com/' }), /example\.com/);

  const readAction = ACTIONS['browser-read'];
  assert.equal(readAction.riskTier, 'routine');
  assert.deepEqual(readAction.validateInput(), {});
  assert.match(readAction.describe(), /untrusted page content/);

  const fillAction = ACTIONS['browser-form-fill-draft'];
  assert.equal(fillAction.riskTier, 'routine');
  assert.deepEqual(fillAction.validateInput({ fieldIndex: 2, value: 'hello' }), { fieldIndex: 2, value: 'hello' });
  assert.throws(() => fillAction.validateInput({ fieldIndex: -1, value: 'x' }), /fieldIndex/);
  assert.throws(() => fillAction.validateInput({ fieldIndex: 0, value: '' }), /value to fill/);
  assert.throws(() => fillAction.validateInput({ fieldIndex: 0, value: 'x'.repeat(2001) }), /2,000 characters/);
  assert.match(fillAction.describe({ fieldIndex: 3, value: 'secret' }), /does not submit, checkout, or touch credential fields/i);
  assert.deepEqual(fillAction.redactForAudit({ fieldIndex: 3, value: 'a real password' }), { fieldIndex: 3, characterCount: 15 }, 'redactForAudit must never leak the raw filled text');

  console.log('Browser-control checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
})();
