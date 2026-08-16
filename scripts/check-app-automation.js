// Block F, Step 25 fixtures for apps/desktop/src/main/app-automation.js -- the accessibility-
// first click-control/type-into-field automation layer. Mirrors the project's real-modules,
// real-sandboxes convention: no electron dependency here (app-automation.js only needs
// computer-control.js's approvedApp(), which is plain fs/crypto), so this runs under plain
// `node` exactly like every other check script.
//
// Real, focused UI Automation against a real running window (actually clicking/typing) is
// deliberately NOT exercised here -- that needs an interactive desktop session and would make
// `npm run check` non-deterministic/hang in a headless or remote context, breaking the "passes
// in full, permanently" bar every other check script in this suite holds itself to. What IS
// exercised is real: a real approved-app fixture, a real spawn of the real, checked-in
// find-process.ps1 script (safe -- it is read-only and the fixture executable is never actually
// running, so it deterministically returns not-running), and the full validation/classification
// surface (requireControlName, isControlNameSensitive, isFieldCredential, the text-length cap).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  listControls, clickControl, typeIntoField, isControlNameSensitive, isFieldCredential, requireControlName
} = require('../apps/desktop/src/main/app-automation');
const { configureApprovedApps, approveApp } = require('../apps/desktop/src/main/computer-control');

(async () => {
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-app-automation-'));
try {
  configureApprovedApps(sandbox);

  // requireControlName: shape-only validation.
  assert.equal(requireControlName('  Save  '), 'Save');
  for (const bad of ['', '   ', 'x'.repeat(201), 42, null, undefined]) {
    assert.throws(() => requireControlName(bad), /control name is required/);
  }

  // isControlNameSensitive: the Block F Step 25 gap-close, per AgentContract.md Section 7's
  // flagged judgment call. Covers each of the fixed Section 2 categories this maps to
  // (delete/overwrite, send/publish/upload, install, purchase, account/security) plus a spot
  // check that ordinary control names stay routine.
  for (const name of ['Delete', 'delete all', 'Remove', 'Empty Trash', 'Send', 'Submit', 'Publish', 'Upload', 'Buy Now', 'Purchase', 'Checkout', 'Install', 'Uninstall', 'Deactivate', 'Change Password', 'Close Account']) {
    assert.equal(isControlNameSensitive(name), true, `"${name}" must classify sensitive`);
  }
  for (const name of ['Save', 'Cancel', 'OK', 'Next', 'Search', 'Open', 'Close', 'Settings', '']) {
    assert.equal(isControlNameSensitive(name), false, `"${name}" must classify routine`);
  }
  assert.equal(isControlNameSensitive(null), false, 'a non-string control name must never throw or match');

  // isFieldCredential: the narrower, contract-fixed (not judgment-call) rule for type-into-field.
  for (const name of ['Password', 'Confirm Password', 'PIN', 'One-time passcode', 'Verification code', '2FA code']) {
    assert.equal(isFieldCredential(name), true, `"${name}" must classify as a credential field`);
  }
  for (const name of ['Notes', 'Search', 'Username', 'Email', 'First name']) {
    assert.equal(isFieldCredential(name), false, `"${name}" must NOT classify as a credential field (Username/Email deliberately excluded -- only the secret itself is gated)`);
  }

  // typeIntoField: the 4,000-character cap is enforced before any process is spawned.
  const dummyExe = path.join(sandbox, 'not-a-real-app.exe');
  fs.writeFileSync(dummyExe, 'not executed');
  const approved = approveApp(dummyExe);
  await assert.rejects(() => typeIntoField(approved.id, 'Notes', 'y'.repeat(4001)), /under 4,000 characters/);

  // Real spawn of the real, checked-in find-process.ps1 against an approved app that is
  // definitely not running -- deterministic, read-only, no GUI/focus dependency. Exercises the
  // real resolveApprovedAppProcess() failure path all three public functions share.
  await assert.rejects(() => listControls(approved.id), /does not appear to be running/);
  await assert.rejects(() => clickControl(approved.id, 'Save'), /does not appear to be running/);
  await assert.rejects(() => typeIntoField(approved.id, 'Notes', 'hello'), /does not appear to be running/);

  // An unapproved appId must fail closed via computer-control.js's own approvedApp(), before
  // app-automation.js ever spawns anything.
  await assert.rejects(() => clickControl('not-a-real-app-id', 'Save'), /invalid/i);
  await assert.rejects(() => clickControl('a'.repeat(24), 'Save'), /not approved/i);

  console.log('App-automation checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
})().catch((error) => { console.error(error); process.exitCode = 1; });
