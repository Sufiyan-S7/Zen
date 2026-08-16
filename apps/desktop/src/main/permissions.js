// Block E, Step 22: persistent folder-permission grants, following docs/AgentContract.md
// Section 3's permission-record schema exactly (id, kind, scope, grantedAt, revokedAt,
// grantedVia). This reuses v1.0's approved-apps persistent-JSON-file pattern
// (computer-control.js's configureApprovedApps/readApprovedApps/writeApprovedApps) rather than
// inventing a second storage mechanism -- same shape, a different file (folder-permissions.json)
// and a different, richer record (Section 3's schema is generic across folder/app/browser; only
// "folder" is implemented here, per Step 22's scope -- "app" keeps using its existing v1.0
// approved-apps.json unchanged, and "browser" is Block G's Day 15 grant, not this one).
//
// A revoked record is never deleted, only marked revoked (revokedAt set) -- Section 3 requires
// this so the audit trail can still explain why a later step failed closed. Every action that
// touches a folder must resolve against a LIVE (unrevoked) record immediately before executing,
// never a cached grant from earlier in the task -- see resolveActiveFolderGrant, called fresh
// by each of search-folder/read-file/move-file/copy-file/rename-file/delete-file in
// action-registry.js right before that action runs.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateFolderPath, isPathInsideRoot } = require('./computer-control');

let permissionsPath = '';

function configurePermissions(userDataPath) {
  permissionsPath = path.join(userDataPath, 'folder-permissions.json');
}

// Block G, Step 27: the browser-access permission (Section 3's "browser" kind) is stored in the
// SAME file as folder grants -- same generic record shape, just a different kind -- rather than
// a third storage mechanism. readPermissions() now accepts either kind at the storage layer;
// each kind-specific function below (folder vs. browser) re-filters by its own kind before using
// a record, so a browser record can never be mistaken for a folder grant or vice versa even
// though they share one file.
function readPermissions() {
  if (!permissionsPath) throw new Error('Zen has not prepared local permissions yet.');
  try {
    const stored = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
    if (!Array.isArray(stored)) throw new Error('Invalid permissions list.');
    return stored.filter((entry) => entry && typeof entry.id === 'string' && (entry.kind === 'folder' || entry.kind === 'browser')
      && typeof entry.scope === 'string' && typeof entry.grantedAt === 'string');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error('Zen could not read the local permissions list.');
  }
}

function writePermissions(records) {
  fs.writeFileSync(permissionsPath, JSON.stringify(records, null, 2), 'utf8');
}

// Section 3's "id" -- a stable hash of the resolved scope, matching computer-control.js's
// appEntry() id derivation (sha256 of the resolved path, not a random uuid), so re-granting the
// same folder after a revoke is idempotent to identify even though a NEW record is written.
function folderPermissionId(resolvedFolder) {
  return crypto.createHash('sha256').update(`folder:${resolvedFolder.toLowerCase()}`).digest('hex').slice(0, 24);
}

// Grants are additive, not merged: if the exact folder already has a LIVE grant, that existing
// record is returned unchanged (idempotent) rather than duplicated. If the folder was previously
// revoked, a fresh record is written -- the old, revoked one stays in the file per Section 3.
function grantFolderPermission(folderPath, grantedVia) {
  if (grantedVia !== 'native-picker' && grantedVia !== 'agent-permissions-page') {
    throw new Error('Invalid permission grant source.');
  }
  const resolved = validateFolderPath(folderPath);
  const records = readPermissions();
  const existingLive = records.find((entry) => entry.kind === 'folder' && entry.scope.toLowerCase() === resolved.toLowerCase() && !entry.revokedAt);
  if (existingLive) return existingLive;
  const record = {
    id: folderPermissionId(resolved) + '_' + crypto.randomUUID().slice(0, 8),
    kind: 'folder',
    scope: resolved,
    grantedAt: new Date().toISOString(),
    revokedAt: null,
    grantedVia
  };
  records.push(record);
  writePermissions(records);
  return record;
}

