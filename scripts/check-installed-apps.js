// v2.1 follow-up: coverage for installed-apps.js. Runs under plain `node` (like every other
// check script), so it cannot use Electron's real shell.readShortcutLink -- instead it builds a
// fake shortcut->target map and passes a matching fake resolver function, exercising the exact
// same dedupe/filter/sort logic listInstalledApps() applies to real Electron-resolved shortcuts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listInstalledApps, defaultStartMenuDirs } = require('../apps/desktop/src/main/installed-apps');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-installed-apps-'));
const allUsersDir = path.join(sandbox, 'all-users', 'Programs');
const currentUserDir = path.join(sandbox, 'current-user', 'Programs', 'Publisher Folder');
fs.mkdirSync(allUsersDir, { recursive: true });
fs.mkdirSync(currentUserDir, { recursive: true });

// Real target files -- listInstalledApps stat()s the resolved target, so these must actually
// exist on disk for a fixture to be accepted.
const notepadTarget = path.join(sandbox, 'Notepad.exe');
const calcTarget = path.join(sandbox, 'Calculator.exe');
const ghostTarget = path.join(sandbox, 'GhostApp.exe'); // deliberately never created
fs.writeFileSync(notepadTarget, 'fake exe');
fs.writeFileSync(calcTarget, 'fake exe');

// Shortcut files -- content doesn't matter, only their paths are used as keys into the fake
// resolver map below. Two shortcuts point at the same target (Notepad, once at top level and
// once nested under a publisher folder) to exercise dedupe-by-target.
const notepadShortcut1 = path.join(allUsersDir, 'Notepad.lnk');
const notepadShortcut2 = path.join(currentUserDir, 'Notepad (copy).lnk');
const calcShortcut = path.join(allUsersDir, 'Calculator.lnk');
const brokenShortcut = path.join(allUsersDir, 'Broken.lnk'); // resolver throws for this one
const missingTargetShortcut = path.join(allUsersDir, 'Uninstall Ghost App.lnk'); // target never created
const nonExeShortcut = path.join(allUsersDir, 'Some Folder.lnk'); // target isn't an .exe
const notAShortcut = path.join(allUsersDir, 'readme.txt'); // wrong extension, must be ignored entirely
for (const p of [notepadShortcut1, notepadShortcut2, calcShortcut, brokenShortcut, missingTargetShortcut, nonExeShortcut, notAShortcut]) {
  fs.writeFileSync(p, '');
}

const fakeTargets = new Map([
  [notepadShortcut1, notepadTarget],
  [notepadShortcut2, notepadTarget],
  [calcShortcut, calcTarget],
  [missingTargetShortcut, ghostTarget],
  [nonExeShortcut, path.join(sandbox, 'SomeFolder')]
]);

function fakeReadShortcutLink(shortcutPath) {
  if (shortcutPath === brokenShortcut) throw new Error('simulated broken shortcut');
  const target = fakeTargets.get(shortcutPath);
  if (!target) throw new Error(`no fixture target for ${shortcutPath}`);
  return { target };
}

// --- Core behavior: real, existing .exe targets are returned; duplicates collapse to one
// entry; broken/missing-target/non-.exe/wrong-extension entries are all silently skipped rather
// than throwing or polluting the list. ---
const apps = listInstalledApps(fakeReadShortcutLink, [allUsersDir, currentUserDir]);
assert.equal(apps.length, 2, 'exactly Notepad and Calculator should survive filtering/dedup');
assert.deepEqual(apps.map((a) => a.name).sort(), ['Calculator', 'Notepad'], 'sorted alphabetically by name');
const notepadEntry = apps.find((a) => a.name === 'Notepad');
assert.equal(notepadEntry.target, notepadTarget, 'the two Notepad shortcuts must dedupe to one entry with the real target path');

// --- A shortcut pointing at a target that no longer exists on disk must be excluded, not
// surfaced as a broken "Approve" button the owner would click into a dead end. ---
assert.ok(!apps.some((a) => a.target === ghostTarget), 'a shortcut whose target file does not exist must be filtered out');

// --- A shortcut resolving to a non-.exe target (e.g. a folder) must be excluded -- Zen's
// approved-apps feature only ever supports real .exe files. ---
assert.ok(!apps.some((a) => a.name === 'Some Folder'), 'a non-.exe target must be filtered out');

// --- Missing directories (e.g. a fresh Windows account with no all-users Start Menu access)
// must not throw -- the listing degrades to whatever directories ARE readable. ---
const partial = listInstalledApps(fakeReadShortcutLink, [allUsersDir, path.join(sandbox, 'does-not-exist')]);
assert.equal(partial.length, 2, 'a missing/inaccessible directory must be skipped, not fatal');

// --- No readShortcutLink function provided -- fails closed with a clear error, never silently
// returns an empty list that could be mistaken for "no apps installed". ---
assert.throws(() => listInstalledApps(null, [allUsersDir]), /requires a readShortcutLink function/);

// --- defaultStartMenuDirs reads the real Windows env vars and returns both standard locations
// when present. ---
const dirs = defaultStartMenuDirs({ ProgramData: 'C:\\ProgramData', APPDATA: 'C:\\Users\\test\\AppData\\Roaming' });
assert.equal(dirs.length, 2);
assert.ok(dirs[0].includes('Start Menu'));
assert.deepEqual(defaultStartMenuDirs({}), [], 'missing env vars must yield an empty list, not throw');

fs.rmSync(sandbox, { recursive: true, force: true });
console.log('Installed-apps checks passed.');
