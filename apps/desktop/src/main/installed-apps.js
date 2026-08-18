// v2.1 follow-up: lets the owner browse a list of installed apps (resolved from Windows Start
// Menu shortcuts) instead of hand-navigating Program Files in the native file picker. This is
// purely a *discovery* convenience -- it changes how a path gets INTO the picker, not the trust
// boundary itself. Approving an app still goes through the exact same appEntry()/previewApp()
// validation and the exact same preview-then-confirm flow as the native-picker path in
// computer-control.js; a resolved shortcut target is never auto-approved.
//
// Deliberately takes `readShortcutLink` as a parameter rather than `require('electron')` at the
// top of the file: the `electron` npm package only exposes its real API inside a running
// Electron process. Requiring it from a plain `node scripts/check-*.js` process (how every other
// check script in this repo runs) resolves to a path string instead, which would break both this
// module's own tests and the main check suite. main.js (which does run inside Electron) passes
// `require('electron').shell.readShortcutLink` at call time; check-installed-apps.js passes a
// fake resolver instead, so the shortcut-resolution logic is still fully covered without needing
// a live Electron process.
const fs = require('node:fs');
const path = require('node:path');
// Reuses computer-control.js's own browser-launcher list rather than keeping a second one --
// this file requires only node:fs/node:path itself (no `electron`), so requiring it here is
// exactly as safe under a plain `node scripts/check-*.js` process as it already is everywhere
// else in this repo (check-computer-control.js, check-backup.js, etc. all require it directly).
const { isBrowserLauncher } = require('./computer-control');

const MAX_DEPTH = 6;

function walkShortcuts(dir, depth, out) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // Missing/inaccessible directory -- skip it, don't fail the whole listing.
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkShortcuts(full, depth + 1, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.lnk')) {
      out.push(full);
    }
  }
}

// The two standard Windows Start Menu shortcut locations -- all-users and the current user's
// own. Between them this covers every app that shows up in the normal Windows Start Menu.
function defaultStartMenuDirs(env = process.env) {
  const dirs = [];
  if (env.ProgramData) dirs.push(path.join(env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
  if (env.APPDATA) dirs.push(path.join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
  return dirs;
}

// Resolves every .lnk shortcut under the given directories (default: the two standard Start
// Menu locations) down to a deduped, sorted list of real, existing .exe targets. Browser and
// browser-web-app launchers (chrome.exe, msedge.exe, etc.) are excluded -- computer-control.js's
// appEntry() always rejects those anyway (use Activity -> Open a website instead), so surfacing
// them here would only produce a dead-end "Approve" button. This is a pure discovery
// convenience -- callers must still run a resolved entry through the exact same
// appEntry()/previewApp() validation as any native-picker-selected path before it can be
// approved. Nothing here approves or launches anything.
function listInstalledApps(readShortcutLink, dirs) {
  if (typeof readShortcutLink !== 'function') {
    throw new Error('listInstalledApps requires a readShortcutLink function.');
  }
  const searchDirs = Array.isArray(dirs) && dirs.length ? dirs : defaultStartMenuDirs();
  const shortcuts = [];
  for (const dir of searchDirs) {
    walkShortcuts(dir, 0, shortcuts);
  }

  // Dedupe by resolved target -- several shortcuts (Start Menu root, publisher subfolder, etc.)
  // often point at the same .exe. First shortcut encountered for a given target wins the name.
  const byTarget = new Map();
  for (const shortcutPath of shortcuts) {
    let resolved;
    try {
      resolved = readShortcutLink(shortcutPath);
    } catch {
      continue; // Broken/unreadable shortcut -- skip it, don't fail the whole listing.
    }
    const target = resolved && resolved.target;
    if (!target || path.extname(target).toLowerCase() !== '.exe') continue; // non-.exe target (e.g. a folder)
    if (isBrowserLauncher(target)) continue; // browsers/browser-launchers -- approve via Open a website instead
    if (byTarget.has(target)) continue; // already have an entry for this real app
    let details;
    try {
      details = fs.statSync(target);
    } catch {
      continue; // Target no longer exists on disk -- don't surface a dead-end "Approve" button.
    }
    if (!details.isFile()) continue;
    byTarget.set(target, { name: path.basename(shortcutPath, '.lnk'), target });
  }

  return Array.from(byTarget.values()).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { listInstalledApps, defaultStartMenuDirs };