function revokeFolderPermission(id) {
  const records = readPermissions();
  const record = records.find((entry) => entry.id === id && entry.kind === 'folder');
  if (!record) throw new Error('That permission no longer exists.');
  if (!record.revokedAt) record.revokedAt = new Date().toISOString();
  writePermissions(records);
  return record;
}

// Section 6: permission records are retained until explicitly revoked -- listing returns every
// record (including revoked ones) so the permissions page can show grant history, not just
// what's currently active.
function listPermissions() {
  return readPermissions().filter((entry) => entry.kind === 'folder').sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

// Block G, Step 27: the browser-access permission. Unlike folder grants there is exactly one
// meaningful scope ("browser" itself, per Section 3's schema row: "scope: <folder path, or app
// id, or 'browser'>") -- this is a single persistent on/off consent, not a set of distinct
// resources, so grantBrowserPermission is idempotent against ANY existing live browser record
// rather than matching on scope equality the way folder grants do.
const BROWSER_SCOPE = 'browser';

function browserPermissionId() {
  return crypto.createHash('sha256').update(`browser:${BROWSER_SCOPE}:${crypto.randomUUID()}`).digest('hex').slice(0, 24);
}

// grantedVia is deliberately restricted to 'agent-permissions-page' only -- there is no file/app
// to pick for a browser grant (unlike folder's native-picker option), so accepting that value
// here would be meaningless and is refused rather than silently ignored.
function grantBrowserPermission(grantedVia) {
  if (grantedVia !== 'agent-permissions-page') throw new Error('Invalid permission grant source.');
  const records = readPermissions();
  const existingLive = records.find((entry) => entry.kind === 'browser' && !entry.revokedAt);
  if (existingLive) return existingLive;
  const record = {
    id: browserPermissionId(),
    kind: 'browser',
    scope: BROWSER_SCOPE,
    grantedAt: new Date().toISOString(),
    revokedAt: null,
    grantedVia
  };
  records.push(record);
  writePermissions(records);
  return record;
}

function revokeBrowserPermission(id) {
  const records = readPermissions();
  const record = records.find((entry) => entry.id === id && entry.kind === 'browser');
  if (!record) throw new Error('That permission no longer exists.');
  if (!record.revokedAt) record.revokedAt = new Date().toISOString();
  writePermissions(records);
  return record;
}

function listBrowserPermissions() {
  return readPermissions().filter((entry) => entry.kind === 'browser').sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

// The gate every browser-scoped action (browser-navigate/browser-read/browser-form-fill-draft)
// calls immediately before executing -- same re-resolve-at-run-time convention as
// resolveActiveFolderGrant, never a cached grant from earlier in the task.
function requireActiveBrowserGrant() {
  const live = readPermissions().find((entry) => entry.kind === 'browser' && !entry.revokedAt);
  if (!live) {
    throw new Error('Zen does not have permission to use the browser. Grant browser access first (Activity -> Browser permissions).');
  }
  return live;
}

// The gate every folder-scoped action calls immediately before executing. candidatePath must
// resolve to either an exact granted folder or something inside one -- symlinks are resolved via
// validateFolderPath/fs.realpathSync before the containment check, matching the existing
// isPathInsideRoot pattern used by list-folder/search-folder in computer-control.js, so a
// symlink can't be used to point outside the granted scope.
function resolveActiveFolderGrant(candidatePath) {
  if (typeof candidatePath !== 'string' || !candidatePath.trim()) {
    throw new Error('A folder or file path is required.');
  }
  const resolvedCandidate = path.resolve(candidatePath.trim());
  const live = readPermissions().filter((entry) => entry.kind === 'folder' && !entry.revokedAt);
  const grant = live.find((entry) => {
    const scope = entry.scope;
    return resolvedCandidate.toLowerCase() === scope.toLowerCase() || isPathInsideRoot(resolvedCandidate, scope);
  });
  if (!grant) {
    throw new Error('Zen does not have permission for that folder. Grant folder access first (Activity -> Folder permissions).');
  }
  return grant;
}

module.exports = {
  configurePermissions,
  grantFolderPermission,
  revokeFolderPermission,
  listPermissions,
  resolveActiveFolderGrant,
  grantBrowserPermission,
  revokeBrowserPermission,
  listBrowserPermissions,
  requireActiveBrowserGrant
};
