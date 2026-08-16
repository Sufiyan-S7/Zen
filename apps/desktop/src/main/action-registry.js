// Block D, Step 16 built the initial subset -- open-app, open-website, list-folder, read-file
// (documentId-only) -- plus the internal noop.wait test action used by the contract's own
// Section 9 fixtures. Block E, Steps 22-24 upgraded read-file to also accept an arbitrary
// permitted filePath and added search-folder, move-file, copy-file, rename-file, delete-file.
// Every real action here reuses existing v1.0.0 execution primitives (computer-control.js /
// documents.js) rather than inventing a second path, and every folder/file action re-resolves
// its permission grant (permissions.js's resolveActiveFolderGrant) immediately before running,
// never against a cached grant from earlier in the task, per AgentContract.md Section 3.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { shell } = require('electron');
const { approvedApp, websitePreview, listFolderContents, searchFolderNames } = require('./computer-control');
const { readDocumentText, readArbitraryFile } = require('./documents');
const { resolveActiveFolderGrant } = require('./permissions');

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

// Block E, Step 24 helper: shape-only check for a "sourcePath"/"filePath"-shaped field --
// non-empty string, nothing more. Deliberately does NOT touch the filesystem: validateInput runs
// during proposeTask (planning time, before any popup is shown), and every other action in this
// registry keeps real filesystem/permission checks inside execute() so a bad path fails that ONE
// step visibly in the popup (with a reason) after Start, rather than silently killing the whole
// plan before the person ever sees it. move/copy/rename/delete originally ran this check here in
// validateInput too -- fixed after live testing showed it produced exactly that silent failure
// (a stale or mistyped filename made the entire task vanish into a generic "couldn't plan that"
// with zero detail, instead of one clearly-failed step). See resolveExistingFile below for the
// real check, now at execute() time.
function requireNonEmptyPath(input, key) {
  if (!isPlainObject(input) || typeof input[key] !== 'string' || !input[key].trim()) {
    throw new Error(`${key} is required.`);
  }
  return input[key].trim();
}

// The actual filesystem check validateExistingFile used to do at plan time -- now called from
// each action's execute(), so a missing/invalid file fails just that step, with a clear reason,
// after the popup is already showing the plan.
function resolveExistingFile(candidatePath) {
  const resolved = path.resolve(candidatePath);
  let link;
  try {
    link = fs.lstatSync(resolved);
  } catch {
    throw new Error(`${path.basename(resolved)} does not exist.`);
  }
  if (link.isSymbolicLink() || link.isDirectory() || !link.isFile()) throw new Error(`Choose a regular file: ${path.basename(resolved)}.`);
  return fs.realpathSync(resolved);
}

