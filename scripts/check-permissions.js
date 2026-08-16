// Block E, Step 22 fixtures for apps/desktop/src/main/permissions.js -- persistent
// folder-permission grants. Mirrors check-computer-control.js's convention: a real temp
// userData sandbox, real filesystem, no mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  configurePermissions, grantFolderPermission, revokeFolderPermission, listPermissions, resolveActiveFolderGrant
} = require('../apps/desktop/src/main/permissions');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-permissions-'));
const grantedFolder = fs.mkdtempSync(path.join(sandbox, 'granted-'));
const ungrantedFolder = fs.mkdtempSync(path.join(sandbox, 'ungranted-'));
try {
  configurePermissions(sandbox);

  // Nothing granted yet -- resolveActiveFolderGrant must fail closed, never assume access.
  assert.equal(listPermissions().length, 0);
  assert.throws(() => resolveActiveFolderGrant(grantedFolder), /permission/i);
  assert.throws(() => resolveActiveFolderGrant(''), /path is required/);

  // grantFolderPermission: Section 3's exact record shape.
  const record = grantFolderPermission(grantedFolder, 'native-picker');
  assert.equal(record.kind, 'folder');
  assert.equal(record.scope.toLowerCase(), fs.realpathSync(grantedFolder).toLowerCase());
  assert.equal(record.revokedAt, null);
  assert.equal(record.grantedVia, 'native-picker');
  assert.equal(typeof record.grantedAt, 'string');
  assert.throws(() => grantFolderPermission(grantedFolder, 'made-up-source'), /Invalid permission grant source/);

  // Idempotent re-grant of the exact same live folder returns the same record, not a duplicate.
  const regrant = grantFolderPermission(grantedFolder, 'agent-permissions-page');
  assert.equal(regrant.id, record.id);
  assert.equal(listPermissions().length, 1);

  // resolveActiveFolderGrant: exact folder and anything inside it resolve; outside does not.
  assert.equal(resolveActiveFolderGrant(grantedFolder).id, record.id);
  const nested = path.join(grantedFolder, 'sub', 'file.txt');
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.writeFileSync(nested, 'x');
  assert.equal(resolveActiveFolderGrant(nested).id, record.id);
  assert.throws(() => resolveActiveFolderGrant(ungrantedFolder), /permission/i);

  // revokeFolderPermission: record stays (Section 6 retention), but grant no longer resolves.
  const revoked = revokeFolderPermission(record.id);
  assert.equal(typeof revoked.revokedAt, 'string');
  assert.equal(listPermissions().length, 1, 'a revoked record must stay in the list, never be deleted');
  assert.throws(() => resolveActiveFolderGrant(grantedFolder), /permission/i, 'a revoked grant must no longer authorize anything');
  assert.throws(() => revokeFolderPermission('not-a-real-id'), /no longer exists/);

  // Re-granting the same folder after a revoke writes a FRESH record, distinct id, old one kept.
  const secondGrant = grantFolderPermission(grantedFolder, 'native-picker');
  assert.notEqual(secondGrant.id, record.id);
  assert.equal(listPermissions().length, 2);
  assert.equal(resolveActiveFolderGrant(grantedFolder).id, secondGrant.id);

  console.log('Permissions checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