// Block E, Step 24: cross-drive-safe move. fs.renameSync throws EXDEV when source and
// destination are on different volumes -- fall back to copy-then-delete-original in that case,
// exactly the fallback Windows Explorer itself performs for a cross-drive move.
function moveFileSync(sourcePath, destinationPath) {
  try {
    fs.renameSync(sourcePath, destinationPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(sourcePath);
  }
}

const ACTIONS = Object.freeze({
  'noop.wait': Object.freeze({
    id: 'noop.wait',
    riskTier: 'routine',
    label: 'Wait (internal test action)',
    validateInput(input) {
      if (!isPlainObject(input) || !Number.isInteger(input.seconds) || input.seconds < 0 || input.seconds > 30) {
        throw new Error('noop.wait requires an integer "seconds" between 0 and 30.');
      }
      return { seconds: input.seconds };
    },
    async execute(input) {
      await new Promise((resolve) => setTimeout(resolve, input.seconds * 1000));
      return { summary: `Waited ${input.seconds}s.` };
    }
  }),
  'open-app': Object.freeze({
    id: 'open-app',
    riskTier: 'routine',
    label: 'Open an approved app',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.appId !== 'string' || !input.appId.trim()) {
        throw new Error('open-app requires an appId from the approved-app list.');
      }
      return { appId: input.appId.trim() };
    },
    async execute(input) {
      const entry = approvedApp(input.appId);
      const child = spawn(entry.executable, entry.arguments || [], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      return { summary: `Opened ${entry.label}.` };
    }
  }),
  'open-website': Object.freeze({
    id: 'open-website',
    riskTier: 'routine',
    label: 'Open a website',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.url !== 'string') throw new Error('open-website requires a url.');
      return { url: websitePreview(input.url).url };
    },
    async execute(input) {
      await shell.openExternal(input.url);
      return { summary: `Opened ${input.url}.` };
    }
  }),
  'list-folder': Object.freeze({
    id: 'list-folder',
    riskTier: 'routine',
    label: 'List a folder',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.folderPath !== 'string' || !input.folderPath.trim()) {
        throw new Error('list-folder requires a folderPath.');
      }
      return { folderPath: input.folderPath.trim() };
    },
    async execute(input) {
      const result = listFolderContents(input.folderPath);
      return { summary: `Listed ${result.count} item(s) in ${result.folderPath}.`, items: result.items, capped: result.capped };
    }
  }),
  'read-file': Object.freeze({
    id: 'read-file',
    riskTier: 'routine',
    label: 'Read a file',
    // Block E, Step 23: accepts EITHER the original Block D documentId (Zen's imported-document
    // library, unchanged) OR a filePath, which must resolve inside a live folder-permission
    // grant. Two input shapes on one action, not two actions, matching
    // docs/ActionRegistrySkeleton.md row 3's "Block D Step 16 (subset) / Block E Step 23 (full)"
    // -- both rows point at the same action ID in docs/AgentContract.md Section 7.
    validateInput(input) {
      if (!isPlainObject(input)) throw new Error('read-file requires a documentId or a filePath.');
      if (typeof input.documentId === 'string' && input.documentId.trim()) return { documentId: input.documentId.trim() };
      if (typeof input.filePath === 'string' && input.filePath.trim()) return { filePath: input.filePath.trim() };
      throw new Error('read-file requires a documentId or a filePath.');
    },
    describe(input) {
      return input.documentId ? 'Read an imported document.' : `Read ${input.filePath}`;
    },
    async execute(input) {
      if (input.documentId) {
        const doc = readDocumentText(input.documentId);
        return { summary: `Read ${doc.displayName}${doc.truncated ? ' (truncated)' : ''}.`, text: doc.text, truncated: doc.truncated };
      }
      resolveActiveFolderGrant(path.dirname(path.resolve(input.filePath)));
      const file = await readArbitraryFile(input.filePath);
      return { summary: `Read ${file.displayName}${file.truncated ? ' (truncated)' : ''}.`, text: file.text, truncated: file.truncated };
    }
  }),
  'search-folder': Object.freeze({
    id: 'search-folder',
    riskTier: 'routine',
    label: 'Search a folder',
    validateInput(input) {
      if (!isPlainObject(input) || typeof input.folderPath !== 'string' || !input.folderPath.trim()) {
        throw new Error('search-folder requires a folderPath.');
      }
      if (typeof input.query !== 'string' || !input.query.trim()) throw new Error('search-folder requires a query.');
      return { folderPath: input.folderPath.trim(), query: input.query.trim() };
    },
    describe(input) { return `Search "${input.folderPath}" for "${input.query}".`; },
    async execute(input) {
      resolveActiveFolderGrant(input.folderPath);
      const result = searchFolderNames(input.folderPath, input.query);
      return { summary: `Found ${result.count} match(es) for "${result.query}" in ${result.folderPath}.`, matches: result.matches, capped: result.capped };
    }
  }),
  'move-file': Object.freeze({
    id: 'move-file',
    riskTier: 'routine',
    label: 'Move a file',
    validateInput(input) {
      return { sourcePath: requireNonEmptyPath(input, 'sourcePath'), destinationFolderPath: requireNonEmptyPath(input, 'destinationFolderPath') };
    },
    describe(input) { return `Move ${path.basename(input.sourcePath)} to ${input.destinationFolderPath}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      resolveActiveFolderGrant(input.destinationFolderPath);
      const destination = path.join(path.resolve(input.destinationFolderPath), path.basename(sourcePath));
      if (fs.existsSync(destination)) throw new Error(`${path.basename(destination)} already exists at the destination.`);
      moveFileSync(sourcePath, destination);
      return { summary: `Moved ${path.basename(sourcePath)} to ${input.destinationFolderPath}.`, destination };
    }
  }),
  'copy-file': Object.freeze({
    id: 'copy-file',
    riskTier: 'routine',
    label: 'Copy a file',
    validateInput(input) {
      return { sourcePath: requireNonEmptyPath(input, 'sourcePath'), destinationFolderPath: requireNonEmptyPath(input, 'destinationFolderPath') };
    },
    describe(input) { return `Copy ${path.basename(input.sourcePath)} to ${input.destinationFolderPath}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      resolveActiveFolderGrant(input.destinationFolderPath);
      const destination = path.join(path.resolve(input.destinationFolderPath), path.basename(sourcePath));
      if (fs.existsSync(destination)) throw new Error(`${path.basename(destination)} already exists at the destination.`);
      fs.copyFileSync(sourcePath, destination, fs.constants.COPYFILE_EXCL);
      return { summary: `Copied ${path.basename(sourcePath)} to ${input.destinationFolderPath}.`, destination };
    }
  }),
  'rename-file': Object.freeze({
    id: 'rename-file',
    riskTier: 'routine',
    label: 'Rename a file',
    validateInput(input) {
      const sourcePath = requireNonEmptyPath(input, 'sourcePath');
      if (!isPlainObject(input) || typeof input.newName !== 'string' || !input.newName.trim() || /[\\/:*?"<>|\u0000-\u001f]/.test(input.newName)) {
        throw new Error('rename-file requires a valid newName (no path separators).');
      }
      return { sourcePath, newName: input.newName.trim() };
    },
    describe(input) { return `Rename ${path.basename(input.sourcePath)} to ${input.newName}.`; },
    async execute(input) {
      const sourcePath = resolveExistingFile(input.sourcePath);
      resolveActiveFolderGrant(path.dirname(sourcePath));
      const destination = path.join(path.dirname(sourcePath), input.newName);
      if (fs.existsSync(destination)) throw new Error(`${input.newName} already exists in that folder.`);
      fs.renameSync(sourcePath, destination);
      return { summary: `Renamed ${path.basename(sourcePath)} to ${input.newName}.`, destination };
    }
  }),
  'delete-file': Object.freeze({
    id: 'delete-file',
    riskTier: 'sensitive',
    label: 'Delete a file',
    validateInput(input) { return { filePath: requireNonEmptyPath(input, 'filePath') }; },
    describe(input) { return `Delete ${input.filePath} (moved to Recycle Bin, not permanently deleted).`; },
    async execute(input) {
      const filePath = resolveExistingFile(input.filePath);
      resolveActiveFolderGrant(path.dirname(filePath));
      // Recycle-Bin-routed per AgentContract.md Section 7 -- shell.trashItem is Electron's own
      // cross-platform trash API (Windows Recycle Bin here), not a hand-rolled delete. This is
      // also the file's "Undo where supported": the Recycle Bin itself is the undo mechanism,
      // so no separate undo-stack is built for this action.
      await shell.trashItem(filePath);
      return { summary: `Moved ${filePath} to the Recycle Bin.` };
    }
  })
});

function getAction(actionId) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, actionId) ? ACTIONS[actionId] : null;
}

// Excludes noop.wait -- that action exists only for AgentContract.md Section 9's own fixtures,
// never something the planner should place into a real plan.
function listActionsForPlanner() {
  return Object.values(ACTIONS).filter((action) => action.id !== 'noop.wait').map(({ id, label }) => ({ id, label }));
}

module.exports = { ACTIONS, getAction, listActionsForPlanner };
